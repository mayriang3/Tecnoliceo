// Estudiantes por grado: primero se ven los grados; al tocar uno se abre su lista.
// En cada lista: buscar, agregar, editar, cambiar de grado, nueva clave y borrar.
//  - Profesores: <div id="gestion-estudiantes"></div> en profesores.html
//  - Admin: solo cargar este archivo; se agrega sola al panel.
(function () {
  const st = document.createElement("style");
  st.textContent = `
.ge, .ge-fondo { font-family: 'DM Sans', system-ui, sans-serif; color: #1f2a22; }
.ge *, .ge-fondo * { box-sizing: border-box; }
.ge [hidden] { display: none !important; }
.ge-campo { min-width: 150px; margin: 0; }
.ge-crece { flex: 1; min-width: 180px; }
.ge label, .ge-fondo label { display: block; margin: 0 0 5px; font-size: .74rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #2f6b3f; }
.ge input, .ge-fondo select, .ge-fondo input { width: 100%; height: 44px; padding: 0 14px; margin: 0; border: 1.5px solid #d4dfca; border-radius: 14px; background: #fff; font: inherit; color: inherit; outline: none; }
.ge input:focus, .ge-fondo select:focus, .ge-fondo input:focus { border-color: #2f6b3f; box-shadow: 0 0 0 3px rgba(47,107,63,.15); }
.ge-btn { height: 44px; padding: 0 20px; border: 0; border-radius: 999px; background: #122b1d; color: #fff; font: inherit; font-weight: 500; cursor: pointer; transition: background .15s; }
.ge-btn:hover { background: #2f6b3f; }
.ge-btn:disabled { opacity: .6; cursor: wait; }
.ge-sec { background: #eef3e6; color: #122b1d; border: 1.5px solid #d4dfca; }
.ge-sec:hover { background: #dfe9d6; }
.ge-rojo { background: #fff; color: #b3372f; border: 1.5px solid #e6bdb9; }
.ge-rojo:hover { background: #b3372f; color: #fff; }
.ge-aviso { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #eef3e6; color: #12291c; font-size: .9rem; }
.ge-aviso.ge-mal { background: #fbeceb; color: #b3372f; }
.ge-grados { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
.ge-grado { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 18px 18px 16px; border: 1.5px solid #d6e2d1; border-radius: 18px; background: #f6f9f3; font: inherit; color: inherit; text-align: left; cursor: pointer; transition: transform .15s, box-shadow .15s, border-color .15s, background .15s; }
.ge-grado:hover { transform: translateY(-3px); background: #fff; border-color: #2f6b3f; box-shadow: 0 10px 22px rgba(18,43,29,.12); }
.ge-grado:focus-visible, .ge-btn:focus-visible { outline: 3px solid rgba(47,107,63,.35); outline-offset: 2px; }
.ge-grado-n { font: 700 2rem 'Fraunces', Georgia, serif; color: #122b1d; line-height: 1; }
.ge-grado-c { font-size: .92rem; color: #3d5446; }
.ge-cabgrado { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.ge-titulo { margin: 0; font: 700 1.3rem 'Fraunces', Georgia, serif; color: #122b1d; }
.ge-barra { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
.ge-info { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 14px; font-size: .9rem; color: #3d5446; }
.ge-info .ge-btn { height: 32px; padding: 0 14px; font-size: .85rem; }
.ge-codigo { display: inline-block; padding: 2px 12px; border-radius: 8px; background: #eef3e6; color: #122b1d; font: 700 1rem monospace; letter-spacing: .12em; }
.ge-chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef3e6; color: #2f6b3f; font-size: .75rem; font-weight: 700; }
.ge-lista { display: flex; flex-direction: column; gap: 10px; }
.ge-fila { display: flex; gap: 14px; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 16px; }
.ge-fila strong { display: block; margin-bottom: 5px; line-height: 1.3; }
.ge-acc { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.ge-acc .ge-btn { height: 36px; padding: 0 14px; font-size: .88rem; }
.ge-vacio { padding: 18px; text-align: center; color: #6b7a70; }
.ge-fondo { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(18,43,29,.55); }
.ge-fondo[hidden] { display: none; }
.ge-ventana { width: min(460px, 100%); max-height: 92vh; overflow-y: auto; background: #fdfdfb; border-radius: 22px; box-shadow: 0 24px 60px rgba(18,41,28,.35); }
.ge-cab { padding: 16px 22px; background: #122b1d; color: #fff; font: 700 1.1rem 'Fraunces', Georgia, serif; }
.ge-cuerpo { padding: 20px 22px 22px; }
.ge-cuerpo .ge-campo { margin-bottom: 14px; }
.ge-error { min-height: 1.2em; margin: 0 0 10px; font-size: .88rem; color: #b3372f; }
.ge-botones { display: flex; justify-content: flex-end; gap: 10px; }
@media (max-width: 560px) { .ge-fila { flex-direction: column; align-items: stretch; } .ge-acc { justify-content: flex-start; } }
`;
  document.head.append(st);

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

  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function boton(txt, clase, alClic) { const b = el("button", "ge-btn " + (clase || ""), txt); b.type = "button"; b.onclick = alClic; return b; }
  function campo(etiqueta, control, clase) {
    const d = el("div", "ge-campo " + (clase || ""));
    const l = el("label", "", etiqueta);
    l.append(control);
    d.append(l);
    return d;
  }

  function montar(raiz) {
    let grados = [], gradoId = "", estudiantes = [], editando = null, temporizador = null, vista = "grados";

    // ---------- Pantalla ----------
    const ge = el("div", "ge");
    const aviso = el("div", "ge-aviso");
    aviso.hidden = true;

    // Vista 1: los grados
    const vGrados = el("div", "ge-grados");

    // Vista 2: la lista de un grado
    const vLista = el("div");
    vLista.hidden = true;
    const tituloGrado = el("h4", "ge-titulo");
    const cabGrado = el("div", "ge-cabgrado");
    cabGrado.append(boton("← Todos los grados", "ge-sec", mostrarGrados), tituloGrado);
    const buscar = el("input");
    buscar.placeholder = "Nombre o usuario";
    buscar.autocomplete = "off";
    const barra = el("div", "ge-barra");
    barra.append(campo("Buscar", buscar, "ge-crece"), boton("+ Agregar estudiante", "", () => abrir(null)));
    const info = el("div", "ge-info");
    const lista = el("div", "ge-lista");
    vLista.append(cabGrado, barra, info, lista);

    ge.append(aviso, vGrados, vLista);
    raiz.append(ge);

    // ---------- Ventanita de agregar / editar ----------
    const fondo = el("div", "ge-fondo");
    fondo.hidden = true;
    const vent = el("div", "ge-ventana");
    vent.setAttribute("role", "dialog");
    vent.setAttribute("aria-modal", "true");
    const cab = el("div", "ge-cab");
    const cuerpo = el("div", "ge-cuerpo");
    const fNombre = el("input"), fUsuario = el("input"), fClave = el("input"), fGrado = el("select");
    fClave.type = "text";
    [fNombre, fUsuario, fClave].forEach((i) => (i.autocomplete = "off"));
    fUsuario.autocapitalize = "none";
    const cClave = campo("Clave inicial (mínimo 8 caracteres)", fClave);
    const errorModal = el("p", "ge-error");
    errorModal.setAttribute("role", "alert");
    const guardar = boton("Guardar", "", guardarCambios);
    const bots = el("div", "ge-botones");
    bots.append(boton("Cancelar", "ge-sec", cerrar), guardar);
    cuerpo.append(campo("Nombre completo", fNombre), campo("Usuario", fUsuario), campo("Grado", fGrado), cClave, errorModal, bots);
    vent.append(cab, cuerpo);
    fondo.append(vent);
    document.body.append(fondo);
    fondo.addEventListener("mousedown", (e) => { if (e.target === fondo) cerrar(); });
    document.addEventListener("keydown", (e) => { if (!fondo.hidden && e.key === "Escape") cerrar(); });

    function abrir(est) {
      editando = est;
      cab.textContent = est ? "Editar estudiante" : "Agregar estudiante";
      fNombre.value = est ? est.nombre : "";
      fUsuario.value = est ? est.usuario : "";
      fClave.value = "";
      cClave.hidden = !!est;
      fGrado.innerHTML = "";
      grados.forEach((g) => { const o = el("option", "", "Grado " + g.nombre); o.value = g.id; fGrado.append(o); });
      fGrado.value = est ? est.grado_id : gradoId;
      errorModal.textContent = "";
      fondo.hidden = false;
      fNombre.focus();
    }
    function cerrar() { fondo.hidden = true; editando = null; }

    async function guardarCambios() {
      errorModal.textContent = "";
      const envio = { nombre: fNombre.value, usuario: fUsuario.value, grado_id: Number(fGrado.value) };
      if (!editando) envio.clave = fClave.value;
      guardar.disabled = true;
      try {
        const r = editando
          ? await api("/api/gestion/estudiantes/" + editando.id, "PUT", envio)
          : await api("/api/gestion/estudiantes", "POST", envio);
        if (!r.ok) { errorModal.textContent = r.datos.error || "No se pudo guardar."; return; }
        const movido = editando && String(editando.grado_id) !== String(envio.grado_id);
        const eraNuevo = !editando;
        cerrar();
        mostrarAviso(eraNuevo ? "Estudiante agregado." : movido ? "Estudiante movido de grado." : "Cambios guardados.");
        recargar();
      } catch (e) {
        errorModal.textContent = "No pudimos conectar con el servidor.";
      } finally {
        guardar.disabled = false;
      }
    }

    function mostrarAviso(texto, mal) {
      aviso.textContent = texto;
      aviso.className = "ge-aviso" + (mal ? " ge-mal" : "");
      aviso.hidden = false;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { aviso.hidden = true; }, 4000);
    }

    // ---------- Vista de grados ----------
    function pintarGrados() {
      vGrados.innerHTML = "";
      grados.forEach((g) => {
        const n = Number(g.estudiantes);
        const c = el("button", "ge-grado");
        c.type = "button";
        c.append(
          el("span", "ge-grado-n", g.nombre),
          el("span", "ge-grado-c", n === 1 ? "1 estudiante" : n + " estudiantes"),
          el("span", "ge-chip", Number(g.registro_activo) === 1 ? "Registro abierto" : "Registro cerrado")
        );
        c.onclick = () => abrirGrado(g.id);
        vGrados.append(c);
      });
    }

    function mostrarGrados() {
      vista = "grados";
      vLista.hidden = true;
      vGrados.hidden = false;
      cargarGrados();
    }

    function abrirGrado(id) {
      gradoId = String(id);
      vista = "lista";
      vGrados.hidden = true;
      vLista.hidden = false;
      buscar.value = "";
      pintarInfo();
      cargarEstudiantes();
    }

    // ---------- Vista de un grado ----------
    function pintarInfo() {
      const g = grados.find((x) => String(x.id) === String(gradoId));
      info.innerHTML = "";
      if (!g) return;
      tituloGrado.textContent = "Grado " + g.nombre;
      if (!g.codigo) { info.append(document.createTextNode("Este grado aún no tiene código de registro (lo genera el administrador).")); return; }
      info.append(document.createTextNode("Código de registro:"), el("span", "ge-codigo", g.codigo));
      info.append(boton("Copiar", "ge-sec", async () => {
        try { await navigator.clipboard.writeText(g.codigo); mostrarAviso("Código copiado."); }
        catch (e) { prompt("Copia el código:", g.codigo); }
      }));
      info.append(el("span", "ge-chip", Number(g.registro_activo) === 1 ? "Registro abierto" : "Registro cerrado"));
    }

    function pintarLista() {
      lista.innerHTML = "";
      const q = norm(buscar.value);
      const visibles = estudiantes.filter((e) => !q || norm(e.nombre).includes(q) || norm(e.usuario).includes(q));
      if (!visibles.length) {
        lista.append(el("div", "ge-vacio", estudiantes.length ? "No hay resultados para esa búsqueda." : "Este grado todavía no tiene estudiantes."));
        return;
      }
      visibles.forEach((e) => {
        const fila = el("div", "ge-fila");
        const izq = el("div");
        izq.append(el("strong", "", e.nombre), el("span", "ge-chip", "@" + e.usuario));
        const acc = el("div", "ge-acc");
        acc.append(
          boton("Editar", "ge-sec", () => abrir(e)),
          boton("Nueva clave", "ge-sec", async () => {
            const nueva = prompt("Nueva clave para " + e.nombre + " (mínimo 8 caracteres):");
            if (nueva === null) return;
            const r = await api("/api/gestion/estudiantes/" + e.id, "PUT", { clave: nueva });
            mostrarAviso(r.ok ? "Clave cambiada." : (r.datos.error || "No se pudo cambiar la clave."), !r.ok);
          }),
          boton("Borrar", "ge-rojo", async () => {
            if (!confirm("¿Borrar a " + e.nombre + "? Se elimina su cuenta y no se puede deshacer.")) return;
            const r = await api("/api/gestion/estudiantes/" + e.id, "DELETE");
            mostrarAviso(r.ok ? "Estudiante borrado." : (r.datos.error || "No se pudo borrar."), !r.ok);
            recargar();
          })
        );
        fila.append(izq, acc);
        lista.append(fila);
      });
    }

    // ---------- Datos ----------
    async function cargarGrados() {
      const r = await api("/api/gestion/grados");
      if (!r.ok || !Array.isArray(r.datos)) {
        grados = [];
        vGrados.innerHTML = "";
        vGrados.append(el("div", "ge-vacio", "No se pudieron cargar los grados" + (r.datos && r.datos.error ? " (" + r.datos.error + ")" : "") + "."));
        return false;
      }
      grados = r.datos;
      pintarGrados();
      if (vista === "lista") pintarInfo();
      return true;
    }

    async function cargarEstudiantes() {
      const r = await api("/api/gestion/estudiantes?grado=" + encodeURIComponent(gradoId));
      estudiantes = r.ok && Array.isArray(r.datos) ? r.datos : [];
      pintarLista();
    }

    async function recargar() {
      if (await cargarGrados() && vista === "lista") await cargarEstudiantes();
    }

    buscar.addEventListener("input", pintarLista);
    return { recargar: recargar };
  }

  // ---------- Dónde se muestra ----------
  const destino = document.getElementById("gestion-estudiantes");
  if (destino) {                       // panel de profesores
    montar(destino).recargar();
    return;
  }
  const panel = document.getElementById("panel");   // admin
  if (panel) {
    const cont = el("div");
    cont.append(el("h2", "titulo-lista", "Estudiantes por grado"));
    (panel.querySelector(".cuerpo") || panel).append(cont);
    const m = montar(cont);
    new MutationObserver(() => { if (!panel.hidden) m.recargar(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    if (!panel.hidden) m.recargar();
  }
})();