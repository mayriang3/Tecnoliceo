(function () {
  const $ = (id) => document.getElementById(id);
  const pagina = document.body.dataset.pagina;
  const DESTINO = { estudiante: "/perfil.html", profesor: "/profesores.html", admin: "/admin.html" };

  async function api(url, metodo, cuerpo) {
    const r = await fetch(url, {
      method: metodo || "GET",
      headers: { "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    let datos = {};
    try { datos = await r.json(); } catch (e) {}
    return { ok: r.ok, datos: datos };
  }

  async function yo() {
    try { return (await api("/api/auth/yo")).datos; } catch (e) { return { autenticado: false }; }
  }

  function mostrarError(t) { const e = $("cu-error"); if (e) e.textContent = t || ""; }

  async function enviar(btn, textoBtn, accion) {
    mostrarError("");
    btn.disabled = true;
    btn.textContent = "Un momento...";
    try { await accion(); }
    catch (e) { mostrarError("No pudimos conectar con el servidor. Intenta de nuevo."); }
    finally { btn.disabled = false; btn.textContent = textoBtn; }
  }

  // ---------- Entrar ----------
  if (pagina === "login") {
    yo().then((u) => { if (u.autenticado) location.href = DESTINO[u.rol] || "/"; });
    const hacer = () => enviar($("cu-enviar"), "Entrar", async () => {
      const r = await api("/api/auth/login", "POST", { usuario: $("cu-usuario").value, clave: $("cu-clave").value });
      if (r.ok) location.href = DESTINO[r.datos.rol] || "/";
      else mostrarError(r.datos.error || "No pudimos iniciar sesión.");
    });
    $("cu-enviar").addEventListener("click", hacer);
    $("cu-clave").addEventListener("keydown", (e) => { if (e.key === "Enter") hacer(); });
  }

  // ---------- Crear cuenta ----------
  if (pagina === "registro") {
    const hacer = () => {
      if ($("cu-clave").value !== $("cu-clave2").value) { mostrarError("Las dos claves no coinciden."); return; }
      enviar($("cu-enviar"), "Crear mi cuenta", async () => {
        const r = await api("/api/auth/registro", "POST", {
          nombre: $("cu-nombre").value,
          usuario: $("cu-usuario").value,
          clave: $("cu-clave").value,
          codigo: $("cu-codigo").value,
        });
        if (r.ok) location.href = DESTINO[r.datos.rol] || "/";
        else mostrarError(r.datos.error || "No pudimos crear la cuenta.");
      });
    };
    $("cu-enviar").addEventListener("click", hacer);
    $("cu-codigo").addEventListener("keydown", (e) => { if (e.key === "Enter") hacer(); });
  }

  // ---------- Paneles (estudiante / profesor) ----------
  if (pagina === "perfil" || pagina === "profesores") {
    const rolEsperado = pagina === "perfil" ? "estudiante" : "profesor";
    yo().then((u) => {
      if (!u.autenticado) { location.href = "/login.html"; return; }
      if (u.rol !== rolEsperado) { location.href = DESTINO[u.rol] || "/login.html"; return; }
      $("cu-saludo").textContent = "Hola, " + u.nombre.split(" ")[0] + " 👋";
      $("cu-sub").textContent = u.grado ? "Grado " + u.grado : "Profesor";
      $("cu-contenido").hidden = false;
    });
    $("cu-salir").addEventListener("click", async () => {
      try { await api("/api/auth/logout", "POST"); } catch (e) {}
      location.href = "/login.html";
    });
  }
})();