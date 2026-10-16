// Catálogo de módulos (páginas HTML existentes): registrar, editar, ocultar, borrar y ver el progreso.
//  - Profesores: <div id="gestion-modulos"></div> en profesores.html (solo ven sus materias)
//  - Admin: solo cargar este archivo; se agrega sola al panel (ve todas las materias).
(function () {
  const st = document.createElement("style");
  st.textContent = `
.gm, .gm-fondo { font-family: 'DM Sans', system-ui, sans-serif; color: #1f2a22; }
.gm *, .gm-fondo * { box-sizing: border-box; }
.gm-barra { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.gm-det { margin-bottom: 14px; padding: 10px 14px; border: 1.5px dashed #d4dfca; border-radius: 14px; }
.gm-det summary { cursor: pointer; font-size: .85rem; font-weight: 700; color: #2f6b3f; }
.gm-det .gm-campo { margin-top: 12px; }
.gm-btn { height: 38px; padding: 0 18px; border: 0; border-radius: 999px; background: #122b1d; color: #fff; font: inherit; font-weight: 500; cursor: pointer; transition: background .15s; }
.gm-btn:hover { background: #2f6b3f; }
.gm-btn:disabled { opacity: .5; cursor: not-allowed; }
.gm-sec { background: #eef3e6; color: #122b1d; border: 1.5px solid #d4dfca; }
.gm-sec:hover { background: #dfe9d6; }
.gm-rojo { background: #fff; color: #b3372f; border: 1.5px solid #e6bdb9; }
.gm-rojo:hover { background: #b3372f; color: #fff; }
.gm-aviso { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #eef3e6; color: #12291c; font-size: .9rem; }
.gm-aviso.gm-mal { background: #fbeceb; color: #b3372f; }
.gm-materia { margin: 18px 0 10px; font: 700 1.05rem 'Fraunces', Georgia, serif; color: #2f6b3f; }
.gm-materia:first-of-type { margin-top: 0; }
.gm-card { padding: 14px 16px; margin-bottom: 10px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 16px; }
.gm-card h4 { margin: 0 0 8px; font: 700 1rem 'DM Sans', sans-serif; color: #122b1d; }
.gm-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.gm-chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef3e6; color: #2f6b3f; font-size: .75rem; font-weight: 700; }
.gm-chip.gm-oculto { background: #eceeea; color: #5f6b64; }
.gm-links { margin: 0 0 10px; font-size: .85rem; color: #3d5446; word-break: break-all; }
.gm-links a { color: #2f6b3f; font-weight: 700; }
.gm-acc { display: flex; gap: 6px; flex-wrap: wrap; }
.gm-acc .gm-btn { height: 34px; padding: 0 14px; font-size: .88rem; }
.gm-vacio { padding: 18px; text-align: center; color: #6b7a70; }
.gm-fondo { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(18,43,29,.55); }
.gm-fondo[hidden] { display: none; }
.gm-ventana { width: min(520px, 100%); max-height: 92vh; overflow-y: auto; background: #fdfdfb; border-radius: 22px; box-shadow: 0 24px 60px rgba(18,41,28,.35); }
.gm-ventana.gm-ancha { width: min(700px, 100%); }
.gm-cab { padding: 16px 22px; background: #122b1d; color: #fff; font: 700 1.1rem 'Fraunces', Georgia, serif; }
.gm-cuerpo { padding: 20px 22px 22px; }
.gm-campo { margin-bottom: 14px; }
.gm-campo > label { display: block; margin: 0 0 5px; font-size: .74rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #2f6b3f; }
.gm-campo small { display: block; margin-top: 4px; font-size: .78rem; color: #6b7a70; }
.gm-fondo input[type=text], .gm-fondo input[type=number], .gm-fondo select { width: 100%; height: 44px; padding: 0 14px; margin: 0; border: 1.5px solid #d4dfca; border-radius: 14px; background: #fff; font: inherit; color: inherit; outline: none; }
.gm-fondo input:focus, .gm-fondo select:focus { border-color: #2f6b3f; box-shadow: 0 0 0 3px rgba(47,107,63,.15); }
.gm-check { display: flex; align-items: center; gap: 8px; font-size: .92rem; }
.gm-check input { width: auto; height: auto; margin: 0; }
.gm-error { min-height: 1.2em; margin: 0 0 10px; font-size: .88rem; color: #b3372f; }
.gm-botones { display: flex; justify-content: flex-end; gap: 10px; }
.gm-resumen { margin: 0 0 12px; font-size: .92rem; color: #3d5446; }
.gm-fila { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 12px; font-size: .9rem; }
.gm-fila .gm-n { flex: 1; min-width: 0; }
.gm-fila small { display: block; color: #6b7a70; }
.gm-pista { width: 110px; height: 8px; border-radius: 99px; background: #e3ead9; overflow: hidden; flex-shrink: 0; }
.gm-relleno { height: 100%; background: #5f9d73; }
.gm-pct { width: 48px; text-align: right; font-weight: 700; flex-shrink: 0; }
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
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function boton(txt, clase, alClic) { const b = el("button", "gm-btn " + (clase || ""), txt); b.type = "button"; b.onclick = alClic; return b; }
  function campo(etiqueta, control, ayuda) {
    const d = el("div", "gm-campo");
    d.append(el("label", "", etiqueta), control);
    if (ayuda) d.append(el("small", "", ayuda));
    return d;
  }

  function montar(raiz) {
    let opciones = [], modulos = [], editando = null, temporizador = null;

    // ---------- Pantalla ----------
    const gm = el("div", "gm");
    const buscarNuevos = boton("Buscar módulos nuevos", "", async () => {
      buscarNuevos.disabled = true;
      try {
        const r = await api("/api/modulos/sincronizar", "POST");
        mostrarAviso(!r.ok ? (r.datos.error || "No se pudo buscar.") : r.datos.nuevos > 0 ? "Se agregaron " + r.datos.nuevos + (r.datos.nuevos === 1 ? " módulo nuevo." : " módulos nuevos.") : "No hay módulos nuevos.", !r.ok);
        cargar();
      } catch (e) { mostrarAviso("No pudimos conectar con el servidor.", true); }
      finally { buscarNuevos.disabled = false; }
    });
    const nuevo = boton("+ Agregar manualmente", "gm-sec", () => abrir(null));
    const barra = el("div", "gm-barra");
    barra.append(buscarNuevos, nuevo);
    const aviso = el("div", "gm-aviso");
    aviso.hidden = true;
    const lista = el("div");
    gm.append(barra, aviso, lista);
    raiz.append(gm);

    function mostrarAviso(t, mal) {
      aviso.textContent = t;
      aviso.className = "gm-aviso" + (mal ? " gm-mal" : "");
      aviso.hidden = false;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { aviso.hidden = true; }, 4500);
    }

    // ---------- Ventana: registrar / editar ----------
    const fondo = el("div", "gm-fondo");
    fondo.hidden = true;
    const vent = el("div", "gm-ventana");
    vent.setAttribute("role", "dialog");
    vent.setAttribute("aria-modal", "true");
    const cab = el("div", "gm-cab");
    const cuerpo = el("div", "gm-cuerpo");
    const fTitulo = el("input"); fTitulo.type = "text"; fTitulo.maxLength = 150; fTitulo.placeholder = "Ej: Módulo 1. Lenguajes de programación";
    const fMateria = el("select");
    const fUrl = el("input"); fUrl.type = "text"; fUrl.placeholder = "/modulos/PROGRAMACION/lenguajes.html"; fUrl.autocapitalize = "none";
    const fEval = el("input"); fEval.type = "text"; fEval.placeholder = "/evaluacionmodulos/PROGRAMACION/lenguajes.html"; fEval.autocapitalize = "none";
    const fOrden = el("input"); fOrden.type = "number"; fOrden.min = 0; fOrden.max = 9999;
    const fDesc = el("input"); fDesc.type = "text"; fDesc.maxLength = 300;
    const fPub = el("input"); fPub.type = "checkbox";
    const lPub = el("label", "gm-check"); lPub.append(fPub, document.createTextNode("Visible para los estudiantes"));
    const cPub = el("div", "gm-campo"); cPub.append(lPub);
    const error = el("p", "gm-error"); error.setAttribute("role", "alert");
    const guardar = boton("Guardar", "", guardarModulo);
    const bots = el("div", "gm-botones");
    bots.append(boton("Cancelar", "gm-sec", cerrar), guardar);
    const det = el("details", "gm-det");
    det.append(el("summary", "", "Enlaces de la página (avanzado)"),
      campo("Enlace del módulo", fUrl, "La ruta de la página, tal como aparece en tu sitio."),
      campo("Enlace de la evaluación (opcional)", fEval, "Si lo dejas vacío, el módulo solo llegará al 50 %."));
    cuerpo.append(
      campo("Título", fTitulo), campo("Materia", fMateria),
      campo("Orden", fOrden, "El 1 sale primero dentro de su materia."), campo("Descripción corta (opcional)", fDesc), cPub, det, error, bots);
    vent.append(cab, cuerpo);
    fondo.append(vent);
    document.body.append(fondo);

    function abrir(m) {
      editando = m;
      cab.textContent = m ? "Editar módulo" : "Registrar módulo";
      fTitulo.value = m ? m.titulo : "";
      fUrl.value = m ? m.url || "" : "";
      fEval.value = m ? m.evaluacion_url || "" : "";
      fOrden.value = m ? m.orden : (modulos.length + 1);
      fDesc.value = m ? m.descripcion || "" : "";
      fPub.checked = m ? m.publicado : true;
      det.open = !m || !m.url;      // los módulos encontrados solos ya traen sus enlaces
      fMateria.innerHTML = "";
      opciones.forEach((o) => { const op = el("option", "", o.nombre); op.value = o.id; fMateria.append(op); });
      if (m) fMateria.value = m.materia_id;
      error.textContent = "";
      fondo.hidden = false;
      fTitulo.focus();
    }
    function cerrar() { fondo.hidden = true; editando = null; }

    async function guardarModulo() {
      error.textContent = "";
      const cuerpoEnvio = {
        titulo: fTitulo.value, materia_id: Number(fMateria.value), url: fUrl.value, evaluacion_url: fEval.value,
        orden: Number(fOrden.value) || 0, descripcion: fDesc.value, publicado: fPub.checked,
      };
      guardar.disabled = true;
      try {
        const r = editando ? await api("/api/modulos/" + editando.id, "PUT", cuerpoEnvio) : await api("/api/modulos", "POST", cuerpoEnvio);
        if (!r.ok) { error.textContent = r.datos.error || "No se pudo guardar el módulo."; return; }
        const nuevoMod = !editando;
        cerrar();
        mostrarAviso(nuevoMod ? "Módulo registrado." : "Cambios guardados.");
        cargar();
      } catch (e) {
        error.textContent = "No pudimos conectar con el servidor.";
      } finally {
        guardar.disabled = false;
      }
    }

    // ---------- Ventana: progreso ----------
    const fondoP = el("div", "gm-fondo");
    fondoP.hidden = true;
    const ventP = el("div", "gm-ventana gm-ancha");
    ventP.setAttribute("role", "dialog");
    ventP.setAttribute("aria-modal", "true");
    const cabP = el("div", "gm-cab");
    const cuerpoP = el("div", "gm-cuerpo");
    const selGrado = el("select");
    const resumenP = el("p", "gm-resumen");
    const listaP = el("div");
    const botsP = el("div", "gm-botones");
    botsP.append(boton("Cerrar", "gm-sec", () => { fondoP.hidden = true; }));
    cuerpoP.append(campo("Grado", selGrado), resumenP, listaP, botsP);
    ventP.append(cabP, cuerpoP);
    fondoP.append(ventP);
    document.body.append(fondoP);
    let filasP = [];

    async function verProgreso(m) {
      cabP.textContent = "Progreso: " + m.titulo;
      resumenP.textContent = "Cargando...";
      listaP.innerHTML = "";
      fondoP.hidden = false;
      const r = await api("/api/modulos/" + m.id + "/progreso");
      if (!r.ok) { resumenP.textContent = r.datos.error || "No se pudo cargar el progreso."; return; }
      filasP = r.datos.filas;
      const grados = filasP.map((f) => f.grado).filter((g, i, a) => a.indexOf(g) === i).sort();
      selGrado.innerHTML = "";
      [["", "Todos los grados"]].concat(grados.map((g) => [g, "Grado " + g])).forEach(([v, t]) => { const o = el("option", "", t); o.value = v; selGrado.append(o); });
      pintarProgreso();
    }
    function pintarProgreso() {
      const filas = filasP.filter((f) => !selGrado.value || f.grado === selGrado.value);
      const n = (p) => filas.filter((f) => f.porcentaje >= p).length;
      resumenP.textContent = filas.length ? "Leyeron: " + n(50) + " · Completaron la evaluación: " + n(100) + " · De " + filas.length + " estudiantes" : "";
      listaP.innerHTML = "";
      if (!filas.length) { listaP.append(el("div", "gm-vacio", "No hay estudiantes todavía.")); return; }
      filas.forEach((f) => {
        const fila = el("div", "gm-fila");
        const nom = el("div", "gm-n");
        nom.append(document.createTextNode(f.nombre), el("small", "", "Grado " + f.grado + (f.nota !== null ? " · Mejor nota: " + f.nota + " %" : "")));
        const pista = el("div", "gm-pista"); const rel = el("div", "gm-relleno");
        rel.style.width = f.porcentaje + "%"; pista.append(rel);
        fila.append(nom, pista, el("div", "gm-pct", f.porcentaje + " %"));
        listaP.append(fila);
      });
    }
    selGrado.addEventListener("change", pintarProgreso);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!fondo.hidden) cerrar();
      if (!fondoP.hidden) fondoP.hidden = true;
    });
    [fondo, fondoP].forEach((f) => f.addEventListener("mousedown", (e) => { if (e.target === f) { f === fondo ? cerrar() : (f.hidden = true); } }));

    // ---------- Lista ----------
    function pintar() {
      lista.innerHTML = "";
      if (!opciones.length) { lista.append(el("div", "gm-vacio", "Aún no tienes materias asignadas. Pídele al administrador que te las asigne.")); return; }
      if (!modulos.length) { lista.append(el("div", "gm-vacio", "Todavía no hay módulos. Pulsa «Buscar módulos nuevos» para traer los de tu sitio.")); return; }
      let actual = null;
      modulos.forEach((m) => {
        if (m.materia !== actual) { actual = m.materia; lista.append(el("h4", "gm-materia", m.materia)); }
        const c = el("div", "gm-card");
        c.append(el("h4", "", m.titulo));
        const chips = el("div", "gm-chips");
        chips.append(
          el("span", "gm-chip" + (m.publicado ? "" : " gm-oculto"), m.publicado ? "Visible" : "Oculto"),
          el("span", "gm-chip", "Orden " + m.orden),
          el("span", "gm-chip", "Leyeron " + m.leidos + " de " + m.total),
          el("span", "gm-chip", "Completaron " + m.completados + " de " + m.total)
        );
        c.append(chips);
        const enl = el("p", "gm-links");
        const a1 = el("a", "", m.url); a1.href = m.url; a1.target = "_blank"; a1.rel = "noopener";
        enl.append(document.createTextNode("Módulo: "), a1);
        if (m.evaluacion_url) {
          const a2 = el("a", "", m.evaluacion_url); a2.href = m.evaluacion_url; a2.target = "_blank"; a2.rel = "noopener";
          enl.append(document.createElement("br"), document.createTextNode("Evaluación: "), a2);
        }
        c.append(enl);
        const acc = el("div", "gm-acc");
        acc.append(
          boton("Ver progreso", "", () => verProgreso(m)),
          boton("Editar", "gm-sec", () => abrir(m)),
          boton("Quitar", "gm-rojo", async () => {
            if (!confirm("¿Quitar «" + m.titulo + "» del catálogo? Se borra el progreso de los estudiantes. Si su página sigue en tu sitio, volverá a aparecer; para esconderla, mejor edítala y desmarca «Visible».")) return;
            const r = await api("/api/modulos/" + m.id, "DELETE");
            mostrarAviso(r.ok ? "Módulo quitado del catálogo." : (r.datos.error || "No se pudo borrar."), !r.ok);
            cargar();
          })
        );
        c.append(acc);
        lista.append(c);
      });
    }

    async function cargar() {
      const [o, l] = await Promise.all([api("/api/modulos/opciones"), api("/api/modulos")]);
      if (!o.ok || !l.ok || !Array.isArray(l.datos)) {
        lista.innerHTML = "";
        lista.append(el("div", "gm-vacio", "No se pudieron cargar los módulos" + (l.datos && l.datos.error ? " (" + l.datos.error + ")" : "") + "."));
        nuevo.disabled = true;
        return;
      }
      opciones = o.datos.materias;
      modulos = l.datos;
      nuevo.disabled = !opciones.length;
      pintar();
    }
    return { recargar: cargar };
  }

  const destino = document.getElementById("gestion-modulos");
  if (destino) { montar(destino).recargar(); return; }
  const panel = document.getElementById("panel");
  if (panel) {
    const cont = el("div");
    cont.append(el("h2", "titulo-lista", "Módulos"));
    (panel.querySelector(".cuerpo") || panel).append(cont);
    const m = montar(cont);
    new MutationObserver(() => { if (!panel.hidden) m.recargar(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    if (!panel.hidden) m.recargar();
  }
})();