// Tareas del estudiante: ver las de su grado por materia, entregar, editar o quitar la entrega.
(function () {
  const raiz = document.getElementById("mis-tareas");
  if (!raiz) return;

  const st = document.createElement("style");
  st.textContent = `
.pf, .pf-fondo { font-family: 'DM Sans', system-ui, sans-serif; color: #1f2a22; }
.pf *, .pf-fondo * { box-sizing: border-box; }
.pf-resumen { margin: 0 0 12px; font-size: .95rem; color: #3d5446; }
.pf-filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.pf-btn { height: 38px; padding: 0 18px; border: 0; border-radius: 999px; background: #122b1d; color: #fff; font: inherit; font-weight: 500; cursor: pointer; transition: background .15s; }
.pf-btn:hover { background: #2f6b3f; }
.pf-btn:disabled { opacity: .6; cursor: wait; }
.pf-sec { background: #eef3e6; color: #122b1d; border: 1.5px solid #d4dfca; }
.pf-sec:hover { background: #dfe9d6; }
.pf-rojo { background: #fff; color: #b3372f; border: 1.5px solid #e6bdb9; }
.pf-rojo:hover { background: #b3372f; color: #fff; }
.pf-filtros .pf-btn { height: 34px; padding: 0 14px; font-size: .88rem; }
.pf-filtros .pf-act { background: #122b1d; color: #fff; border-color: #122b1d; }
.pf-aviso { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #eef3e6; color: #12291c; font-size: .9rem; }
.pf-aviso.pf-mal { background: #fbeceb; color: #b3372f; }
.pf-lista { display: flex; flex-direction: column; gap: 12px; }
.pf-vacio { padding: 18px; text-align: center; color: #6b7a70; }
.pf-card { padding: 16px 18px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 16px; }
.pf-card.pf-hecha { background: #f6f9f3; }
.pf-card h4 { margin: 0 0 8px; font: 700 1.05rem 'Fraunces', Georgia, serif; color: #122b1d; }
.pf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.pf-chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef3e6; color: #2f6b3f; font-size: .75rem; font-weight: 700; }
.pf-chip.pf-venc { background: #fbeceb; color: #b3372f; }
.pf-chip.pf-tarde { background: #fff3d6; color: #8a5a00; }
.pf-chip.pf-ok { background: #dff3e4; color: #1d6b3a; }
.pf-fecha { margin: 0 0 6px; font-size: .9rem; color: #3d5446; }
.pf-desc { margin: 0 0 10px; font-size: .9rem; line-height: 1.45; color: #3d5446; white-space: pre-wrap; }
.pf-mia { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #eef3e6; font-size: .88rem; color: #264034; }
.pf-mia p { margin: 4px 0 0; white-space: pre-wrap; }
.pf-mia a { color: #2f6b3f; font-weight: 700; word-break: break-all; }
.pf-acc { display: flex; gap: 6px; flex-wrap: wrap; }
.pf-acc .pf-btn { height: 34px; padding: 0 14px; font-size: .88rem; }
.pf-fondo { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(18,43,29,.55); }
.pf-fondo[hidden] { display: none; }
.pf-ventana { width: min(480px, 100%); max-height: 92vh; overflow-y: auto; background: #fdfdfb; border-radius: 22px; box-shadow: 0 24px 60px rgba(18,41,28,.35); }
.pf-cab { padding: 16px 22px; background: #122b1d; color: #fff; font: 700 1.1rem 'Fraunces', Georgia, serif; }
.pf-cuerpo { padding: 20px 22px 22px; }
.pf-campo { margin-bottom: 14px; }
.pf-campo label { display: block; margin: 0 0 5px; font-size: .74rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #2f6b3f; }
.pf-campo small { display: block; margin-top: 4px; font-size: .78rem; color: #6b7a70; }
.pf-fondo input, .pf-fondo textarea { width: 100%; padding: 11px 14px; margin: 0; border: 1.5px solid #d4dfca; border-radius: 14px; background: #fff; font: inherit; color: inherit; outline: none; }
.pf-fondo textarea { min-height: 100px; resize: vertical; }
.pf-fondo input:focus, .pf-fondo textarea:focus { border-color: #2f6b3f; box-shadow: 0 0 0 3px rgba(47,107,63,.15); }
.pf-error { min-height: 1.2em; margin: 0 0 10px; font-size: .88rem; color: #b3372f; }
.pf-botones { display: flex; justify-content: flex-end; gap: 10px; }
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
  function boton(txt, clase, alClic) { const b = el("button", "pf-btn " + (clase || ""), txt); b.type = "button"; b.onclick = alClic; return b; }
  function fmt(s) {
    const d = new Date(String(s).replace(" ", "T"));
    return isNaN(d) ? String(s) : d.toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  let tareas = [], filtro = "todas", actual = null, temporizador = null;

  // ---------- Pantalla ----------
  const pf = el("div", "pf");
  const resumen = el("p", "pf-resumen");
  const filtros = el("div", "pf-filtros");
  const aviso = el("div", "pf-aviso");
  aviso.hidden = true;
  const lista = el("div", "pf-lista");
  pf.append(resumen, filtros, aviso, lista);
  raiz.append(pf);

  function mostrarAviso(texto, mal) {
    aviso.textContent = texto;
    aviso.className = "pf-aviso" + (mal ? " pf-mal" : "");
    aviso.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { aviso.hidden = true; }, 4000);
  }

  // ---------- Ventana de entrega ----------
  const fondo = el("div", "pf-fondo");
  fondo.hidden = true;
  const vent = el("div", "pf-ventana");
  vent.setAttribute("role", "dialog");
  vent.setAttribute("aria-modal", "true");
  const cab = el("div", "pf-cab");
  const cuerpo = el("div", "pf-cuerpo");
  const fComentario = el("textarea"); fComentario.maxLength = 1000; fComentario.placeholder = "Cuéntale algo a tu profesor sobre tu entrega (opcional si pones el enlace)";
  const fEnlace = el("input"); fEnlace.type = "text"; fEnlace.placeholder = "https://..."; fEnlace.autocomplete = "off"; fEnlace.autocapitalize = "none";
  const error = el("p", "pf-error"); error.setAttribute("role", "alert");
  const enviar = boton("Enviar entrega", "", guardar);
  const bots = el("div", "pf-botones");
  bots.append(boton("Cancelar", "pf-sec", cerrar), enviar);
  const c1 = el("div", "pf-campo"); c1.append(el("label", "", "Comentario"), fComentario);
  const c2 = el("div", "pf-campo"); c2.append(el("label", "", "Enlace de tu evidencia"), fEnlace, el("small", "", "Pega el enlace de Drive, YouTube, GitHub, etc. Debe empezar por http:// o https://"));
  cuerpo.append(c1, c2, error, bots);
  vent.append(cab, cuerpo);
  fondo.append(vent);
  document.body.append(fondo);
  fondo.addEventListener("mousedown", (e) => { if (e.target === fondo) cerrar(); });
  document.addEventListener("keydown", (e) => { if (!fondo.hidden && e.key === "Escape") cerrar(); });

  function abrir(t) {
    actual = t;
    cab.textContent = (t.entrega ? "Editar entrega: " : "Entregar: ") + t.titulo;
    fComentario.value = t.entrega && t.entrega.comentario ? t.entrega.comentario : "";
    fEnlace.value = t.entrega && t.entrega.enlace ? t.entrega.enlace : "";
    error.textContent = "";
    fondo.hidden = false;
    fComentario.focus();
  }
  function cerrar() { fondo.hidden = true; actual = null; }

  async function guardar() {
    error.textContent = "";
    enviar.disabled = true;
    try {
      const r = await api("/api/mis-tareas/" + actual.id + "/entrega", "POST", { comentario: fComentario.value, enlace: fEnlace.value });
      if (!r.ok) { error.textContent = r.datos.error || "No se pudo enviar la entrega."; return; }
      const habia = !!actual.entrega;
      cerrar();
      mostrarAviso(habia ? "Entrega actualizada." : "¡Entrega enviada! 🎉");
      cargar();
    } catch (e) {
      error.textContent = "No pudimos conectar con el servidor.";
    } finally {
      enviar.disabled = false;
    }
  }

  // ---------- Lista ----------
  function pintar() {
    const pendientes = tareas.filter((t) => !t.entrega).length;
    resumen.textContent = tareas.length ? "Pendientes: " + pendientes + " · Entregadas: " + (tareas.length - pendientes) : "";

    filtros.innerHTML = "";
    const materias = tareas.map((t) => t.materia).filter((m, i, a) => a.indexOf(m) === i).sort();
    if (materias.length > 1) {
      ["todas"].concat(materias).forEach((m) => {
        filtros.append(boton(m === "todas" ? "Todas" : m, filtro === m ? "pf-act" : "pf-sec", () => { filtro = m; pintar(); }));
      });
    } else filtro = "todas";

    lista.innerHTML = "";
    const visibles = tareas.filter((t) => filtro === "todas" || t.materia === filtro);
    if (!visibles.length) {
      lista.append(el("div", "pf-vacio", tareas.length ? "No hay tareas de esta materia." : "Todavía no tienes tareas asignadas. 🎉"));
      return;
    }
    // 1) pendientes abiertas (la más próxima arriba) 2) pendientes vencidas 3) entregadas
    const grupo = (t) => (t.entrega ? 2 : t.vencida ? 1 : 0);
    visibles.slice().sort((a, b) => {
      const g = grupo(a) - grupo(b);
      if (g) return g;
      return grupo(a) === 0 ? (a.fecha_limite < b.fecha_limite ? -1 : 1) : (a.fecha_limite < b.fecha_limite ? 1 : -1);
    }).forEach((t) => {
      const c = el("div", "pf-card" + (t.entrega ? " pf-hecha" : ""));
      c.append(el("h4", "", t.titulo));
      const chips = el("div", "pf-chips");
      chips.append(el("span", "pf-chip", t.materia), el("span", "pf-chip", "Prof. " + t.profesor));
      if (t.entrega) chips.append(el("span", "pf-chip " + (t.entrega.tarde ? "pf-tarde" : "pf-ok"), t.entrega.tarde ? "Entregada tarde" : "Entregada"));
      else chips.append(el("span", "pf-chip" + (t.vencida ? " pf-venc" : ""), t.vencida ? "Vencida" : "Pendiente"));
      c.append(chips, el("p", "pf-fecha", "Entrega: " + fmt(t.fecha_limite)));
      if (t.descripcion) c.append(el("p", "pf-desc", t.descripcion));
      if (t.entrega) {
        const mia = el("div", "pf-mia");
        mia.append(el("strong", "", "Tu entrega · " + fmt(t.entrega.fecha_entrega)));
        if (t.entrega.comentario) mia.append(el("p", "", t.entrega.comentario));
        if (t.entrega.enlace) {
          const p = el("p");
          if (/^https?:\/\//i.test(t.entrega.enlace)) {
            const a = el("a", "", t.entrega.enlace);
            a.href = t.entrega.enlace; a.target = "_blank"; a.rel = "noopener noreferrer";
            p.append(a);
          } else p.textContent = t.entrega.enlace;
          mia.append(p);
        }
        c.append(mia);
      }
      const acc = el("div", "pf-acc");
      acc.append(boton(t.entrega ? "Editar entrega" : (t.vencida ? "Entregar tarde" : "Entregar"), "", () => abrir(t)));
      if (t.entrega) {
        acc.append(boton("Quitar entrega", "pf-rojo", async () => {
          if (!confirm("¿Quitar tu entrega de «" + t.titulo + "»?")) return;
          const r = await api("/api/mis-tareas/" + t.id + "/entrega", "DELETE");
          mostrarAviso(r.ok ? "Entrega quitada." : (r.datos.error || "No se pudo quitar."), !r.ok);
          cargar();
        }));
      }
      c.append(acc);
      lista.append(c);
    });
  }

  async function cargar() {
    const r = await api("/api/mis-tareas");
    if (!r.ok || !Array.isArray(r.datos)) {
      lista.innerHTML = "";
      lista.append(el("div", "pf-vacio", "No se pudieron cargar tus tareas" + (r.datos && r.datos.error ? " (" + r.datos.error + ")" : "") + "."));
      return;
    }
    tareas = r.datos;
    pintar();
  }

  cargar();
})();