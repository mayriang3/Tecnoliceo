const caja = document.getElementById("fc-mensajes");
const texto = document.getElementById("fc-texto");
const boton = document.getElementById("fc-enviar");
const BOT = "/img/bot.svg";

function formato(t) {
  return t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function bajar() { caja.scrollTop = caja.scrollHeight; }

// Burbuja del bot, con su muñequito al lado
function filaBot(contenidoHtml, extraClase) {
  const fila = document.createElement("div");
  fila.className = "fc-fila";
  const img = document.createElement("img");
  img.className = "fc-avatar";
  img.src = BOT;
  img.alt = "";
  const b = document.createElement("div");
  b.className = "fc-burbuja fc-bot" + (extraClase ? " " + extraClase : "");
  b.innerHTML = contenidoHtml;
  fila.append(img, b);
  caja.appendChild(fila);
  bajar();
  return fila;
}

function mensajeBot(t) { return filaBot(formato(t)); }

function mensajeUsuario(t) {
  const b = document.createElement("div");
  b.className = "fc-burbuja fc-yo";
  b.textContent = t;
  caja.appendChild(b);
  bajar();
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(cuerpo) {
  const escribiendo = filaBot("<i></i><i></i><i></i>", "fc-escribiendo");
  try {
    const [r] = await Promise.all([
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      }),
      espera(600), // para que se note el "escribiendo..."
    ]);
    const datos = await r.json();
    escribiendo.remove();
    mensajeBot(datos.respuesta);
  } catch (e) {
    escribiendo.remove();
    mensajeBot("Ups, no pude conectar con el servidor.");
  }
}

function enviar() {
  const mensaje = texto.value.trim();
  if (!mensaje) return;
  mensajeUsuario(mensaje);
  texto.value = "";
  pedir({ mensaje: mensaje });
}

async function cargarPreguntas() {
  try {
    const r = await fetch("/api/preguntas");
    const grupos = await r.json();
    const panel = document.createElement("div");
    panel.className = "fc-panel";
    grupos.forEach((g) => {
      const t = document.createElement("span");
      t.className = "fc-cat";
      t.textContent = g.categoria;
      panel.appendChild(t);
      g.preguntas.forEach((p) => {
        const b = document.createElement("button");
        b.className = "fc-chip";
        b.textContent = p.pregunta;
        b.addEventListener("click", () => {
          mensajeUsuario(p.pregunta);
          pedir({ id: p.id });
        });
        panel.appendChild(b);
      });
    });
    caja.appendChild(panel);
  } catch (e) {}
}

boton.addEventListener("click", enviar);
texto.addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });
cargarPreguntas();