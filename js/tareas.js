// Panel de tareas del profesor: crear, editar, borrar y ver quién entregó.
// Se usa con <div id="gestion-tareas"></div> en profesores.html.
(function () {
  const raiz = document.getElementById("gestion-tareas");
  if (!raiz) return;

  const st = document.createElement("style");
  st.textContent = `
.gt, .gt-fondo { font-family: 'DM Sans', system-ui, sans-serif; color: #1f2a22; }
.gt *, .gt-fondo * { box-sizing: border-box; }
.gt-barra { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; }
.gt-btn { height: 40px; padding: 0 18px; border: 0; border-radius: 999px; background: #122b1d; color: #fff; font: inherit; font-weight: 500; cursor: pointer; transition: background .15s; }
.gt-btn:hover { background: #2f6b3f; }
.gt-btn:disabled { opacity: .5; cursor: not-allowed; }
.gt-sec { background: #eef3e6; color: #122b1d; border: 1.5px solid #d4dfca; }
.gt-sec:hover { background: #dfe9d6; }
.gt-rojo { background: #fff; color: #b3372f; border: 1.5px solid #e6bdb9; }
.gt-rojo:hover { background: #b3372f; color: #fff; }
.gt-aviso { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #eef3e6; color: #12291c; font-size: .9rem; }
.gt-aviso.gt-mal { background: #fbeceb; color: #b3372f; }
.gt-lista { display: flex; flex-direction: column; gap: 12px; }
.gt-vacio { padding: 18px; text-align: center; color: #6b7a70; }
.gt-card { padding: 16px 18px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 16px; }
.gt-card h4 { margin: 0 0 8px; font: 700 1.05rem 'Fraunces', Georgia, serif; color: #122b1d; }
.gt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.gt-chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef3e6; color: #2f6b3f; font-size: .75rem; font-weight: 700; }
.gt-chip.gt-venc { background: #fbeceb; color: #b3372f; }
.gt-chip.gt-tarde { background: #fff3d6; color: #8a5a00; }
.gt-chip.gt-pend { background: #eceeea; color: #5f6b64; }
.gt-fecha { margin: 0 0 6px; font-size: .9rem; color: #3d5446; }
.gt-desc { margin: 0 0 10px; font-size: .9rem; line-height: 1.45; color: #3d5446; white-space: pre-wrap; }
.gt-prog { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: .85rem; color: #3d5446; }
.gt-pista { flex: 1; height: 8px; border-radius: 99px; background: #e3ead9; overflow: hidden; max-width: 260px; }
.gt-relleno { height: 100%; background: #5f9d73; }
.gt-acc { display: flex; gap: 6px; flex-wrap: wrap; }
.gt-acc .gt-btn { height: 34px; padding: 0 14px; font-size: .88rem; }
.gt-fondo { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(18,43,29,.55); }
.gt-fondo[hidden] { display: none; }
.gt-ventana { width: min(520px, 100%); max-height: 92vh; overflow-y: auto; background: #fdfdfb; border-radius: 22px; box-shadow: 0 24px 60px rgba(18,41,28,.35); }
.gt-ventana.gt-ancha { width: min(700px, 100%); }
.gt-cab { padding: 16px 22px; background: #122b1d; color: #fff; font: 700 1.1rem 'Fraunces', Georgia, serif; }
.gt-cuerpo { padding: 20px 22px 22px; }
.gt-campo { margin-bottom: 14px; }
.gt-campo > label { display: block; margin: 0 0 5px; font-size: .74rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #2f6b3f; }
.gt-fondo input[type=text], .gt-fondo input[type=datetime-local], .gt-fondo select, .gt-fondo textarea { width: 100%; padding: 11px 14px; margin: 0; border: 1.5px solid #d4dfca; border-radius: 14px; background: #fff; font: inherit; color: inherit; outline: none; }
.gt-fondo textarea { min-height: 100px; resize: vertical; }
.gt-fondo input:focus, .gt-fondo select:focus, .gt-fondo textarea:focus { border-color: #2f6b3f; box-shadow: 0 0 0 3px rgba(47,107,63,.15); }
.gt-grados label { display: inline-flex; align-items: center; gap: 6px; margin: 0 16px 6px 0; font-size: .92rem; font-weight: 500; text-transform: none; letter-spacing: 0; color: inherit; }
.gt-grados input { width: auto; margin: 0; }
.gt-error { min-height: 1.2em; margin: 0 0 10px; font-size: .88rem; color: #b3372f; }
.gt-botones { display: flex; justify-content: flex-end; gap: 10px; }
.gt-filtros { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.gt-filtros .gt-btn { height: 32px; padding: 0 14px; font-size: .85rem; }
.gt-filtros .gt-act { background: #122b1d; color: #fff; border-color: #122b1d; }
.gt-fila { padding: 10px 14px; margin-bottom: 8px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 14px; }
.gt-fila strong { display: inline-block; margin-right: 8px; }
.gt-fila small { color: #6b7a70; }
.gt-fila p { margin: 6px 0 0; font-size: .88rem; color: #3d5446; white-space: pre-wrap; }
.gt-fila a { color: #2f6b3f; font-weight: 700; word-break: break-all; }
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
  function boton(txt, clase, alClic) { const b = el("button", "gt-btn " + (clase || ""), txt); b.type = "button"; b.onclick = alClic; return b; }
  function campo(etiqueta, control) {
    const d = el("div", "gt-campo");
    const l = el("label", "", etiqueta);
    d.append(l, control);
    return d;
  }
  function fmt(s) {
    const d = new Date(String(s).replace(" ", "T"));
    return isNaN(d) ? String(s) : d.toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  let opciones = { materias: [], grados: [] }, tareas = [], editando = null, temporizador = null;

  // ---------- Pantalla ----------
  const gt = el("div", "gt");
  const nueva = boton("+ Nueva tarea", "", () => abrirTarea(null));
  const barra = el("div", "gt-barra");
  barra.append(el("span", "", ""), nueva);
  const aviso = el("div", "gt-aviso");
  aviso.hidden = true;
  const lista = el("div", "gt-lista");
  gt.append(barra, aviso, lista);
  raiz.append(gt);

  function mostrarAviso(texto, mal) {
    aviso.textContent = texto;
    aviso.className = "gt-aviso" + (mal ? " gt-mal" : "");
    aviso.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { aviso.hidden = true; }, 4500);
  }

  // ---------- Ventana: crear / editar tarea ----------
  const fondoT = el("div", "gt-fondo");
  fondoT.hidden = true;
  const ventT = el("div", "gt-ventana");
  ventT.setAttribute("role", "dialog");
  ventT.setAttribute("aria-modal", "true");
  const cabT = el("div", "gt-cab");
  const cuerpoT = el("div", "gt-cuerpo");
  const fTitulo = el("input"); fTitulo.type = "text"; fTitulo.maxLength = 150; fTitulo.placeholder = "Ej: Práctica 01 con Arduino";
  const fMateria = el("select");
  const fGrados = el("div", "gt-grados");
  const fFecha = el("input"); fFecha.type = "datetime-local";
  const fDesc = el("textarea"); fDesc.maxLength = 2000; fDesc.placeholder = "Ej: Enviar las evidencias de la práctica 01 de Arduino";
  const errT = el("p", "gt-error"); errT.setAttribute("role", "alert");
  const guardarT = boton("Guardar", "", guardarTarea);
  const botsT = el("div", "gt-botones");
  botsT.append(boton("Cancelar", "gt-sec", cerrarTarea), guardarT);
  cuerpoT.append(campo("Título", fTitulo), campo("Materia", fMateria), campo("Grados", fGrados), campo("Fecha y hora límite", fFecha), campo("Descripción", fDesc), errT, botsT);
  ventT.append(cabT, cuerpoT);
  fondoT.append(ventT);
  document.body.append(fondoT);

  function abrirTarea(t) {
    editando = t;
    cabT.textContent = t ? "Editar tarea" : "Nueva tarea";
    fTitulo.value = t ? t.titulo : "";
    fDesc.value = t ? (t.descripcion || "") : "";
    fFecha.value = t ? String(t.fecha_limite).slice(0, 16).replace(" ", "T") : "";
    fMateria.innerHTML = "";
    opciones.materias.forEach((m) => { const o = el("option", "", m.nombre); o.value = m.id; fMateria.append(o); });
    if (t) fMateria.value = t.materia_id;
    fGrados.innerHTML = "";
    opciones.grados.forEach((g) => {
      const l = el("label");
      const c = el("input"); c.type = "checkbox"; c.value = g.id;
      c.checked = !!t && t.grados.indexOf(Number(g.id)) !== -1;
      l.append(c, document.createTextNode("Grado " + g.nombre));
      fGrados.append(l);
    });
    errT.textContent = "";
    fondoT.hidden = false;
    fTitulo.focus();
  }
  function cerrarTarea() { fondoT.hidden = true; editando = null; }

  async function guardarTarea() {
    errT.textContent = "";
    const cuerpo = {
      titulo: fTitulo.value,
      descripcion: fDesc.value,
      materia_id: Number(fMateria.value),
      fecha_limite: fFecha.value,
      grados: Array.prototype.map.call(fGrados.querySelectorAll("input:checked"), (c) => Number(c.value)),
    };
    guardarT.disabled = true;
    try {
      const r = editando ? await api("/api/tareas/" + editando.id, "PUT", cuerpo) : await api("/api/tareas", "POST", cuerpo);
      if (!r.ok) { errT.textContent = r.datos.error || "No se pudo guardar la tarea."; return; }
      const eraNueva = !editando;
      cerrarTarea();
      mostrarAviso(eraNueva ? "Tarea creada." : "Cambios guardados.");
      cargar();
    } catch (e) {
      errT.textContent = "No pudimos conectar con el servidor.";
    } finally {
      guardarT.disabled = false;
    }
  }

  // ---------- Ventana: entregas ----------
  const fondoE = el("div", "gt-fondo");
  fondoE.hidden = true;
  const ventE = el("div", "gt-ventana gt-ancha");
  ventE.setAttribute("role", "dialog");
  ventE.setAttribute("aria-modal", "true");
  const cabE = el("div", "gt-cab");
  const cuerpoE = el("div", "gt-cuerpo");
  const resumenE = el("p", "gt-fecha");
  const filtrosE = el("div", "gt-filtros");
  const listaE = el("div");
  const botsE = el("div", "gt-botones");
  botsE.append(boton("Cerrar", "gt-sec", () => { fondoE.hidden = true; }));
  cuerpoE.append(resumenE, filtrosE, listaE, botsE);
  ventE.append(cabE, cuerpoE);
  fondoE.append(ventE);
  document.body.append(fondoE);

  let datosE = null, filtroE = "todos";
  async function verEntregas(t) {
    cabE.textContent = "Entregas: " + t.titulo;
    resumenE.textContent = "Cargando...";
    filtrosE.innerHTML = ""; listaE.innerHTML = "";
    fondoE.hidden = false;
    const r = await api("/api/tareas/" + t.id + "/entregas");
    if (!r.ok) { resumenE.textContent = r.datos.error || "No se pudieron cargar las entregas."; return; }
    datosE = r.datos; filtroE = "todos";
    pintarEntregas();
  }
  function pintarEntregas() {
    const d = datosE;
    resumenE.textContent = "Plazo: " + fmt(d.tarea.fecha_limite) + " · Entregaron " + d.entregadas + " de " + d.total;
    filtrosE.innerHTML = "";
    [["todos", "Todos"], ["si", "Entregaron"], ["no", "Pendientes"]].forEach(([k, n]) => {
      const b = boton(n, filtroE === k ? "gt-act" : "gt-sec", () => { filtroE = k; pintarEntregas(); });
      filtrosE.append(b);
    });
    listaE.innerHTML = "";
    const filas = d.filas.filter((f) => filtroE === "todos" || (filtroE === "si") === !!f.entregada);
    if (!filas.length) { listaE.append(el("div", "gt-vacio", d.total ? "Nadie en esta categoría." : "No hay estudiantes en los grados de esta tarea.")); return; }
    filas.forEach((f) => {
      const fila = el("div", "gt-fila");
      fila.append(el("strong", "", f.nombre), el("small", "", "Grado " + f.grado + " · @" + f.usuario), document.createTextNode(" "));
      if (!f.entregada) fila.append(el("span", "gt-chip gt-pend", "Pendiente"));
      else fila.append(el("span", "gt-chip" + (f.tarde ? " gt-tarde" : ""), f.tarde ? "Entregó tarde" : "Entregó"), el("small", "", " " + fmt(f.fecha_entrega)));
      if (f.comentario) fila.append(el("p", "", f.comentario));
      if (f.archivo_url) {
        const p = el("p");
        if (/^https?:\/\//i.test(f.archivo_url)) {
          const a = el("a", "", f.archivo_url);
          a.href = f.archivo_url; a.target = "_blank"; a.rel = "noopener noreferrer";
          p.append(a);
        } else p.textContent = f.archivo_url;
        fila.append(p);
      }
      listaE.append(fila);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!fondoT.hidden) cerrarTarea();
    if (!fondoE.hidden) fondoE.hidden = true;
  });
  [fondoT, fondoE].forEach((f) => f.addEventListener("mousedown", (e) => { if (e.target === f) { f === fondoT ? cerrarTarea() : (f.hidden = true); } }));

  // ---------- Lista de tareas ----------
  function pintar() {
    lista.innerHTML = "";
    if (!opciones.materias.length) {
      lista.append(el("div", "gt-vacio", "Aún no tienes materias asignadas. Pídele al administrador que te las asigne para poder crear tareas."));
      return;
    }
    if (!tareas.length) { lista.append(el("div", "gt-vacio", "Todavía no has creado tareas. Pulsa «+ Nueva tarea» para empezar.")); return; }
    // primero las abiertas (la más próxima arriba), luego las vencidas (la más reciente arriba)
    const abiertas = tareas.filter((t) => !t.vencida).sort((a, b) => a.fecha_limite < b.fecha_limite ? -1 : 1);
    const vencidas = tareas.filter((t) => t.vencida).sort((a, b) => a.fecha_limite < b.fecha_limite ? 1 : -1);
    abiertas.concat(vencidas).forEach((t) => {
      const c = el("div", "gt-card");
      c.append(el("h4", "", t.titulo));
      const chips = el("div", "gt-chips");
      chips.append(el("span", "gt-chip", t.materia), el("span", "gt-chip", "Grados: " + (t.grados_nombres || "—")), el("span", "gt-chip" + (t.vencida ? " gt-venc" : ""), t.vencida ? "Vencida" : "Abierta"));
      c.append(chips, el("p", "gt-fecha", "Entrega: " + fmt(t.fecha_limite)));
      if (t.descripcion) c.append(el("p", "gt-desc", t.descripcion));
      const prog = el("div", "gt-prog");
      if (t.total) {
        const pista = el("div", "gt-pista"); const rel = el("div", "gt-relleno");
        rel.style.width = Math.round((t.entregadas / t.total) * 100) + "%";
        pista.append(rel);
        prog.append(pista, el("span", "", "Entregaron " + t.entregadas + " de " + t.total));
      } else prog.append(el("span", "", "No hay estudiantes en estos grados todavía."));
      c.append(prog);
      const acc = el("div", "gt-acc");
      acc.append(
        boton("Ver entregas", "", () => verEntregas(t)),
        boton("Editar", "gt-sec", () => abrirTarea(t)),
        boton("Borrar", "gt-rojo", async () => {
          if (!confirm("¿Borrar «" + t.titulo + "»? También se borran las entregas recibidas.")) return;
          const r = await api("/api/tareas/" + t.id, "DELETE");
          mostrarAviso(r.ok ? "Tarea borrada." : (r.datos.error || "No se pudo borrar."), !r.ok);
          cargar();
        })
      );
      c.append(acc);
      lista.append(c);
    });
  }

  async function cargar() {
    const [o, t] = await Promise.all([api("/api/tareas/opciones"), api("/api/tareas")]);
    if (!o.ok || !t.ok || !Array.isArray(t.datos)) {
      lista.innerHTML = "";
      lista.append(el("div", "gt-vacio", "No se pudieron cargar las tareas" + (t.datos && t.datos.error ? " (" + t.datos.error + ")" : "") + "."));
      nueva.disabled = true;
      return;
    }
    opciones = o.datos;
    tareas = t.datos;
    nueva.disabled = !opciones.materias.length;
    pintar();
  }

  cargar();
})();