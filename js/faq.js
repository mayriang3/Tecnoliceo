document.querySelectorAll('.faq .q-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.pq');
        
        const abierta = item.classList.toggle('abierta');
        btn.setAttribute('aria-expanded', String(abierta));
    });
});
document.querySelectorAll('.faq .pq.abierta').forEach((p) => {
    if (p !== item) {
        p.classList.remove('abierta');
        p.querySelector('.q-btn').setAttribute('aria-expanded', 'false');
    }
});