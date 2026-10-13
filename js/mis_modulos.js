// Módulos del estudiante, por materia, con su progreso (50 % leído, 100 % evaluación completada).
(function () {
  const raiz = document.getElementById("mis-modulos");
  if (!raiz) return;

  const st = document.createElement("style");
  st.textContent = `
.mm { font-family: 'DM Sans', system-ui, sans-serif; color: #1f2a22; }
.mm * { box-sizing: border-box; }
.mm-total { margin: 0 0 16px; padding: 14px 16px; border-radius: 16px; background: #eef3e6; }
.mm-total p { margin: 0 0 8px; font-size: .95rem; color: #264034; }
.mm-pista { height: 10px; border-radius: 99px; background: #d9e5cf; overflow: hidden; }
.mm-relleno { height: 100%; background: #5f9d73; transition: width .4s; }
.mm-materia { margin: 18px 0 10px; font: 700 1.05rem 'Fraunces', Georgia, serif; color: #2f6b3f; }
.mm-lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.mm-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #fff; border: 1.5px solid #e3ead9; border-radius: 16px; }
.mm-card.mm-listo { background: #f6f9f3; border-color: #bcd9c3; }
.mm-card h4 { margin: 0; font: 700 1rem 'DM Sans', sans-serif; color: #122b1d; }
.mm-desc { margin: 0; font-size: .86rem; line-height: 1.4; color: #3d5446; }
.mm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mm-chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eceeea; color: #5f6b64; font-size: .75rem; font-weight: 700; }
.mm-chip.mm-m { background: #fff3d6; color: #8a5a00; }
.mm-chip.mm-ok { background: #dff3e4; color: #1d6b3a; }
.mm-prog { display: flex; align-items: center; gap: 8px; font-size: .82rem; color: #3d5446; }
.mm-prog .mm-pista { flex: 1; height: 8px; }
.mm-acc { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.mm-btn { display: inline-flex; align-items: center; height: 34px; padding: 0 14px; border-radius: 999px; background: #122b1d; color: #fff; font: 500 .88rem 'DM Sans', sans-serif; text-decoration: none; transition: background .15s; }
.mm-btn:hover { background: #2f6b3f; }
.mm-btn.mm-sec { background: #eef3e6; color: #122b1d; border: 1.5px solid #d4dfca; }
.mm-btn.mm-sec:hover { background: #dfe9d6; }
.mm-vacio { padding: 18px; text-align: center; color: #6b7a70; }
`;
  document.head.append(st);

  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function enlace(txt, href, clase) {
    const a = el("a", "mm-btn " + (clase || ""), txt);
    a.href = href;
    return a;
  }

  const mm = el("div", "mm");
  raiz.append(mm);

  async function cargar() {
    let r, datos;
    try { r = await fetch("/api/mis-modulos", { headers: { "Content-Type": "application/json" } }); datos = await r.json(); }
    catch (e) { mm.append(el("div", "mm-vacio", "No pudimos cargar los módulos.")); return; }
    if (!r.ok || !Array.isArray(datos)) { mm.append(el("div", "mm-vacio", "No se pudieron cargar los módulos" + (datos && datos.error ? " (" + datos.error + ")" : "") + ".")); return; }
    if (!datos.length) { mm.append(el("div", "mm-vacio", "Todavía no hay módulos disponibles.")); return; }

    const media = Math.round(datos.reduce((s, m) => s + m.porcentaje, 0) / datos.length);
    const hechos = datos.filter((m) => m.porcentaje === 100).length;
    const total = el("div", "mm-total");
    total.append(el("p", "", "Tu avance: " + media + " % · Módulos completados: " + hechos + " de " + datos.length));
    const pista = el("div", "mm-pista"); const rel = el("div", "mm-relleno"); rel.style.width = media + "%"; pista.append(rel);
    total.append(pista);
    mm.append(total);

    let actual = null, grilla = null;
    datos.forEach((m) => {
      if (m.materia !== actual) {
        actual = m.materia;
        mm.append(el("h4", "mm-materia", m.materia));
        grilla = el("div", "mm-lista");
        mm.append(grilla);
      }
      const c = el("div", "mm-card" + (m.porcentaje === 100 ? " mm-listo" : ""));
      c.append(el("h4", "", m.titulo));
      if (m.descripcion) c.append(el("p", "mm-desc", m.descripcion));
      const chips = el("div", "mm-chips");
      chips.append(el("span", "mm-chip" + (m.porcentaje === 100 ? " mm-ok" : m.porcentaje >= 50 ? " mm-m" : ""),
        m.porcentaje === 100 ? "Completado" : m.porcentaje >= 50 ? "Leído" : "Sin empezar"));
      if (m.nota !== null) chips.append(el("span", "mm-chip", "Mejor nota: " + m.nota + " %"));
      c.append(chips);
      const prog = el("div", "mm-prog");
      const p = el("div", "mm-pista"); const r2 = el("div", "mm-relleno"); r2.style.width = m.porcentaje + "%"; p.append(r2);
      prog.append(p, el("span", "", m.porcentaje + " %"));
      c.append(prog);
      const acc = el("div", "mm-acc");
      acc.append(enlace(m.porcentaje ? "Volver a leer" : "Abrir módulo", m.url));
      if (m.evaluacion_url) acc.append(enlace(m.porcentaje === 100 ? "Repetir evaluación" : "Hacer evaluación", m.evaluacion_url, "mm-sec"));
      c.append(acc);
      grilla.append(c);
    });
  }
  cargar();
})();