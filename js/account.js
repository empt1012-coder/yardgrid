/* Sign-in and Bloom & Bed Plus. The planner still works when this is signed out. */
(function () {
  var TOKEN = 'yardgrid-auth';
  var PENDING_KEY = 'yardgrid-pending-plus';
  var SIGNUP_KEY = 'yardgrid-signup-email';
  var HASH_KEY = 'yardgrid-identity-hash';
  var PENDING_MS = 60 * 60 * 1000;
  var justConfirmed = false;
  function $(id) { return document.getElementById(id); }
  function on(id, event, fn) {
    var el = $(id);
    if (el) el.addEventListener(event, fn);
  }
  function isPlusPage() {
    var path = location.pathname || '';
    return /(?:^|\/)plus\.html$/.test(path);
  }
  function auth() {
    try { return JSON.parse(localStorage.getItem(TOKEN) || 'null'); }
    catch (e) { return null; }
  }
  function saveAuth(data, email) {
    localStorage.setItem(TOKEN, JSON.stringify({
      token: data.access_token, refresh: data.refresh_token || '', email: email || (auth() && auth().email) || ''
    }));
  }
  function clearAuth() { localStorage.removeItem(TOKEN); }
  function savePendingPlan(plan) {
    if (plan !== 'month' && plan !== 'year') return;
    try { localStorage.setItem(PENDING_KEY, JSON.stringify({ plan: plan, at: Date.now() })); }
    catch (e) {}
  }
  function clearPendingPlan() {
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
  }
  function readPendingPlan() {
    try {
      var raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return '';
      var data = JSON.parse(raw);
      if (!data || (data.plan !== 'month' && data.plan !== 'year') || typeof data.at !== 'number' || (Date.now() - data.at) > PENDING_MS) {
        clearPendingPlan();
        return '';
      }
      return data.plan;
    } catch (e) {
      clearPendingPlan();
      return '';
    }
  }
  function lastSignupEmail() {
    try { return (localStorage.getItem(SIGNUP_KEY) || '').trim(); }
    catch (e) { return ''; }
  }
  function rememberSignupEmail(email) {
    try { localStorage.setItem(SIGNUP_KEY, email); } catch (e) {}
  }
  function decodePart(value, plusAsPlus) {
    var encoded = plusAsPlus ? String(value || '').replace(/\+/g, '%2B') : String(value || '').replace(/\+/g, '%20');
    try { return decodeURIComponent(encoded); }
    catch (e) { return value; }
  }
  function parsePairs(raw) {
    var out = {};
    String(raw || '').replace(/^[#?]/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = decodePart(i < 0 ? pair : pair.slice(0, i), false);
      var v = i < 0 ? '' : decodePart(pair.slice(i + 1), true);
      if (k && out[k] == null) out[k] = v;
    });
    return out;
  }
  function authParams() {
    var out = {};
    function merge(raw) {
      var parsed = parsePairs(raw);
      Object.keys(parsed).forEach(function (k) {
        if (out[k] == null) out[k] = parsed[k];
      });
    }
    merge(location.hash);
    merge(location.search);
    try { merge(sessionStorage.getItem(HASH_KEY) || ''); } catch (e) {}
    var path = location.pathname || '';
    if (path.indexOf('%23') !== -1 || path.indexOf('confirmation_token') !== -1 || path.indexOf('invite_token') !== -1) {
      var recovered = path.replace(/^\/+/, '');
      try { recovered = decodeURIComponent(recovered); } catch (e) {}
      merge(recovered);
    }
    return out;
  }
  function clearStoredHash() {
    try { sessionStorage.removeItem(HASH_KEY); } catch (e) {}
  }
  function authHeaders(json) {
    var a = auth();
    var headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (a && a.token) headers.Authorization = 'Bearer ' + a.token;
    return headers;
  }
  async function identity(path, options) {
    var res = await fetch('/.netlify/identity' + path, options);
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      var message = (data.msg || data.error_description || data.message || 'Sign-in is not available yet.');
      if (res.status === 404) message = data.msg || 'Accounts are not turned on yet.';
      var err = new Error(message);
      err.code = data.error || data.code;
      throw err;
    }
    return data;
  }
  async function api(path, options) {
    options = options || {};
    var res = await fetch(path, options);
    if (res.status === 401 && auth() && auth().refresh) {
      var refreshed = await identity('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(auth().refresh)
      }).catch(function () { return null; });
      if (refreshed && refreshed.access_token) {
        saveAuth(refreshed);
        options.headers = Object.assign({}, options.headers, authHeaders(false));
        res = await fetch(path, options);
      }
    }
    var type = res.headers.get('content-type') || '';
    if (type.indexOf('application/json') !== -1) {
      var body = await res.json();
      if (!res.ok) throw new Error(body.error || 'The request failed.');
      return body;
    }
    if (!res.ok) throw new Error('The request failed.');
    return res;
  }
  function status(text) {
    var el = $('accountStatus');
    if (el) el.textContent = text;
  }
  function showStoredError() {
    try {
      var message = sessionStorage.getItem('yardgrid-auth-error');
      if (!message) return;
      sessionStorage.removeItem('yardgrid-auth-error');
      status(message);
    } catch (e) {}
  }
  function showPlusMember(isPlus) {
    if ($('plusBuy')) $('plusBuy').hidden = !!isPlus;
    else {
      /* The planner has the buttons without the plus.html wrappers. A member should not see buy buttons. */
      if ($('plusMonthly')) $('plusMonthly').hidden = !!isPlus;
      if ($('plusYearly')) $('plusYearly').hidden = !!isPlus;
    }
    if ($('plusManage')) $('plusManage').hidden = !isPlus;
  }
  function userEmail(data) {
    return (data && (data.email || (data.user && data.user.email))) || '';
  }
  function unconfirmedMessage(err) {
    var text = ((err && err.message) || '') + ' ' + ((err && err.code) || '');
    return /not confirm|not verif|email_not_confirmed|unconfirm/i.test(text);
  }
  async function consumeIdentityHash() {
    var params = authParams();
    var confirmation = params.confirmation_token;
    var invite = params.invite_token;
    var access = params.access_token;
    var refresh = params.refresh_token;
    var hashError = params.error_description || params.error;
    if (!confirmation && !invite && !access && !hashError) return false;
    history.replaceState(null, '', location.pathname + location.search);
    clearStoredHash();
    if (hashError) throw new Error(hashError);
    if (confirmation || invite) {
      var data = await identity('/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: confirmation ? 'signup' : 'invite', token: confirmation || invite })
      });
      if (data.access_token) {
        saveAuth(data, userEmail(data));
        justConfirmed = true;
      }
      return true;
    }
    if (access) {
      saveAuth({ access_token: access, refresh_token: refresh || '' }, params.email || '');
      justConfirmed = true;
      return true;
    }
    return false;
  }
  async function refreshStatus() {
    if (!auth()) {
      if ($('accountBox') && !justConfirmed) status('Free. One garden plan and one arrangement stay in this browser.');
      if ($('accountSignedIn')) $('accountSignedIn').hidden = true;
      if ($('accountSignedOut') && $('accountBox')) $('accountSignedOut').hidden = false;
      showPlusMember(false);
      return null;
    }
    if ($('accountSignedOut')) $('accountSignedOut').hidden = true;
    if ($('accountSignedIn')) $('accountSignedIn').hidden = false;
    try {
      var me = await api('/api/me', { headers: authHeaders(false) });
      if ($('accountEmail')) $('accountEmail').textContent = me.email || auth().email || '';
      if (justConfirmed) status("Email confirmed. You're signed in.");
      else status(me.plus
        ? 'Bloom & Bed Plus is on. Saves in your account open on any device.'
        : 'Signed in. Plus adds cloud save. The tools stay free either way.');
      if ($('cloudSave')) $('cloudSave').disabled = !me.plus;
      showPlusMember(!!me.plus);
      if ($('cloudList')) {
        var list = await api('/api/gardens', { headers: authHeaders(false) });
        renderCloud(list.gardens || []);
      }
      return me;
    } catch (err) {
      if (justConfirmed) status("Email confirmed. You're signed in.");
      else status(err.message);
      return justConfirmed ? { plus: false } : null;
    }
  }
  function renderCloud(items) {
    var box = $('cloudList');
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<p class="muted">Nothing is in your account yet.</p>';
      return;
    }
    box.innerHTML = items.map(function (item) {
      var kind = item.kind === 'arrangement' ? 'Arrangement' : 'Garden plan';
      return '<div class="row"><span><strong>' + kind + '</strong><br>' + escapeText(item.name) + '</span>' +
        '<button type="button" data-open="' + escapeText(item.id) + '">Open</button>' +
        '<button type="button" data-share="' + escapeText(item.shareToken) + '">Copy link</button></div>';
    }).join('');
  }
  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  async function uploadBlob(blob) {
    var res = await api('/api/files', {
      method: 'POST',
      headers: Object.assign(authHeaders(false), { 'Content-Type': blob.type || 'application/octet-stream' }),
      body: blob
    });
    return res.fileId;
  }
  async function saveToAccount() {
    var bridge = window.YardBridge;
    if (!bridge) return;
    status('Saving to your account…');
    var described = bridge.describe();
    var photo = await bridge.photoBlob();
    described.photoId = photo ? await uploadBlob(photo) : '';
    var stamps = await bridge.stampBlobs();
    described.stamps = [];
    for (var i = 0; i < stamps.length; i++) {
      described.stamps.push({ id: stamps[i].id, fileId: await uploadBlob(stamps[i].blob) });
    }
    var saved = await api('/api/gardens', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(described)
    });
    bridge.rememberCloud(saved.garden.id);
    status('Saved to your account.');
    refreshStatus();
  }
  async function openCloud(id) {
    var record = await api('/api/gardens/' + encodeURIComponent(id), { headers: authHeaders(false) });
    await window.YardBridge.applyCloud(record.garden, false);
    status(record.plus ? 'Opened from your account.' : 'Opened. Plus has ended, so this copy is read-only in the account. Export keeps a file.');
  }
  function askToSignIn() {
    status('Sign in or create an account. Checkout will continue after that.');
    if ($('accountBox')) $('accountBox').open = true;
    if ($('accountSignedOut')) $('accountSignedOut').hidden = false;
    if ($('accountEmailInput')) $('accountEmailInput').focus();
  }
  function startCheckout(plan) {
    if (plan === 'month' || plan === 'year') savePendingPlan(plan);
    var chosen = (plan === 'month' || plan === 'year') ? plan : readPendingPlan();
    if (!chosen) return;
    if (!auth()) { askToSignIn(); return; }
    status('Opening checkout…');
    clearPendingPlan();
    api('/api/checkout', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ plan: chosen }) })
      .then(function (data) { location.href = data.url; })
      .catch(function (err) {
        savePendingPlan(chosen);
        status(err.message);
      });
  }
  function startPortal() {
    api('/api/portal', { method: 'POST', headers: authHeaders(true), body: '{}' })
      .then(function (data) { location.href = data.url; })
      .catch(function (err) { status(err.message); });
  }
  function continuePendingCheckout(me) {
    var plan = readPendingPlan();
    if (!plan) return;
    if (!auth() || !me) return;
    if (me.plus) {
      clearPendingPlan();
      status('Bloom & Bed Plus is already on this account.');
      return;
    }
    if (!isPlusPage()) {
      location.replace('/plus.html');
      return;
    }
    startCheckout(plan);
  }
  function reportAuthError(err) {
    var message = err && err.message ? err.message : 'The confirmation link could not be used.';
    if (isPlusPage() || $('accountStatus')) {
      status(message);
      return;
    }
    try { sessionStorage.setItem('yardgrid-auth-error', message); } catch (e) {}
    location.replace('/plus.html');
  }
  function wire() {
    showStoredError();
    on('accountForm', 'submit', function (e) {
      e.preventDefault();
      var email = $('accountEmailInput').value.trim();
      var password = $('accountPasswordInput').value;
      var creating = $('accountMode').value === 'create';
      if (creating && lastSignupEmail() && lastSignupEmail().toLowerCase() === email.toLowerCase()) {
        status(readPendingPlan()
          ? "Check your email to confirm, then you'll go straight to checkout. A new email was not sent, so the earlier link still works."
          : 'Check the confirmation email we already sent. A new email was not sent, so the earlier link still works.');
        return;
      }
      var job = creating
        ? identity('/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) })
        : identity('/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=password&username=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password) });
      job.then(function (data) {
        if (creating && !data.access_token) {
          rememberSignupEmail(email);
          status(readPendingPlan()
            ? "Check your email to confirm, then you'll go straight to checkout."
            : 'Check your email to confirm the account, then sign in.');
          return;
        }
        saveAuth(data.access_token ? data : { access_token: data.token }, email);
        if (data.access_token) saveAuth(data, email);
        refreshStatus().then(continuePendingCheckout);
      }).catch(function (err) {
        if (unconfirmedMessage(err)) {
          status('This email is not confirmed yet. Open the confirmation link we already sent. Asking for a new email would make the earlier link stop working.');
          return;
        }
        status(err.message);
      });
    });
    on('accountSignOut', 'click', function () { clearAuth(); clearPendingPlan(); refreshStatus(); });
    on('cloudSave', 'click', function () { saveToAccount().catch(function (err) { status(err.message); }); });
    on('cloudList', 'click', function (e) {
      var open = e.target.getAttribute && e.target.getAttribute('data-open');
      var share = e.target.getAttribute && e.target.getAttribute('data-share');
      if (open) openCloud(open).catch(function (err) { status(err.message); });
      if (share) {
        var link = location.origin + '/plan.html?share=' + encodeURIComponent(share);
        navigator.clipboard.writeText(link).then(function () { status('View-only link copied.'); }, function () { status(link); });
      }
    });
    on('plusMonthly', 'click', function () { startCheckout('month'); });
    on('plusYearly', 'click', function () { startCheckout('year'); });
    on('plusPortal', 'click', startPortal);
    on('accountDelete', 'click', function () {
      if (!confirm('Delete the account and the gardens stored in it? This cannot be undone. A file you already exported stays on your device.')) return;
      api('/api/account', { method: 'DELETE', headers: authHeaders(false) })
        .then(function () { clearAuth(); clearPendingPlan(); refreshStatus(); status('The account and its cloud saves were deleted.'); })
        .catch(function (err) { status(err.message); });
    });
    consumeIdentityHash()
      .then(function () { return refreshStatus(); })
      .then(continuePendingCheckout)
      .catch(reportAuthError);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
