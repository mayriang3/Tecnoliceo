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
  if (dentro) cargar();
}

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
    const e = document.createElement("button");
    e.className = "sec";
    e.textContent = "Editar";
    e.onclick = () => editar(f);
    const b = document.createElement("button");
    b.className = "rojo";
    b.textContent = "Borrar";
    b.onclick = async () => {
      if (confirm("¿Borrar esta pregunta?")) { await api("/api/admin/faq/" + f.id, "DELETE"); cargar(); }
    };
    acc.append(e, b);
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