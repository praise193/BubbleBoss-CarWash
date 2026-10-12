
(function () {
  'use strict';

  var els = {
    wrap: document.getElementById('bkWrap'),
    loading: document.getElementById('bkLoading'),
    monthLabel: document.getElementById('monthLabel'),
    prev: document.getElementById('prevMonth'),
    next: document.getElementById('nextMonth'),
    cal: document.getElementById('cal'),
    chosenDate: document.getElementById('chosenDate'),
    times: document.getElementById('timeSlots'),
    hint: document.getElementById('timeHint'),
    form: document.getElementById('bookForm'),
    service: document.getElementById('service'),
    alert: document.getElementById('formAlert'),
    submit: document.getElementById('bookBtn'),
    formPanel: document.getElementById('formPanel'),
    done: document.getElementById('donePanel')
  };

  var state = { info: null, view: null, date: null, time: null, slots: [] };

  BB.requireLogin().then(function (user) {
    return BB.api('info.php').then(function (info) {
      state.info = info;
      var today = BB.parseDate(info.today);
      state.today = today;
      state.max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + info.maxDaysAhead);
      state.view = new Date(today.getFullYear(), today.getMonth(), 1);

      els.service.innerHTML = info.services.map(function (s) {
        return '<option value="' + BB.esc(s.key) + '">' + BB.esc(s.name) + ' - ' + BB.fmtMoney(s.price) + '</option>';
      }).join('');
      
      var pre = new URLSearchParams(location.search).get('service');
      if (pre && info.services.some(function (s) { return s.key === pre; })) els.service.value = pre;

      els.loading.hidden = true;
      els.wrap.hidden = false;
      renderCalendar();
    });
  }).catch(function (err) {
    els.loading.textContent = err.message || 'Could not load the booking page.';
  });

  
  function isOff(d) {
    var day = d.getDay();
    return d < state.today || d > state.max || day === 0 || day === 6 ||
      state.info.closedDates.indexOf(BB.dateStr(d)) !== -1;
  }

  function renderCalendar() {
    var y = state.view.getFullYear(), m = state.view.getMonth();
    els.monthLabel.textContent = state.view.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

    els.prev.disabled = y === state.today.getFullYear() && m === state.today.getMonth();
    els.next.disabled = new Date(y, m + 1, 1) > state.max;

    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var html = '';
    for (var i = 0; i < first; i++) html += '<div class="bk-blank"></div>';
    for (var d = 1; d <= days; d++) {
      var date = new Date(y, m, d);
      var str = BB.dateStr(date);
      var cls = 'bk-day';
      var off = isOff(date);
      if (off) cls += ' off';
      if (str === state.info.today) cls += ' today';
      if (str === state.date) cls += ' sel';
      html += '<button type="button" class="' + cls + '" data-date="' + str + '"' +
        (off ? ' disabled aria-disabled="true"' : '') + '>' + d + '</button>';
    }
    els.cal.innerHTML = html;
  }

  els.cal.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-day');
    if (!b || b.disabled) return;
    state.date = b.getAttribute('data-date');
    state.time = null;
    renderCalendar();
    loadSlots();
  });
  els.prev.addEventListener('click', function () { state.view.setMonth(state.view.getMonth() - 1); renderCalendar(); });
  els.next.addEventListener('click', function () { state.view.setMonth(state.view.getMonth() + 1); renderCalendar(); });

  function loadSlots() {
    els.chosenDate.textContent = BB.fmtDate(state.date);
    els.times.innerHTML = '';
    els.hint.textContent = 'Loading times...';
    var asked = state.date;
    return BB.api('slots.php?date=' + encodeURIComponent(asked)).then(function (d) {
      if (asked !== state.date) return;
      if (!d.open) { els.hint.textContent = d.reason; return; }
      state.slots = d.slots;
      els.hint.textContent = 'Each slot is one hour and takes up to ' + d.capacity + ' cars.';
      renderSlots();
    }).catch(function (err) { els.hint.textContent = err.message; });
  }

  function renderSlots() {
    els.times.innerHTML = state.slots.map(function (s) {
      var label, cls = 'bk-time';
      if (s.past) label = 'Passed';
      else if (s.full) label = 'Full';
      else label = s.remaining + (s.remaining === 1 ? ' space left' : ' spaces left');
      if (s.available && s.remaining <= 2) cls += ' low';
      if (s.time === state.time) cls += ' sel';
      return '<button type="button" class="' + cls + '" data-time="' + s.time + '"' +
        (s.available ? '' : ' disabled') + '>' + s.time + '<small>' + label + '</small></button>';
    }).join('');
  }

  els.times.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-time');
    if (!b || b.disabled) return;
    state.time = b.getAttribute('data-time');
    renderSlots();
  });

  els.form.elements.plate.addEventListener('input', function (e) {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9 \-]/g, '');
  });

  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    BB.hideAlert(els.alert);

    var model = els.form.elements.carMakeModel.value.trim();
    var plate = els.form.elements.plate.value.replace(/[\s\-]+/g, '').toUpperCase();
    var f = {};
    if (model.length < 2) f.carMakeModel = 'Enter the car make and model, e.g. Toyota Corolla.';
    if (!/^[A-Z0-9]{2,12}$/.test(plate)) f.plate = 'Enter a valid number plate.';
    BB.showFieldErrors(els.form, f);

    if (!state.date || !state.time) {
      BB.showAlert(els.alert, 'error', 'Choose a date and a time slot first.');
      return;
    }
    if (Object.keys(f).length) return;

    var svc = state.info.services.filter(function (s) { return s.key === els.service.value; })[0];

    BB.dialog({
      title: 'Confirm your booking',
      message: 'Please check the details below.',
      details: [
        ['Date', BB.fmtDate(state.date)],
        ['Time', BB.fmtTime(state.time)],
        ['Package', svc.name],
        ['Car', model],
        ['Number plate', plate],
        ['Price', BB.fmtMoney(svc.price)]
      ],
      confirmText: 'Confirm booking',
      cancelText: 'Go back'
    }).then(function (ok) {
      if (!ok) return;
      els.submit.disabled = true;
      els.submit.textContent = 'Booking...';
      return BB.api('book.php', {
        method: 'POST',
        body: { date: state.date, time: state.time, service: svc.key, carMakeModel: model, plate: plate }
      }).then(function (d) {
        showDone(d.booking);
      }).catch(function (err) {
        BB.showFieldErrors(els.form, err.fields);
        BB.showAlert(els.alert, 'error', err.message);
        if (err.status === 401) { BB.go('login.html?next=bookings.html'); return; }
        if (err.status === 409 || err.status === 422) { state.time = null; loadSlots(); } 
      }).then(function () {
        els.submit.disabled = false;
        els.submit.textContent = 'Confirm Booking';
      });
    });
  });

  function showDone(b) {
    els.formPanel.hidden = true;
    els.done.hidden = false;
    els.done.innerHTML =
      '<div class="bk-success"><div class="bb-tick"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h3>You\'re booked in!</h3>' +
      '<p>' + BB.esc(BB.fmtDate(b.date)) + '<br>' + BB.esc(BB.fmtTime(b.time)) + '<br>' +
      BB.esc(b.service) + ' (' + BB.fmtMoney(b.price) + ')<br>' +
      BB.esc(b.carMakeModel) + ' - ' + BB.esc(b.plate) + '</p>' +
      '<a class="bb-btn" href="dashboard.html">View my dashboard</a>' +
      '<button type="button" class="bb-btn ghost" id="again">Book another slot</button></div>';
    document.getElementById('again').addEventListener('click', function () {
      els.done.hidden = true;
      els.formPanel.hidden = false;
      els.form.elements.carMakeModel.value = '';
      els.form.elements.plate.value = '';
      state.time = null;
      loadSlots();
    });
    BB.toast('Booking confirmed');
    loadSlots();
  }
})();
