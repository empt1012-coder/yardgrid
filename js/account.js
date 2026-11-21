/* Sign-in and Bloom & Bed Plus. The planner still works when this is signed out. */
(function () {
  var TOKEN = 'yardgrid-auth';
  var pendingPlan = '';
  function $(id) { return document.getElementById(id); }
  function on(id, event, fn) {
    var el = $(id);
    if (el) el.addEventListener(event, fn);
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
      if (res.status === 404) message = 'Accounts are not turned on yet.';
      throw new Error(message);
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
  function showPlusMember(isPlus) {
    if ($('plusBuy')) $('plusBuy').hidden = !!isPlus;
    if ($('plusManage')) $('plusManage').hidden = !isPlus;
  }
  async function refreshStatus() {
    if (!auth()) {
      if ($('accountBox')) status('Free. One garden plan and one arrangement stay in this browser.');
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
      status(me.plus
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
      status(err.message);
      return null;
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
    pendingPlan = plan || pendingPlan;
    if (!pendingPlan) return;
    if (!auth()) { askToSignIn(); return; }
    status('Opening checkout…');
    api('/api/checkout', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ plan: pendingPlan }) })
      .then(function (data) {
        pendingPlan = '';
        location.href = data.url;
      })
      .catch(function (err) { status(err.message); });
  }
  function startPortal() {
    api('/api/portal', { method: 'POST', headers: authHeaders(true), body: '{}' })
      .then(function (data) { location.href = data.url; })
      .catch(function (err) { status(err.message); });
  }
  function afterSignIn(me) {
    if (!pendingPlan) return;
    if (me && me.plus) {
      pendingPlan = '';
      status('Bloom & Bed Plus is already on this account.');
      return;
    }
    startCheckout(pendingPlan);
  }
  function wire() {
    on('accountForm', 'submit', function (e) {
      e.preventDefault();
      var email = $('accountEmailInput').value.trim();
      var password = $('accountPasswordInput').value;
      var creating = $('accountMode').value === 'create';
      var job = creating
        ? identity('/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) })
        : identity('/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=password&username=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password) });
      job.then(function (data) {
        if (creating && !data.access_token) {
          status('Check your email to confirm the account, then sign in.');
          return;
        }
        saveAuth(data.access_token ? data : { access_token: data.token }, email);
        if (data.access_token) saveAuth(data, email);
        refreshStatus().then(afterSignIn);
      }).catch(function (err) { status(err.message); });
    });
    on('accountSignOut', 'click', function () { clearAuth(); refreshStatus(); });
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
        .then(function () { clearAuth(); refreshStatus(); status('The account and its cloud saves were deleted.'); })
        .catch(function (err) { status(err.message); });
    });
    refreshStatus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
