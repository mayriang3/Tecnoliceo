(function () {
  const TEMAS = ["Antes de inscribirte", "Lo más difícil", "Lo que vas a aprender", "¿Vale la pena?", "Otro"];

  // Estructura de la ventanita (solo texto fijo, nada que venga de usuarios)
  const fondo = document.createElement("div");
  fondo.className = "sg-fondo";
  fondo.hidden = true;
  fondo.innerHTML =
    '<div class="sg-ventana" role="dialog" aria-modal="true" aria-labelledby="sg-titulo">' +
      '<div class="sg-cab">' +
        '<img src="/img/bot.svg" alt="">' +
        '<h2 id="sg-titulo">Sugiere una pregunta</h2>' +
        '<button type="button" class="sg-cerrar" id="sg-cerrar" aria-label="Cerrar">&times;</button>' +
      '</div>' +
      '<div class="sg-cuerpo" id="sg-form">' +
        '<p class="sg-intro">¿Te quedó una duda que no encontraste? Cuéntanos y la sumamos al asistente.</p>' +
        '<label for="sg-texto">Tu pregunta *</label>' +
        '<textarea id="sg-texto" maxlength="500" placeholder="Escribe aquí tu pregunta o sugerencia"></textarea>' +
        '<div class="sg-contador" id="sg-contador">0 / 500</div>' +
        '<label for="sg-tema">Tema</label>' +
        '<select id="sg-tema">' + TEMAS.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select>" +
        '<div class="sg-dos">' +
          '<div><label for="sg-nombre">Tu nombre <small>(opcional)</small></label><input id="sg-nombre" maxlength="80" autocomplete="off"></div>' +
          '<div><label for="sg-grado">Grado <small>(opcional)</small></label><input id="sg-grado" maxlength="10" placeholder="Ej: 1103" autocomplete="off"></div>' +
        '</div>' +
        '<input id="sg-web" class="sg-trampa" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<p class="sg-error" id="sg-error" role="alert"></p>' +
        '<div class="sg-botones">' +
          '<button type="button" class="sg-sec" id="sg-cancelar">Cancelar</button>' +
          '<button type="button" class="sg-env" id="sg-enviar">Enviar sugerencia</button>' +
        '</div>' +
      '</div>' +
      '<div class="sg-cuerpo sg-gracias" id="sg-gracias" hidden>' +
        '<div class="sg-check">✓</div>' +
        '<h3>¡Gracias!</h3>' +
        '<p>Recibimos tu sugerencia y la vamos a revisar.</p>' +
        '<button type="button" class="sg-env" id="sg-listo">Listo</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);

  const $ = function (id) { return document.getElementById(id); };
  let anterior = null;

  function enfocables() {
    return Array.prototype.filter.call(
      fondo.querySelectorAll("button, textarea, input:not(.sg-trampa), select"),
      function (e) { return e.offsetParent !== null; }
    );
  }

  function abrir(textoInicial) {
    anterior = document.activeElement;
    $("sg-form").hidden = false;
    $("sg-gracias").hidden = true;
    $("sg-error").textContent = "";
    if (typeof textoInicial === "string") $("sg-texto").value = textoInicial.slice(0, 500);
    actualizarContador();
    fondo.hidden = false;
    document.body.style.overflow = "hidden";
    $("sg-texto").focus();
  }

  function cerrar() {
    fondo.hidden = true;
    document.body.style.overflow = "";
    if (anterior && anterior.focus) anterior.focus();
  }

  function actualizarContador() {
    $("sg-contador").textContent = $("sg-texto").value.length + " / 500";
  }

  async function enviar() {
    const texto = $("sg-texto").value.trim();
    if (texto.length < 5) { $("sg-error").textContent = "Escribe tu pregunta (mínimo 5 caracteres)."; $("sg-texto").focus(); return; }
    const btn = $("sg-enviar");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    $("sg-error").textContent = "";
    try {
      const r = await fetch("/api/sugerencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: texto,
          tema: $("sg-tema").value,
          nombre: $("sg-nombre").value,
          grado: $("sg-grado").value,
          web: $("sg-web").value,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        $("sg-form").hidden = true;
        $("sg-gracias").hidden = false;
        $("sg-texto").value = "";
        $("sg-listo").focus();
        if (typeof mensajeBot === "function") mensajeBot("¡Gracias! 💚 Recibimos tu sugerencia y la vamos a revisar.");
      } else {
        $("sg-error").textContent = d.error || "No pudimos enviar tu sugerencia.";
      }
    } catch (e) {
      $("sg-error").textContent = "No pudimos conectar con el servidor. Intenta de nuevo.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar sugerencia";
    }
  }

  $("sg-texto").addEventListener("input", actualizarContador);
  $("sg-enviar").addEventListener("click", enviar);
  $("sg-cerrar").addEventListener("click", cerrar);
  $("sg-cancelar").addEventListener("click", cerrar);
  $("sg-listo").addEventListener("click", cerrar);
  fondo.addEventListener("mousedown", function (e) { if (e.target === fondo) cerrar(); });
  document.addEventListener("keydown", function (e) {
    if (fondo.hidden) return;
    if (e.key === "Escape") { cerrar(); return; }
    if (e.key === "Tab") {           // el foco se queda dentro de la ventanita
      const f = enfocables();
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  });

  // El clip del chat abre la ventanita (en vez de ir a otra página)
  const clip = document.querySelector(".fc-adjuntar");
  if (clip) {
    clip.addEventListener("click", function (e) { e.preventDefault(); abrir(); });
  }

  window.abrirSugerencia = abrir;
})();