/* Cookie consent for multidatepick.com (privacy.html explains it to visitors).
 *
 * The page head (the consent:head block) already did the part that has to run first: Google
 * Consent Mode defaults to denied, a stored choice is applied, and first-touch attribution is only
 * written when "Where you came from" was accepted. This file shows the bar and the settings dialog
 * (their markup and text are in the page, in the consent:ui block, so every language carries its
 * own translation) and saves the visitor's choice.
 *
 * The choice: localStorage mdp_consent = { v, ts, analytics, attribution }. A different version
 * or a choice older than 12 months counts as no choice, so the bar asks again.
 */
(function () {
    'use strict';
    var KEY = 'mdp_consent', VERSION = 1, YEAR = 365 * 24 * 60 * 60 * 1000;

    function read() {
        try {
            var c = JSON.parse(localStorage.getItem(KEY));
            if (c && c.v === VERSION && Date.now() - c.ts < YEAR) return c;
        } catch (e) { /* storage blocked or bad JSON: no choice */ }
        return null;
    }

    function gtagSafe() { if (typeof window.gtag === 'function') window.gtag.apply(null, arguments); }

    // Delete Google Analytics cookies (_ga, _ga_<id>) on every domain form they may have been set on.
    function clearAnalyticsCookies() {
        var host = location.hostname, domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
        document.cookie.split(';').forEach(function (part) {
            var name = part.split('=')[0].trim();
            if (!/^_ga(_|$)|^_gid$|^_gat/.test(name)) return;
            domains.forEach(function (d) {
                document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
            });
        });
    }

    function save(analytics, attribution) {
        var c = { v: VERSION, ts: Date.now(), analytics: !!analytics, attribution: !!attribution };
        try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* the choice holds for this page only */ }
        window.mdpConsent = c;
        gtagSafe('consent', 'update', { analytics_storage: c.analytics ? 'granted' : 'denied' });
        if (!c.analytics) clearAnalyticsCookies();
        if (c.attribution) { if (typeof window.mdpFirstTouch === 'function') window.mdpFirstTouch(); }
        else { try { localStorage.removeItem('mdp_first_touch'); } catch (e) { /* nothing stored */ } }
        document.dispatchEvent(new CustomEvent('mdp-consent', { detail: c }));
        return c;
    }

    var CSS =
        '.mdp-cc-bar{position:fixed;left:16px;right:16px;bottom:12px;z-index:1000;max-width:1108px;margin:0 auto;background:#fff;border:1px solid #CBD5E1;border-radius:10px;' +
        'box-shadow:0 6px 20px rgba(15,23,42,.14);padding:8px 10px 8px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-family:var(--font,system-ui,sans-serif)}' +
        '.mdp-cc-bar[hidden]{display:none}' +
        '.mdp-cc-bar p{margin:0;flex:1 1 300px;min-width:0;color:#334155;font-size:.84rem;line-height:1.4}' +
        '.mdp-cc-bar a,.mdp-cc-dialog a{color:#0369A1;text-decoration:underline;text-underline-offset:2px}' +
        '.mdp-cc-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
        '.mdp-cc-btn{font:inherit;font-family:var(--font,system-ui,sans-serif);font-weight:600;font-size:.82rem;line-height:1.2;border-radius:999px;padding:7px 14px;cursor:pointer;' +
        'background:#0369A1;color:#fff;border:1px solid #0369A1;min-height:34px}' +
        '.mdp-cc-btn:hover{background:#0C4A6E;border-color:#0C4A6E}' +
        '.mdp-cc-btn--text{background:none;border-color:transparent;color:#0369A1;text-decoration:underline;text-underline-offset:3px;padding-inline:8px}' +
        '.mdp-cc-btn--text:hover{background:#F0F9FF;border-color:transparent;color:#0C4A6E}' +
        '.mdp-cc-btn--line{background:#fff;color:#0369A1}' +
        '.mdp-cc-btn--line:hover{background:#F0F9FF;color:#0C4A6E}' +
        '.mdp-cc-btn:focus-visible,.mdp-cc-dialog input:focus-visible+.mdp-cc-sw{outline:2px solid #0C4A6E;outline-offset:2px}' +
        '.mdp-cc-dialog{margin:auto;border:0;border-radius:14px;padding:0;width:min(520px,calc(100% - 32px));max-height:calc(100% - 32px);color:#1E293B;' +
        'box-shadow:0 20px 50px rgba(15,23,42,.25);font-family:var(--font,system-ui,sans-serif)}' +
        '.mdp-cc-dialog::backdrop{background:rgba(15,23,42,.45)}' +
        '.mdp-cc-in{padding:20px 22px;display:grid;gap:12px;position:relative}' +
        '.mdp-cc-dialog h2{margin:0;padding-right:36px;font-size:1.15rem;color:#0C4A6E}' +
        '.mdp-cc-intro{margin:0;color:#334155;font-size:.88rem;line-height:1.5}' +
        '.mdp-cc-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;background:none;color:#334155;font-size:1.4rem;line-height:1;cursor:pointer}' +
        '.mdp-cc-x:hover{background:#F1F5F9}.mdp-cc-x:focus-visible{outline:2px solid #0C4A6E;outline-offset:2px}' +
        '.mdp-cc-opt{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 14px;padding:12px 0;border-top:1px solid #E2E8F0;align-items:center}' +
        '.mdp-cc-opt label,.mdp-cc-opt .mdp-cc-name{font-weight:700;font-size:.93rem;color:#1E293B;cursor:pointer}' +
        '.mdp-cc-opt .mdp-cc-name{cursor:default}' +
        '.mdp-cc-desc{grid-column:1;color:#475569;font-size:.85rem;line-height:1.45}' +
        '.mdp-cc-ctl{grid-column:2;grid-row:1/span 2;position:relative;display:inline-flex}' +
        '.mdp-cc-ctl input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}' +
        '.mdp-cc-sw{display:block;width:44px;height:26px;border-radius:999px;background:#64748B;position:relative;transition:background .15s}' +
        '.mdp-cc-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s}' +
        '.mdp-cc-ctl input:checked+.mdp-cc-sw{background:#0369A1}.mdp-cc-ctl input:checked+.mdp-cc-sw::after{left:21px}' +
        '.mdp-cc-always{grid-column:2;grid-row:1/span 2;font-size:.8rem;font-weight:600;color:#475569}' +
        '.mdp-cc-dialog .mdp-cc-btns{justify-content:flex-end;padding-top:4px}' +
        '.mdp-cc-dialog .mdp-cc-btn{font-size:.88rem;padding:8px 16px}' +
        'body.mdp-cc-open{padding-bottom:var(--mdp-cc-h,0px)}' +
        '@media (max-width:640px){.mdp-cc-bar{left:10px;right:10px;bottom:10px;margin-left:0;max-width:calc(100vw - 20px);flex-direction:column;align-items:stretch;gap:8px;padding:10px}' +
        '.mdp-cc-bar p{flex:none}.mdp-cc-wide{display:none}' +
        '.mdp-cc-bar .mdp-cc-btns{flex-direction:column-reverse;align-items:stretch;gap:6px}.mdp-cc-bar .mdp-cc-btn{width:100%;min-height:40px}' +
        '.mdp-cc-dialog .mdp-cc-btns{flex-direction:column-reverse;align-items:stretch}.mdp-cc-in{padding:18px 16px}}' +
        '@media (prefers-reduced-motion:reduce){.mdp-cc-sw,.mdp-cc-sw::after{transition:none}}';

    function init() {
        var bar = document.getElementById('mdpConsentBar');
        var dlg = document.getElementById('mdpConsentDialog');
        if (!bar || !dlg) return;
        var style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        var boxA = document.getElementById('mdpConsentAnalytics');
        var boxS = document.getElementById('mdpConsentAttribution');
        var opener = null;

        // While the bar shows, the page gets that much room at the bottom, so it never hides the
        // end of the page or its buttons. Padding at the end moves nothing above it (no layout shift).
        function fit() { document.body.style.setProperty('--mdp-cc-h', (bar.offsetHeight + 24) + 'px'); }
        var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
        function showBar() {
            bar.hidden = false;
            document.body.classList.add('mdp-cc-open');
            fit();
            if (ro) ro.observe(bar);
        }
        function hideBar() {
            var hadFocus = bar.contains(document.activeElement);
            bar.hidden = true;
            document.body.classList.remove('mdp-cc-open');
            if (ro) ro.disconnect();
            if (hadFocus) focusPage();
        }
        function focusPage() {
            var main = document.querySelector('main') || document.body;
            if (!main.hasAttribute('tabindex')) {
                main.setAttribute('tabindex', '-1');
                main.addEventListener('blur', function () { main.removeAttribute('tabindex'); }, { once: true });
            }
            main.focus({ preventScroll: true });
        }

        function openDialog(from) {
            var c = read();
            boxA.checked = !!(c && c.analytics);
            boxS.checked = !!(c && c.attribution);
            opener = from || document.activeElement;
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        }
        function closeDialog() {
            if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
        }
        // Escape closes the dialog natively (a cancel event, then close); every close returns focus.
        dlg.addEventListener('close', function () {
            var back = opener && document.contains(opener) && !(bar.hidden && bar.contains(opener)) ? opener : null;
            opener = null;
            if (back) back.focus(); else focusPage();
        });
        // A click on the dimmed backdrop (outside the dialog box) closes it too.
        dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDialog(); });

        function choose(analytics, attribution) {
            save(analytics, attribution);
            hideBar();
        }

        document.addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-mdp-consent]') : null;
            if (!t) return;
            var act = t.getAttribute('data-mdp-consent');
            if (act === 'open' || act === 'settings') { e.preventDefault(); openDialog(t); }
            else if (act === 'accept') choose(true, true);
            else if (act === 'reject') { if (dlg.open) closeDialog(); choose(false, false); }
            else if (act === 'save') { var a = boxA.checked, s = boxS.checked; closeDialog(); choose(a, s); }
            else if (act === 'close') closeDialog();
        });
        // The footer link is a real link to the privacy page (it works without script); with script
        // it opens the dialog, so screen readers hear it as a button.
        document.querySelectorAll('a[data-mdp-consent="open"]').forEach(function (a) { a.setAttribute('role', 'button'); });

        if (!read()) showBar();
        // The privacy page's "#cookie-settings" link target opens the dialog directly.
        if (location.hash === '#cookie-settings' && document.getElementById('cookie-settings')) openDialog(null);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
