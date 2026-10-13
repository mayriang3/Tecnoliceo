// Seguimiento de progreso del estudiante. Se agrega una línea al final de cada página:
//   en cada módulo:      <script src="/js/seguimiento.js" data-tipo="modulo">  (y su cierre)
//   en cada evaluación:  <script src="/js/seguimiento.js" data-tipo="evaluacion">  (y su cierre), después del script de calificar
(function () {
  const yo = document.currentScript;
  const cfg = (yo && yo.dataset) || {};
  const tipo = cfg.tipo || (typeof window.calificar === "function" ? "evaluacion" : "modulo");
  const MIN_SEGUNDOS = Number(cfg.segundos || 20);   // tiempo mínimo en la página para contar como "leído"
  const ruta = location.pathname;

  function aviso(texto) {
    const d = document.createElement("div");
    d.textContent = texto;
    d.setAttribute("role", "status");
    d.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;max-width:300px;padding:12px 18px;border-radius:14px;" +
      "background:#122b1d;color:#fff;font:500 .95rem 'DM Sans',system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.25)";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }

  // Si no hay sesión de estudiante, el servidor responde 401 y simplemente no se guarda nada
  async function enviar(evento, nota) {
    try {
      const r = await fetch("/api/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ evento: evento, ruta: ruta, nota: nota === undefined ? null : nota }),
      });
      if (!r.ok) return false;
      aviso(evento === "leido" ? "✓ Módulo leído · progreso guardado (50 %)" : "✓ Evaluación completada · progreso guardado (100 %)");
      return true;
    } catch (e) { return false; }
  }

  // ---------- Módulo: se cuenta como leído al llegar al final de la página tras unos segundos ----------
  if (tipo === "modulo") {
    const clave = "seg:leido:" + ruta;
    try { if (sessionStorage.getItem(clave)) return; } catch (e) {}
    let segundos = 0, listo = false;
    const alFinal = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 150;
    const reloj = setInterval(() => { if (document.visibilityState === "visible") segundos++; revisar(); }, 1000);
    async function revisar() {
      if (listo || segundos < MIN_SEGUNDOS || !alFinal()) return;
      listo = true;
      clearInterval(reloj);
      if (await enviar("leido")) { try { sessionStorage.setItem(clave, "1"); } catch (e) {} }
    }
    window.addEventListener("scroll", revisar, { passive: true });
  }

  // ---------- Evaluación: se cuenta al terminarla (todas las preguntas respondidas y calificada) ----------
  if (tipo === "evaluacion") {
    const todasRespondidas = () => {
      const grupos = new Set(Array.prototype.map.call(document.querySelectorAll("input[type=radio]"), (i) => i.name));
      return grupos.size > 0 && document.querySelectorAll("input[type=radio]:checked").length === grupos.size;
    };
    function envolver() {
      const original = window.calificar;
      if (typeof original !== "function" || original.__seguimiento) return false;
      const nueva = function () {
        const completa = todasRespondidas();
        const r = original.apply(this, arguments);
        const res = document.getElementById("resultado");
        if (completa && res && res.style.display === "block") {
          const nota = parseFloat((document.getElementById("porcentaje") || {}).textContent);
          enviar("evaluado", isNaN(nota) ? null : nota);
        }
        return r;
      };
      nueva.__seguimiento = true;
      window.calificar = nueva;
      return true;
    }
    if (!envolver()) window.addEventListener("load", envolver);
  }
})();