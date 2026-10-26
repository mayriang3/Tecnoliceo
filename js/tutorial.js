// Tutorial de bienvenida de 3 pasos.
//  - Se abre solo cuando la página se carga con ?tutorial=1 (botón "Ver tutorial" de bienvenida.html)
//  - También puedes abrirlo desde cualquier botón con:  abrirTutorial()
(function () {
  const PASOS = [
    { titulo: "¡Bienvenido a TecnoLiceo!",
      texto: "Esta plataforma te brinda información, recursos y herramientas para que conozcas, explores y aproveches al máximo la Modalidad en Sistemas y Tecnologías Digitales.",
      consejoTitulo: "¿Qué encontrarás aquí?",
      consejo: "Preguntas frecuentes, material de estudio, mini evaluaciones para poner aprueba tu conocimiento y mucho mas" },
    { titulo: "Explora el menú",
      texto: "Arriba encuentras las secciones del sitio: Inicio, Información general (asignaturas, temas y maestros), Material de Estudio (módulos y evaluaciones) y Preguntas Frecuentes.",
      consejoTitulo: "Un consejo",
      consejo: "En Material de Estudio abre cada módulo y haz su evaluación cuando termines de leerlo." },
    { titulo: "Conoce al asistente virtual",
      texto: "En Preguntas Frecuentes te espera un asistente: toca una pregunta o escribe la tuya. Si no encuentra la respuesta, puedes enviar una sugerencia con el botón del clip.",
      consejoTitulo: "¿Eres estudiante de la modalidad?",
      consejo: "Abre los modulos de los temas que tengas dudas y refuerza tu conocimiento!" },
  ];

  const ICONO_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICONO_FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const ICONO_FOCO = '<svg viewBox="0 0 48 48" fill="none" stroke="#2f6b3f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 31c0-3-4-5-4-11a11 11 0 0 1 22 0c0 6-4 8-4 11z"/><path d="M18 36h12M20 41h8M24 4V1M6 20H3M45 20h-3M9 7l-2-2M39 7l2-2"/></svg>';

  let fondo = null, paso = 0, anterior = null;

  function construir() {
    fondo = document.createElement("div");
    fondo.className = "tt-fondo";
    fondo.hidden = true;
    fondo.innerHTML =
      '<div class="tt-ventana" role="dialog" aria-modal="true" aria-labelledby="tt-titulo">' +
        '<span class="tt-pasos" id="tt-pasos"></span>' +
        '<button type="button" class="tt-cerrar" id="tt-cerrar" aria-label="Cerrar tutorial">' + ICONO_X + '</button>' +
        '<div class="tt-fila">' +
          '<div class="tt-ilus" aria-hidden="true">' +
            '<svg class="tt-blob" viewBox="0 0 230 190"><path d="M38 78C20 36 70 6 122 12c58 7 98 46 86 96-12 52-64 78-112 66C48 162 56 112 38 78z" fill="#cfe3c4"/></svg>' +
            '<img class="tt-bot" src="/img/bot.svg" alt="">' +
            '<div class="tt-burbuja"><i></i><i></i><i></i></div>' +
          '</div>' +
          '<div class="tt-texto"><h2 id="tt-titulo"></h2><p id="tt-texto"></p></div>' +
        '</div>' +
        '<div class="tt-consejo">' + ICONO_FOCO + '<div><strong id="tt-ct"></strong><span id="tt-c"></span></div></div>' +
        '<div class="tt-pie">' +
          '<div class="tt-puntos" id="tt-puntos"></div>' +
          '<div class="tt-botones">' +
            '<button type="button" class="tt-btn tt-atras" id="tt-atras">Atrás</button>' +
            '<button type="button" class="tt-btn tt-sig" id="tt-sig"></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);

    const puntos = fondo.querySelector("#tt-puntos");
    PASOS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tt-punto";
      b.setAttribute("aria-label", "Ir al paso " + (i + 1));
      b.addEventListener("click", () => ir(i));
      puntos.appendChild(b);
    });
    fondo.querySelector("#tt-cerrar").addEventListener("click", cerrar);
    fondo.querySelector("#tt-atras").addEventListener("click", () => ir(paso - 1));
    fondo.querySelector("#tt-sig").addEventListener("click", () => { if (paso < PASOS.length - 1) ir(paso + 1); else cerrar(); });
    fondo.addEventListener("mousedown", (e) => { if (e.target === fondo) cerrar(); });
    document.addEventListener("keydown", teclas);
  }

  function ir(n) {
    paso = Math.max(0, Math.min(PASOS.length - 1, n));
    const p = PASOS[paso], q = (id) => fondo.querySelector("#" + id);
    q("tt-pasos").textContent = (paso + 1) + " de " + PASOS.length;
    q("tt-titulo").textContent = p.titulo;
    q("tt-texto").textContent = p.texto;
    q("tt-ct").textContent = p.consejoTitulo;
    q("tt-c").textContent = p.consejo;
    q("tt-atras").hidden = paso === 0;
    const sig = q("tt-sig");
    sig.innerHTML = (paso === PASOS.length - 1 ? "Empezar" : "Siguiente") + " " + ICONO_FLECHA;
    fondo.querySelectorAll(".tt-punto").forEach((b, i) => {
      b.classList.toggle("tt-act", i === paso);
      if (i === paso) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
  }

  function teclas(e) {
    if (!fondo || fondo.hidden) return;
    if (e.key === "Escape") { cerrar(); return; }
    if (e.key === "ArrowRight") { ir(paso + 1); return; }
    if (e.key === "ArrowLeft") { ir(paso - 1); return; }
    if (e.key === "Tab") {                       // el foco se queda dentro de la ventana
      const f = Array.prototype.filter.call(fondo.querySelectorAll("button"), (b) => !b.hidden);
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  }

  function abrir() {
    if (!fondo) construir();
    anterior = document.activeElement;
    ir(0);
    fondo.hidden = false;
    document.body.style.overflow = "hidden";
    fondo.querySelector("#tt-sig").focus();
  }

  function cerrar() {
    if (!fondo) return;
    fondo.hidden = true;
    document.body.style.overflow = "";
    try { localStorage.setItem("tl_tutorial", "1"); } catch (e) {}
    if (anterior && anterior.focus) anterior.focus();
  }

  window.abrirTutorial = abrir;

  // Abre solo con ?tutorial=1 y limpia la dirección para que no se repita al recargar
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("tutorial") === "1") {
      params.delete("tutorial");
      const resto = params.toString();
      history.replaceState(null, "", location.pathname + (resto ? "?" + resto : "") + location.hash);
      abrir();
    }
  } catch (e) {}
})();