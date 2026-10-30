/* ═══════════════════════════════════════════════════
   Config Library — Copy for Setup Wizard
   ═══════════════════════════════════════════════════ */

(function () {

    // Text from the page's hidden .mdp-strings block (translated with the page), else English.
    function text(key, fallback) { return window.mdpText ? window.mdpText(key, fallback) : fallback; }

    /* ── Toast ── */
    function showToast(title, message, duration) {
        let container = document.getElementById('mdp-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mdp-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'mdp-toast';
        toast.innerHTML =
            '<div class="mdp-toast-title">' + title + '</div>' +
            '<div class="mdp-toast-body">' + message + '</div>';
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, duration || 6000);
    }

    /*
     * Copy text that has to be FETCHED first. navigator.clipboard.writeText after an await has
     * lost the click's user activation, so Safari, Firefox and locked-down Chrome refused it and
     * every visitor on those saw "Copy Failed". ClipboardItem takes a PROMISE and is created
     * inside the click, so the write starts while the activation is still live. Older browsers
     * fall back to a hidden textarea and execCommand('copy').
     */
    function copyFetched(url) {
        var textP = fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            var item = new ClipboardItem({ 'text/plain': textP.then(function (t) { return new Blob([t], { type: 'text/plain' }); }) });
            return navigator.clipboard.write([item]).catch(function () { return textP.then(legacyCopy); });
        }
        return textP.then(function (t) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(t).catch(function () { return legacyCopy(t); });
            }
            return legacyCopy(t);
        });
    }
    function legacyCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        if (!ok) throw new Error('copy refused');
    }

    /* ── Copy for Setup Wizard ── */
    function handleCopyJson(e) {
        e.preventDefault();
        const card = e.target.closest('.config-card');
        const configFile = card.dataset.configFile;
        // Root-absolute: translated pages sit one folder down (/de/...), where a relative path
        // fetched a 404 page and still reported "Config Copied".
        const url = '/downloads/configs/' + configFile;
        copyFetched(url)
            .then(function () {
                showToast(text('copied-title', 'Config Copied'), text('copied-body',
                    'Open your Salesforce org and navigate to the <strong>MultiDatePick Setup</strong> app. ' +
                    'Go to the <strong>Import</strong> tab, paste it and save. Then type its Config Name wherever you place the component.'));
            })
            .catch(function () {
                const link = '<a href="' + url + '" target="_blank" rel="noopener">' + text('open-json', 'Open the JSON') + '</a>';
                showToast(text('failed-title', 'Copy Failed'),
                    text('failed-body', 'Your browser blocked clipboard access. {link} and copy it from there.').replace('{link}', link), 8000);
            });
    }

    /* ── Attach handlers (browser only) ── */
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('.btn-copy-json').forEach(function (btn) {
                btn.addEventListener('click', handleCopyJson);
            });
        });
    }

})();
