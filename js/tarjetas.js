document.querySelectorAll('.tarjeta').forEach((tarjeta) => {
    tarjeta.addEventListener('mouseenter', () => {
        tarjeta.classList.add('activa');
    });

    tarjeta.addEventListener('mouseleave', () => {
        tarjeta.classList.remove('activa');
    });
});