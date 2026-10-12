
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseDate(str) { 
    var p = str.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function fmtDate(str) {
    return parseDate(str).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtTime(t) { 
    var h = parseInt(t.slice(0, 2), 10) + 1;
    return t + ' - ' + String(h).padStart(2, '0') + t.slice(2);
  }
  function fmtMoney(n) { return 'R' + Number(n).toFixed(2); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  
  function api(path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch' }
    };
    if (opts.body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch('api/' + path, init).catch(function () {
      throw { status: 0, message: 'Cannot reach the server. Make sure MAMP is running and you opened the site through http://localhost:8888/.' };
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (e) 
        if (!data) {
          throw { status: res.status, message: 'The server sent an unexpected response. Is PHP running? (Open this page through MAMP, not Live Server or a file.)' };
        }
        if (!res.ok || data.ok === false) {
          throw { status: res.status, message: data.error || 'Something went wrong. Please try again.', fields: data.fields || {} };
        }
        return data;
      });
    });
  }

  var userPromise = null;
  function getUser(force) {
    if (!userPromise || force) {
      userPromise = api('me.php').then(function (d) { return d.loggedIn ? d.user : null; })
        .catch(function () { return null; });
    }
    return userPromise;
  }

  function requireLogin() {
    return getUser().then(function (user) {
      if (!user) {
        var here = location.pathname.split('/').pop() || 'home.html';
        go('login.html?next=' + encodeURIComponent(here));
        return new Promise(function () {}); 
      }
      return user;
    });
  }

  function go(url) {
    document.body.classList.add('page-leave');
    setTimeout(function () { location.href = url; }, 220);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    go(a.href);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.body.classList.remove('page-leave');
  });

  var TICK = '<div class="bb-tick"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>';

  function dialog(o) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'bb-overlay';
      var rows = (o.details || []).map(function (r) {
        return '<div><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>';
      }).join('');
      overlay.innerHTML =
        '<div class="bb-dialog" role="dialog" aria-modal="true" aria-labelledby="bbDlgTitle">' +
        (o.success ? TICK : '') +
        '<h3 id="bbDlgTitle">' + esc(o.title) + '</h3>' +
        (o.message ? '<p>' + esc(o.message) + '</p>' : '') +
        (rows ? '<div class="details">' + rows + '</div>' : '') +
        (o.autoCloseMs ? '<div class="bb-progress"><i></i></div>' : '') +
        '<div class="actions">' +
        (o.cancelText ? '<button type="button" class="bb-btn ghost" data-act="no">' + esc(o.cancelText) + '</button>' : '') +
        '<button type="button" class="bb-btn' + (o.danger ? ' navy' : '') + '" data-act="yes">' + esc(o.confirmText || 'OK') + '</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('show'); });

      var previous = document.activeElement;
      var timer = null;
      function close(result) {
        clearTimeout(timer);
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('show');
        setTimeout(function () { overlay.remove(); }, 200);
        if (previous && previous.focus) previous.focus();
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape' && o.cancelText) close(false);
        if (e.key === 'Tab') {
          var btns = overlay.querySelectorAll('button');
          var first = btns[0], last = btns[btns.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey);
      overlay.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'yes') close(true);
        else if (act === 'no' || (e.target === overlay && o.cancelText)) close(false);
      });
      overlay.querySelector('[data-act="yes"]').focus();

      if (o.autoCloseMs) {
        var bar = overlay.querySelector('.bb-progress i');
        bar.style.transition = 'width ' + o.autoCloseMs + 'ms linear';
        requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = '100%'; }); });
        timer = setTimeout(function () { close(true); }, o.autoCloseMs);
      }
    });
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'bb-toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  function showFieldErrors(form, fields) {
    form.querySelectorAll('.bb-field').forEach(function (f) { f.classList.remove('invalid'); });
    Object.keys(fields || {}).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input) return;
      var wrap = input.closest('.bb-field');
      if (!wrap) return;
      wrap.classList.add('invalid');
      var err = wrap.querySelector('.err');
      if (err) err.textContent = fields[name];
    });
    var firstBad = form.querySelector('.bb-field.invalid input, .bb-field.invalid select, .bb-field.invalid textarea');
    if (firstBad) firstBad.focus();
  }
  function showAlert(el, type, msg) {
    el.className = 'bb-alert ' + type + ' show';
    el.textContent = msg;
  }
  function hideAlert(el) { el.className = 'bb-alert'; el.textContent = ''; }
  function safeNext() { 
    var n = new URLSearchParams(location.search).get('next') || '';
    return /^[A-Za-z0-9_\-]+\.html$/.test(n) ? n : '';
  }

  function buildNav() {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;

    var file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    nav.querySelectorAll('a').forEach(function (a) {
      if ((a.getAttribute('href') || '').toLowerCase() === file) a.classList.add('active');
    });

    getUser().then(function (user) {
      var sep = '<span class="nav-sep" aria-hidden="true"></span>';
      var html = user
        ? sep + '<a href="dashboard.html"' + (file === 'dashboard.html' ? ' class="active"' : '') + '>Dashboard</a>' +
          '<a href="#" id="navLogout">Log out</a>'
        : sep + '<a href="login.html"' + (file === 'login.html' ? ' class="active"' : '') + '>Login</a>' +
          '<a href="register.html" class="nav-strong' + (file === 'register.html' ? ' active' : '') + '">Register</a>';
      nav.insertAdjacentHTML('beforeend', html);

      var out = document.getElementById('navLogout');
      if (out) out.addEventListener('click', function (e) {
        e.preventDefault();
        api('logout.php', { method: 'POST' }).catch(function () {}).then(function () {
          userPromise = null;
          go('home.html');
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', buildNav);

  window.BB = {
    api: api, getUser: getUser, requireLogin: requireLogin, go: go,
    dialog: dialog, toast: toast,
    esc: esc, parseDate: parseDate, fmtDate: fmtDate, fmtTime: fmtTime, fmtMoney: fmtMoney, dateStr: dateStr,
    showFieldErrors: showFieldErrors, showAlert: showAlert, hideAlert: hideAlert, safeNext: safeNext
  };
})();
