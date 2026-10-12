
(function () {
  'use strict';

  var root = document.getElementById('dash');
  var loading = document.getElementById('dashLoading');

  BB.requireLogin().then(function (user) {
    document.getElementById('welcome').textContent = 'Hi, ' + user.name;
    document.getElementById('acctName').textContent = user.name + ' ' + user.surname;
    document.getElementById('acctEmail').textContent = user.email;
    document.getElementById('acctPhone').textContent = user.phone;
    document.getElementById('acctSince').textContent = BB.fmtDate(user.since);
    return load();
  }).then(function () {
    loading.hidden = true;
    root.hidden = false;
  }).catch(function (err) {
    loading.textContent = err.message || 'Could not load your dashboard.';
  });

  function load() {
    return BB.api('bookings.php').then(function (d) {
      render(d.upcoming, d.past);
    });
  }

  function item(b, cancellable) {
    var tag = b.status === 'cancelled' ? '<span class="tag cancelled">Cancelled</span>'
      : (cancellable ? '' : '<span class="tag done">Completed</span>');
    return '<div class="bk-item' + (b.status === 'cancelled' ? ' is-cancelled' : '') + '">' +
      '<div><div class="when">' + BB.esc(BB.fmtDate(b.date)) + tag + '</div>' +
      '<div class="meta">' + BB.esc(BB.fmtTime(b.time)) + ' &middot; ' + BB.esc(b.service) + '<br>' +
      BB.esc(b.carMakeModel) + ' &middot; ' + BB.esc(b.plate) + '</div></div>' +
      '<div class="side"><div class="price">' + BB.fmtMoney(b.price) + '</div>' +
      (cancellable ? '<button type="button" class="bb-btn danger small" data-cancel="' + b.id + '">Cancel</button>' : '') +
      '</div></div>';
  }

  function render(upcoming, past) {
    var done = past.filter(function (b) { return b.status === 'confirmed'; }).length;
    document.getElementById('statUpcoming').textContent = upcoming.length;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statNext').textContent = upcoming.length
      ? BB.parseDate(upcoming[0].date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ', ' + upcoming[0].time
      : 'None yet';

    document.getElementById('upcomingList').innerHTML = upcoming.length
      ? upcoming.map(function (b) { return item(b, true); }).join('')
      : '<div class="empty">No upcoming washes.<br><a class="bb-btn auto" href="bookings.html">Book a slot</a></div>';

    document.getElementById('pastList').innerHTML = past.length
      ? past.map(function (b) { return item(b, false); }).join('')
      : '<div class="empty">Your past washes will show up here.</div>';
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-cancel'));
    BB.dialog({
      title: 'Cancel this booking?',
      message: 'The slot will be freed up for other customers.',
      confirmText: 'Yes, cancel it',
      cancelText: 'Keep booking',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      btn.disabled = true;
      return BB.api('cancel.php', { method: 'POST', body: { id: id } })
        .then(function () { BB.toast('Booking cancelled'); return load(); })
        .catch(function (err) { btn.disabled = false; BB.toast(err.message); });
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    BB.api('logout.php', { method: 'POST' }).catch(function () {}).then(function () { BB.go('home.html'); });
  });
})();
