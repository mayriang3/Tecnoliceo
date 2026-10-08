const $ = (id) => document.getElementById(id);
const CAMPOS = ["categoria", "pregunta", "respuesta", "palabras_clave"];

async function api(url, metodo = "GET", cuerpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (r.status === 401 && !url.includes("login")) { mostrar(false); throw new Error("no autorizado"); }
  return { ok: r.ok, datos: await r.json() };
}

function mostrar(dentro) {
  $("login").hidden = dentro;
  $("panel").hidden = !dentro;
  if (dentro) { cargar(); cargarSugerencias(); }
}

function boton(texto, clase, alClic) {
  const b = document.createElement("button");
  b.className = clase;
  b.textContent = texto;
  b.onclick = alClic;
  return b;
}

// ---------- Preguntas frecuentes ----------
async function cargar() {
  const { datos } = await api("/api/admin/faq");
  const lista = $("lista");
  lista.innerHTML = "";
  datos.forEach((f) => {
    const fila = document.createElement("div");
    fila.className = "item";
    const info = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = f.pregunta;
    const c = document.createElement("small");
    c.textContent = f.categoria;
    info.append(t, c);
    const acc = document.createElement("div");
    acc.className = "acciones";
    acc.append(
      boton("Editar", "sec", () => editar(f)),
      boton("Borrar", "rojo", async () => {
        if (confirm("¿Borrar esta pregunta?")) { await api("/api/admin/faq/" + f.id, "DELETE"); cargar(); }
      })
    );
    fila.append(info, acc);
    lista.appendChild(fila);
  });
}

function editar(f) {
  $("id").value = f.id;
  CAMPOS.forEach((k) => ($(k).value = f[k]));
  $("cancelar").hidden = false;
  $("guardar").textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limpiar() {
  $("id").value = "";
  CAMPOS.forEach((k) => ($(k).value = ""));
  $("cancelar").hidden = true;
  $("guardar").textContent = "Guardar";
}

// ---------- Sugerencias ----------
async function cargarSugerencias() {
  const { datos } = await api("/api/admin/sugerencias");
  const cont = $("sugerencias");
  cont.innerHTML = "";
  const nuevas = datos.filter((s) => Number(s.leida) !== 1).length;
  $("contador").textContent = nuevas;
  $("contador").hidden = nuevas === 0;

  if (!datos.length) {
    const p = document.createElement("p");
    p.className = "ayuda";
    p.textContent = "Todavía no hay sugerencias.";
    cont.appendChild(p);
    return;
  }

  datos.forEach((s) => {
    const nueva = Number(s.leida) !== 1;
    const fila = document.createElement("div");
    fila.className = "item" + (nueva ? " nueva" : "");
    const info = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = s.texto;
    info.append(t);
    // Etiquetas: tema, grado, nombre, fecha y estado
    [s.tema, s.grado ? "Grado " + s.grado : "", s.nombre, s.creado.slice(0, 16), nueva ? "Nueva" : "Leída"]
      .filter(Boolean)
      .forEach((txt) => {
        const f = document.createElement("small");
        f.textContent = txt;
        f.style.marginRight = "6px";
        info.append(f);
      });

    const acc = document.createElement("div");
    acc.className = "acciones";
    acc.append(
      // Responder: pasa la sugerencia al formulario para crear la pregunta
      boton("Responder", "", async () => {
        limpiar();
        $("pregunta").value = s.texto;
        if (s.tema && s.tema !== "Otro") $("categoria").value = s.tema;
        if (nueva) await api("/api/admin/sugerencias/" + s.id, "PUT", { leida: true });
        cargarSugerencias();
        window.scrollTo({ top: 0, behavior: "smooth" });
        $("categoria").focus();
      }),
      boton(nueva ? "Marcar leída" : "Marcar nueva", "sec", async () => {
        await api("/api/admin/sugerencias/" + s.id, "PUT", { leida: nueva });
        cargarSugerencias();
      }),
      boton("Borrar", "rojo", async () => {
        if (confirm("¿Borrar esta sugerencia?")) { await api("/api/admin/sugerencias/" + s.id, "DELETE"); cargarSugerencias(); }
      })
    );
    fila.append(info, acc);
    cont.appendChild(fila);
  });
}

// ---------- Formulario y sesión ----------
$("guardar").onclick = async () => {
  const cuerpo = {};
  CAMPOS.forEach((k) => (cuerpo[k] = $(k).value));
  const id = $("id").value;
  const r = id ? await api("/api/admin/faq/" + id, "PUT", cuerpo) : await api("/api/admin/faq", "POST", cuerpo);
  if (!r.ok) { alert(r.datos.error || "No se pudo guardar"); return; }
  limpiar();
  cargar();
};
$("cancelar").onclick = limpiar;

$("entrar").onclick = async () => {
  try {
    const r = await api("/api/admin/login", "POST", { clave: $("clave").value });
    if (r.ok) { $("clave").value = ""; $("msg").textContent = ""; mostrar(true); }
    else $("msg").textContent = "Contraseña incorrecta";
  } catch (e) {
    $("msg").textContent = "No se pudo conectar con el servidor.";
  }
};
$("clave").addEventListener("keydown", (e) => { if (e.key === "Enter") $("entrar").click(); });
$("salir").onclick = async () => { await api("/api/admin/logout", "POST"); mostrar(false); };

api("/api/admin/estado")
  .then((r) => mostrar(r.datos.admin === true))
  .catch(() => {
    $("msg").textContent = "No se pudo conectar con el servidor. Recarga la página.";
    mostrar(false);
  });