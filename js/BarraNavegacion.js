    const btnMas = document.getElementById('btnMas');
    const menuMas = document.getElementById('menuMas');

    btnMas.addEventListener('click', (e) => {
        e.stopPropagation();
        const abierto = menuMas.classList.toggle('abierto');
        btnMas.setAttribute('aria-expanded', abierto);
    });

    // Cerrar al hacer clic fuera o con Escape
    document.addEventListener('click', (e) => {
        if (!menuMas.contains(e.target)) {
            menuMas.classList.remove('abierto');
            btnMas.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            menuMas.classList.remove('abierto');
            btnMas.setAttribute('aria-expanded', 'false');
        }
    });