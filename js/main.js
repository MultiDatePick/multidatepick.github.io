/* ═══════════════════════════════════════════════════
   MultiDatePick Website — main.js
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    /* ── Announcement Banner Dismiss ── */
    const banner = document.getElementById('announcementBanner');
    const bannerClose = document.getElementById('bannerClose');
    if (banner && bannerClose) {
        if (sessionStorage.getItem('bannerDismissed') === 'true') {
            banner.classList.add('hidden');
        }
        bannerClose.addEventListener('click', () => {
            banner.classList.add('hidden');
            sessionStorage.setItem('bannerDismissed', 'true');
        });
    }

    /* ── Mobile Nav Toggle ── */
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-header nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            toggle.classList.toggle('active');
        });
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.classList.remove('active');
            });
        });
    }

    /* ── FAQ Accordion ── */
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!wasOpen) item.classList.add('open');
        });
    });

    /* ── Fade-In on Scroll ── */
    const fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        fadeEls.forEach(el => observer.observe(el));
    }

    /* ── Smooth scroll for anchor links ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ── Image Lightbox / Expand ── */
    const expandSvg = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

    // Wrap every [data-zoomable] image with a container + expand button
    document.querySelectorAll('img[data-zoomable]').forEach(img => {
        const wrap = document.createElement('div');
        wrap.className = 'zoomable-wrap';
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);

        const btn = document.createElement('button');
        btn.className = 'zoom-btn';
        btn.setAttribute('aria-label', 'Expand image');
        btn.innerHTML = expandSvg;
        wrap.appendChild(btn);

        function openLightbox() {
            const overlay = document.getElementById('lightbox');
            const lbImg = overlay.querySelector('img');
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLightbox(); });
        img.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLightbox(); });
    });

    // Wrap every [data-zoomable-svg] SVG with a container + expand button
    // (data-shape diagrams that should open in the lightbox at full size)
    document.querySelectorAll('svg[data-zoomable-svg]').forEach(svg => {
        const wrap = document.createElement('div');
        wrap.className = 'zoomable-wrap';
        svg.parentNode.insertBefore(wrap, svg);
        wrap.appendChild(svg);

        const btn = document.createElement('button');
        btn.className = 'zoom-btn';
        btn.setAttribute('aria-label', 'Expand diagram');
        btn.innerHTML = expandSvg;
        wrap.appendChild(btn);

        function openLightbox() {
            const overlay = document.getElementById('lightbox');
            const lbImg = overlay.querySelector('img');
            const lbSvgHost = overlay.querySelector('.lightbox-svg-host');
            // Hide the img, show the SVG host
            lbImg.style.display = 'none';
            lbSvgHost.style.display = 'flex';
            // Clone so the original stays in the page
            lbSvgHost.innerHTML = '';
            const clone = svg.cloneNode(true);
            clone.removeAttribute('data-zoomable-svg');
            clone.style.cursor = 'default';
            clone.style.maxWidth = '720px';
            clone.style.width = '100%';
            clone.style.height = 'auto';
            lbSvgHost.appendChild(clone);
            overlay.classList.add('open');
            overlay.classList.add('open-svg');
            document.body.style.overflow = 'hidden';
        }

        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLightbox(); });
        svg.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLightbox(); });
    });

    // Create the lightbox overlay (once) — used by both img and SVG zoom paths
    const hasAnyZoomable = document.querySelectorAll('img[data-zoomable], svg[data-zoomable-svg]').length;
    if (hasAnyZoomable) {
        const overlay = document.createElement('div');
        overlay.id = 'lightbox';
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = '<button class="lightbox-close" aria-label="Close"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><img src="" alt=""><div class="lightbox-svg-host" style="display:none;"></div>';
        document.body.appendChild(overlay);

        function closeLightbox() {
            overlay.classList.remove('open');
            overlay.classList.remove('open-svg');
            document.body.style.overflow = '';
            // Reset display states for next open
            const lbImg = overlay.querySelector('img');
            const lbSvgHost = overlay.querySelector('.lightbox-svg-host');
            lbImg.style.display = '';
            lbSvgHost.style.display = 'none';
            lbSvgHost.innerHTML = '';
        }

        overlay.addEventListener('click', closeLightbox);
        overlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        overlay.querySelector('img').addEventListener('click', e => e.stopPropagation());
        overlay.querySelector('.lightbox-svg-host').addEventListener('click', e => e.stopPropagation());
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) closeLightbox();
        });
    }

});
