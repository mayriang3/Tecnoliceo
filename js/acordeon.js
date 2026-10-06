document.querySelectorAll('.acc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const bodyId = btn.getAttribute('aria-controls');
        const body = document.getElementById(bodyId);
        const flecha = btn.querySelector('.flecha');
        const abierto = btn.getAttribute('aria-expanded') === 'true';

        btn.setAttribute('aria-expanded', String(!abierto));
        body.classList.toggle('oculto');
        flecha.classList.toggle('girada');
    });
});
document.querySelectorAll('.sala .media').forEach((media) => {
    const video = media.querySelector('.video-sala');
    if (!video) return;

    media.addEventListener('mouseenter', () => {
        video.currentTime = 0;
        video.play();
    });

    media.addEventListener('mouseleave', () => {
        video.pause();
    });
});