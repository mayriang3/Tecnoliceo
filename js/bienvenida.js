// Landing de bienvenida: recuerda que ya la viste y, si ya iniciaste sesión, te lleva directo a tu panel.
(function () {
  function marcar() {
    try { localStorage.setItem("tl_visto", "1"); } catch (e) {}
    try { sessionStorage.setItem("tl_visto", "1"); } catch (e) {}
  }
  marcar();   // con solo ver esta página ya cuenta como vista: no se vuelve a redirigir

  // Los enlaces al inicio llevan ?omitir=1 para que el inicio nunca te devuelva aquí
  document.querySelectorAll('a[href="/index.html"]').forEach((a) => a.setAttribute("href", "/index.html?omitir=1"));

  fetch("/api/auth/yo", { headers: { "Content-Type": "application/json" } })
    .then((r) => r.json())
    .then((u) => {
      if (!u || !u.autenticado) return;
      const destinos = { estudiante: ["bv-estudiante", "/perfil.html", "Ir a mi perfil"], profesor: ["bv-profesor", "/profesores.html", "Ir a mi panel"] };
      const d = destinos[u.rol];
      if (!d) return;
      const boton = document.getElementById(d[0]);
      if (!boton) return;
      boton.href = d[1];
      const txt = boton.querySelector(".bv-txt");
      if (txt) txt.textContent = d[2];
      if (u.rol === "estudiante") { const reg = document.getElementById("bv-registro"); if (reg) reg.hidden = true; }
    })
    .catch(() => {});
})();