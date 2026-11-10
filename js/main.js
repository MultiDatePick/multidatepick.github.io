/* ═══════════════════════════════════════════════════
   MultiDatePick Website — main.js
   ═══════════════════════════════════════════════════ */

// Text that scripts put on screen lives in the page, in hidden .mdp-strings blocks, so the
// translated pages carry it in their own language. mdpText('close', 'Close') reads it, falling
// back to the English given when a page has no such string.
window.mdpText = function (key, fallback) {
    const el = document.querySelector('.mdp-strings [data-k="' + key + '"]');
    return el ? el.innerHTML.trim() : fallback;
};

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
        // The open menu scrolls inside the space left below the header (style.css). The header's
        // bottom edge moves while the announcement banner scrolls away, so it is measured, not assumed.
        const header = nav.closest('.site-header');
        const fitMenu = () => {
            if (header && nav.classList.contains('open')) {
                nav.style.setProperty('--nav-top', Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + 'px');
            }
        };
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            toggle.classList.toggle('active');
            fitMenu();
        });
        window.addEventListener('scroll', fitMenu, { passive: true });
        window.addEventListener('resize', fitMenu);
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.classList.remove('active');
            });
        });
    }

    /* ── Components dropdown (click to open) ── */
    const closeDropdowns = () => {
        document.querySelectorAll('.nav-dropdown.is-open').forEach(dd => {
            dd.classList.remove('is-open');
            const t = dd.querySelector('.nav-dropdown-toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
        });
    };
    document.querySelectorAll('.nav-dropdown-toggle').forEach(tg => {
        const dd = tg.closest('.nav-dropdown');
        tg.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !dd.classList.contains('is-open');
            closeDropdowns();
            if (willOpen) { dd.classList.add('is-open'); tg.setAttribute('aria-expanded', 'true'); }
        });
    });
    document.addEventListener('click', closeDropdowns);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdowns(); });

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
    // One overlay per page. A zoomed image shows its caption under it: a carousel slide's caption, otherwise the
    // figcaption of the figure it sits in. Inside a carousel, previous and next (buttons, Left and Right arrow keys, a
    // swipe) step to the neighbouring slide's image without closing, and closing leaves the carousel on that slide.
    // Escape closes, Tab stays inside the overlay, and focus goes back to the slide's zoom button. Button names come
    // from the page's .mdp-strings (mdpText), so every language gets its own.
    const expandSvg = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    const arrowSvg = (d) => '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="' + d + '"/></svg>';
    let lbGroup = [];          // the images previous and next step through (one image: no stepping)
    let lbIndex = 0;
    let lbOpener = null;       // what had focus before the overlay opened
    let lbSwiped = false;

    function lbCaptionOf(img) {
        const slide = img.closest('.mdp-carousel__slide');
        const fig = img.closest('figure');
        const cap = slide ? slide.querySelector('.mdp-carousel__caption') : (fig ? fig.querySelector('figcaption') : null);
        return cap ? cap.innerHTML.trim() : '';
    }
    function lbShow(i) {
        const overlay = document.getElementById('lightbox');
        if (!overlay || !lbGroup.length) return;
        lbIndex = (i + lbGroup.length) % lbGroup.length;
        const img = lbGroup[lbIndex];
        const lbImg = overlay.querySelector('.lightbox-figure img');
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        const cap = lbCaptionOf(img);
        const fc = overlay.querySelector('.lightbox-caption');
        fc.innerHTML = cap;
        fc.hidden = !cap;
        overlay.classList.toggle('has-caption', !!cap);
        overlay.classList.toggle('has-nav', lbGroup.length > 1);
    }
    function lbOpen(img) {
        const overlay = document.getElementById('lightbox');
        if (!overlay) return;
        const car = img.closest('.mdp-carousel');
        lbGroup = car ? Array.from(car.querySelectorAll('.mdp-carousel__slide img[data-zoomable]')) : [img];
        if (lbGroup.indexOf(img) < 0) lbGroup = [img];
        lbOpener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        overlay.classList.remove('open-svg');
        lbShow(lbGroup.indexOf(img));
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        overlay.querySelector('.lightbox-close').focus({ preventScroll: true });
    }

    // Wrap every [data-zoomable] image with a container + expand button
    document.querySelectorAll('img[data-zoomable]').forEach(img => {
        const wrap = document.createElement('div');
        wrap.className = 'zoomable-wrap';
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);

        const btn = document.createElement('button');
        btn.className = 'zoom-btn';
        btn.setAttribute('aria-label', mdpText('expand-image', 'Expand image'));
        btn.innerHTML = expandSvg;
        wrap.appendChild(btn);

        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); lbOpen(img); });
        img.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); lbOpen(img); });
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
        btn.setAttribute('aria-label', mdpText('expand-diagram', 'Expand diagram'));
        btn.innerHTML = expandSvg;
        wrap.appendChild(btn);

        function openLightbox() {
            const overlay = document.getElementById('lightbox');
            const lbSvgHost = overlay.querySelector('.lightbox-svg-host');
            lbGroup = [];
            lbOpener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
            overlay.classList.remove('has-nav', 'has-caption');
            // Hide the image and its caption, show the SVG host
            overlay.querySelector('.lightbox-figure').style.display = 'none';
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
            overlay.querySelector('.lightbox-close').focus({ preventScroll: true });
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
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', mdpText('image-viewer', 'Image viewer'));
        overlay.innerHTML = '<button type="button" class="lightbox-close" aria-label="' + mdpText('close', 'Close') + '"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
            '<button type="button" class="lightbox-nav lightbox-prev" aria-label="' + mdpText('prev-image', 'Previous image') + '">' + arrowSvg('15 18 9 12 15 6') + '</button>' +
            '<figure class="lightbox-figure"><img src="" alt=""><figcaption class="lightbox-caption" hidden></figcaption></figure>' +
            '<div class="lightbox-svg-host" style="display:none;"></div>' +
            '<button type="button" class="lightbox-nav lightbox-next" aria-label="' + mdpText('next-image', 'Next image') + '">' + arrowSvg('9 18 15 12 9 6') + '</button>';
        document.body.appendChild(overlay);

        function closeLightbox() {
            if (!overlay.classList.contains('open')) return;
            overlay.classList.remove('open');
            overlay.classList.remove('open-svg');
            document.body.style.overflow = '';
            // Reset display states for next open
            const lbSvgHost = overlay.querySelector('.lightbox-svg-host');
            overlay.querySelector('.lightbox-figure').style.display = '';
            lbSvgHost.style.display = 'none';
            lbSvgHost.innerHTML = '';
            // A carousel stays on the slide last shown, and its zoom button gets the focus back.
            let back = lbOpener;
            const img = lbGroup[lbIndex];
            const car = img && lbGroup.length > 1 ? img.closest('.mdp-carousel') : null;
            if (car) {
                const slides = Array.from(car.querySelectorAll('.mdp-carousel__slide'));
                const dot = car.querySelector('.mdp-carousel__dot[data-index="' + slides.indexOf(img.closest('.mdp-carousel__slide')) + '"]');
                if (dot) dot.click();
                back = img.parentNode.querySelector('.zoom-btn') || car;
            }
            lbGroup = [];
            if (back && back.focus) setTimeout(() => back.focus({ preventScroll: true }), 30);
        }
        const step = (d) => { if (lbGroup.length > 1) lbShow(lbIndex + d); };

        overlay.addEventListener('click', () => { if (lbSwiped) { lbSwiped = false; return; } closeLightbox(); });
        overlay.querySelector('.lightbox-close').addEventListener('click', e => { e.stopPropagation(); closeLightbox(); });
        overlay.querySelector('.lightbox-prev').addEventListener('click', e => { e.stopPropagation(); step(-1); });
        overlay.querySelector('.lightbox-next').addEventListener('click', e => { e.stopPropagation(); step(1); });
        overlay.querySelector('.lightbox-figure').addEventListener('click', e => e.stopPropagation());
        overlay.querySelector('.lightbox-svg-host').addEventListener('click', e => e.stopPropagation());

        // Swipe on touch screens: left for next, right for previous.
        let tx = null, ty = null;
        overlay.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) { tx = null; return; }
            tx = e.touches[0].clientX; ty = e.touches[0].clientY;
        }, { passive: true });
        overlay.addEventListener('touchend', e => {
            if (tx === null || lbGroup.length < 2) return;
            const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
            tx = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                lbSwiped = true;
                setTimeout(() => { lbSwiped = false; }, 400);
                step(dx < 0 ? 1 : -1);
            }
        });

        document.addEventListener('keydown', e => {
            if (!overlay.classList.contains('open')) return;
            if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (lbGroup.length > 1) { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
                return;
            }
            if (e.key === 'Tab') {
                // Focus stays inside: the buttons that show, then any link in the caption.
                const all = Array.from(overlay.querySelectorAll('button, a[href]')).filter((el) => el.offsetParent !== null || el === document.activeElement);
                if (!all.length) return;
                const first = all[0], last = all[all.length - 1];
                if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
                else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
    }

});

/* ── Live demo click tracking ───────────────────────────────────────────
 * The demo links point at an external Salesforce Experience site, so the
 * UTM params on them only help if that org reports on them. This fires a
 * GA4 event on OUR side so the click is counted regardless, and records
 * which page sent it. Delegated, so it covers links added later.
 * ------------------------------------------------------------------- */
document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="orgfarm-71fc21cee4"]');
    if (!link) return;
    if (typeof gtag !== 'function') return;
    var src = '';
    try { src = new URL(link.href).searchParams.get('utm_content') || ''; } catch (err) { src = ''; }
    gtag('event', 'live_demo_click', {
        source_page: src || location.pathname,
        link_text: (link.textContent || '').trim().slice(0, 60)
    });
});
