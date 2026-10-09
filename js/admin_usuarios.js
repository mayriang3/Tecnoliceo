// Sección del admin: códigos de registro por grado, profesores y usuarios.
// Se agrega sola al panel (solo hay que cargar este archivo en admin.html).
(function () {
  const panel = document.getElementById("panel");
  if (!panel) return;

  const st = document.createElement("style");
  st.textContent =
    ".au-codigo{display:inline-block;margin-right:8px;padding:2px 12px;border-radius:8px;background:#eef3e6;color:#12291c;font:700 1rem monospace;letter-spacing:.12em}" +
    ".au-mat{margin-bottom:10px}.au-mat label{display:inline-flex;align-items:center;gap:6px;margin:0 16px 8px 0;text-transform:none;letter-spacing:0;font-weight:500;font-size:.9rem;color:inherit}" +
    ".au-mat input{width:auto;margin:0}";
  document.head.append(st);

  const cont = document.createElement("div");
  (panel.querySelector(".cuerpo") || panel).append(cont);

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

  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function chip(txt) { const s = el("small", "", txt); s.style.marginRight = "6px"; return s; }
  function boton(txt, clase, alClic) { const b = el("button", clase, txt); b.type = "button"; b.onclick = alClic; return b; }
  function campo(tipo, etiqueta, id) {
    const l = el("label", "", etiqueta);
    l.htmlFor = id;
    const i = el("input");
    i.id = id; i.type = tipo; i.autocomplete = "off";
    return [l, i];
  }

  // ---------- Armado de la sección ----------
  const tGrados = el("h2", "titulo-lista", "Códigos de registro por grado");
  const ayuda = el("p", "ayuda", "Entrégale a cada grado su código. Con él, los estudiantes crean su cuenta en registro.html.");
  const zGrados = el("div");
  const tProf = el("h2", "titulo-lista", "Crear profesor");
  const form = el("div");
  const [l1, nombre] = campo("text", "Nombre completo", "au-nombre");
  const [l2, usuario] = campo("text", "Usuario", "au-usuario");
  const [l3, clave] = campo("text", "Clave inicial (mínimo 8 caracteres)", "au-clave");
  usuario.autocapitalize = "none";
  const lm = el("label", "", "Materias que dicta");
  const zMat = el("div", "au-mat");
  const crear = boton("Crear profesor", "", crearProfesor);
  form.append(l1, nombre, l2, usuario, l3, clave, lm, zMat, crear);
  const tUsu = el("h2", "titulo-lista", "Usuarios");
  const zUsu = el("div");
  cont.append(tGrados, ayuda, zGrados, tProf, form, tUsu, zUsu);

  // ---------- Grados ----------
  async function cargarGrados() {
    const r = await api("/api/admin/grados");
    zGrados.innerHTML = "";
    if (!r.ok || !Array.isArray(r.datos)) { zGrados.append(el("p", "ayuda", "No se pudieron cargar los grados.")); return; }
    r.datos.forEach((g) => {
      const abierto = Number(g.registro_activo) === 1;
      const fila = el("div", "item");
      const info = el("div");
      info.append(el("strong", "", "Grado " + g.nombre));
      const cod = el("span", "au-codigo", g.codigo || "—");
      info.append(cod, chip(g.estudiantes + " estudiantes"), chip(abierto ? "Registro abierto" : "Registro cerrado"));
      const acc = el("div", "acciones");
      acc.append(
        boton("Copiar", "sec", async () => {
          try { await navigator.clipboard.writeText(g.codigo); } catch (e) { prompt("Copia el código:", g.codigo); return; }
          alert("Código copiado: " + g.codigo);
        }),
        boton("Nuevo código", "sec", async () => {
          if (confirm("¿Generar un código nuevo para el grado " + g.nombre + "? El anterior dejará de servir.")) {
            await api("/api/admin/grados/" + g.id, "PUT", { regenerar: true });
            cargarGrados();
          }
        }),
        boton(abierto ? "Cerrar registro" : "Abrir registro", abierto ? "rojo" : "sec", async () => {
          await api("/api/admin/grados/" + g.id, "PUT", { registro_activo: !abierto });
          cargarGrados();
        })
      );
      fila.append(info, acc);
      zGrados.append(fila);
    });
  }

  // ---------- Materias y profesores ----------
  let listaMaterias = [];
  async function cargarMaterias() {
    const r = await api("/api/admin/materias");
    zMat.innerHTML = "";
    if (!r.ok || !Array.isArray(r.datos)) return;
    listaMaterias = r.datos;
    r.datos.forEach((m) => {
      const l = el("label");
      const c = el("input");
      c.type = "checkbox"; c.value = m.id;
      l.append(c, document.createTextNode(m.nombre));
      zMat.append(l);
    });
  }

  async function crearProfesor() {
    const materias = Array.prototype.map.call(zMat.querySelectorAll("input:checked"), (c) => Number(c.value));
    const r = await api("/api/admin/usuarios", "POST", {
      nombre: nombre.value, usuario: usuario.value, clave: clave.value, materias: materias,
    });
    if (!r.ok) { alert(r.datos.error || "No se pudo crear el profesor."); return; }
    alert("Profesor creado. Entrégale su usuario y su clave inicial.");
    nombre.value = usuario.value = clave.value = "";
    zMat.querySelectorAll("input").forEach((c) => (c.checked = false));
    cargarUsuarios();
  }

  // ---------- Materias de un profesor ----------
  function editarMaterias(u, info) {
    const previo = info.querySelector(".au-editor");
    if (previo) { previo.remove(); return; }       // segundo clic: se cierra
    const marcadas = String(u.materias_ids || "").split(",").filter(Boolean);
    const caja = el("div", "au-mat au-editor");
    caja.style.marginTop = "10px";
    listaMaterias.forEach((m) => {
      const l = el("label");
      const c = el("input");
      c.type = "checkbox"; c.value = m.id; c.checked = marcadas.indexOf(String(m.id)) !== -1;
      l.append(c, document.createTextNode(m.nombre));
      caja.append(l);
    });
    const guardar = boton("Guardar materias", "", async () => {
      const ids = Array.prototype.map.call(caja.querySelectorAll("input:checked"), (c) => Number(c.value));
      const r = await api("/api/admin/usuarios/" + u.id, "PUT", { materias: ids });
      if (!r.ok) { alert(r.datos.error || "No se pudieron guardar las materias."); return; }
      cargarUsuarios();
    });
    caja.append(el("br"), guardar);
    info.append(caja);
  }

  // ---------- Usuarios ----------
  async function cargarUsuarios() {
    const r = await api("/api/admin/usuarios");
    zUsu.innerHTML = "";
    if (!r.ok || !Array.isArray(r.datos)) { zUsu.append(el("p", "ayuda", "No se pudieron cargar los usuarios.")); return; }
    if (!r.datos.length) { zUsu.append(el("p", "ayuda", "Todavía no hay usuarios.")); return; }
    r.datos.forEach((u) => {
      const fila = el("div", "item");
      const info = el("div");
      info.append(el("strong", "", u.nombre), chip(u.rol), chip("@" + u.usuario));
      if (u.grado) info.append(chip("Grado " + u.grado));
      if (u.materias) info.append(chip(u.materias));
      const acc = el("div", "acciones");
      if (u.rol === "profesor") {
        acc.append(boton("Materias", "sec", () => editarMaterias(u, info)));
      }
      acc.append(
        boton("Nueva clave", "sec", async () => {
          const nueva = prompt("Nueva clave para " + u.nombre + " (mínimo 8 caracteres):");
          if (nueva === null) return;
          const x = await api("/api/admin/usuarios/" + u.id, "PUT", { clave: nueva });
          alert(x.ok ? "Clave cambiada." : (x.datos.error || "No se pudo cambiar la clave."));
        }),
        boton("Borrar", "rojo", async () => {
          if (!confirm("¿Borrar la cuenta de " + u.nombre + "? No se puede deshacer.")) return;
          const x = await api("/api/admin/usuarios/" + u.id, "DELETE");
          if (!x.ok) alert(x.datos.error || "No se pudo borrar.");
          cargarUsuarios();
          cargarGrados();
        })
      );
      fila.append(info, acc);
      zUsu.append(fila);
    });
  }

  function cargarTodo() { cargarGrados(); cargarMaterias(); cargarUsuarios(); }

  // Se carga cuando el panel se hace visible (después de entrar)
  new MutationObserver(function () { if (!panel.hidden) cargarTodo(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  if (!panel.hidden) cargarTodo();
})();