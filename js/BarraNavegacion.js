const btnMas = document.getElementById('btnMas');
const menuMas = document.getElementById('menuMas');
const movil = window.matchMedia('(max-width: 760px)');

function posicionar() {
    if (movil.matches) {
        const r = btnMas.getBoundingClientRect();
        menuMas.style.top = (r.bottom + 12) + 'px';
        menuMas.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    } else {
        menuMas.style.top = '';
        menuMas.style.right = '';
    }
}

function cerrar() {
    menuMas.classList.remove('abierto');
    btnMas.setAttribute('aria-expanded', 'false');
}

btnMas.addEventListener('click', (e) => {
    e.stopPropagation();
    posicionar();
    const abierto = menuMas.classList.toggle('abierto');
    btnMas.setAttribute('aria-expanded', abierto);
});

document.addEventListener('click', (e) => {
    if (!menuMas.contains(e.target)) cerrar();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrar();
});
window.addEventListener('resize', cerrar);
document.querySelector('.botones_principales').addEventListener('scroll', cerrar);