/* Lead forms (notify-me-at-launch, custom-config, and their translations): one submit, two destinations.
   1. Salesforce Web-to-Lead: the same fields the form posts on its own, form-encoded, sent with
      mode 'no-cors'. The reply is opaque to the page, which is fine: the lead is created either way.
      The form keeps its Web-to-Lead action, so a visitor without JavaScript still reaches Salesforce.
   2. An email to us through the form email service, whose JSON reply says whether it worked.
   When the email went out, the visitor goes to the form's retURL (the thank-you page in their
   language), as before. When it did not, the form's own .form-error line shows (translated with the
   page) and the button comes back for another try; a retry does not post the same lead to Salesforce twice.
   Page text comes from the page: mdpText('form-sending', ...) reads its hidden .mdp-strings block. */
(function () {
    var ENDPOINT = 'https://api.web3forms.com/submit';
    // A public key by design: it can only send to our own inbox.
    var KEY = 'eca6eb96-aa8d-491b-a0f9-83d6e0142296';
    var EMAIL_WAIT = 20000;   // ms before the email request counts as failed
    var SF_WAIT = 10000;      // ms to let the Salesforce post finish before leaving the page
    var LANG_NAMES = { en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian', 'pt-BR': 'Portuguese (Brazil)', ja: 'Japanese', 'zh-Hans': 'Chinese (Simplified)', hi: 'Hindi' };

    // A honeypot a person never sees: either one set means a bot, and nothing is sent anywhere.
    window.mdpLeadIsBot = function (form) {
        var hp = form.querySelector('#mdp_hp_field');
        var bot = form.querySelector('input[name="botcheck"]');
        return !!((hp && hp.value) || (bot && bot.checked));
    };

    // opts: { subject, replyTo, fields: [[English label, value], ...] }. Empty values are left out.
    window.mdpSendLead = function (form, opts) {
        if (form.mdpSending) return;
        form.mdpSending = true;
        var btn = form.querySelector('[type="submit"]');
        var err = form.querySelector('.form-error');
        var ret = form.querySelector('input[name="retURL"]');
        var label = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = (window.mdpText ? mdpText('form-sending', 'Sending...') : 'Sending...').replace(/<[^>]*>/g, '');
        }
        if (err) err.hidden = true;

        // 1. Salesforce: every field exactly as the form would post it (line breaks as CR LF, the way a
        // browser sends a form), never the email service's botcheck box.
        var sf = new URLSearchParams();
        new FormData(form).forEach(function (v, k) {
            if (typeof v === 'string' && k !== 'botcheck') sf.append(k, v.replace(/\r\n|\r|\n/g, '\r\n'));
        });
        var sfBody = sf.toString();
        var toSf = form.mdpSfSent === sfBody ? Promise.resolve() :
            fetch(form.getAttribute('action'), { method: 'POST', mode: 'no-cors', body: sfBody,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
                .then(function () { form.mdpSfSent = sfBody; }, function () {});

        // 2. The email: readable English labels, the visitor's answers as they typed them.
        var fd = new FormData();
        fd.append('access_key', KEY);
        fd.append('subject', opts.subject);
        fd.append('from_name', 'MultiDatePick website');
        if (opts.replyTo) fd.append('replyto', opts.replyTo);
        (opts.fields || []).forEach(function (f) { if (f[1]) fd.append(f[0], f[1]); });
        var lang = document.documentElement.lang || 'en';
        fd.append('Page language', LANG_NAMES[lang] || lang);
        fd.append('Page', location.origin + location.pathname);
        var ctl = window.AbortController ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctl) ctl.abort(); }, EMAIL_WAIT);
        var toMail = fetch(ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.success !== false; });
            })
            .catch(function () { return false; });
        var sfDone = Promise.race([toSf, new Promise(function (res) { setTimeout(res, SF_WAIT); })]);

        Promise.all([toMail, sfDone]).then(function (r) {
            clearTimeout(timer);
            if (r[0]) { location.href = ret && ret.value ? ret.value : '/'; return; }
            form.mdpSending = false;
            if (btn) { btn.disabled = false; btn.innerHTML = label; }
            if (err) {
                err.hidden = false;
                if (err.scrollIntoView) err.scrollIntoView({ block: 'nearest' });
            }
        });
    };
})();
