/* ── Flow Accordion (Flow Cheat Sheet page) ── */
/* Add this block inside the DOMContentLoaded listener in main.js */

document.querySelectorAll('.flow-header').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.flow-item');
        const wasOpen = item.classList.contains('open');
        // Close all flow items
        document.querySelectorAll('.flow-item').forEach(i => i.classList.remove('open'));
        // Toggle current
        if (!wasOpen) item.classList.add('open');
        // Update aria
        document.querySelectorAll('.flow-header').forEach(b => b.setAttribute('aria-expanded', 'false'));
        if (!wasOpen) btn.setAttribute('aria-expanded', 'true');
    });
});
