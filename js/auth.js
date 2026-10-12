
(function () {
  'use strict';

  var form = document.getElementById('authForm');
  if (!form) return;

  var mode = form.getAttribute('data-mode');
  var alertBox = document.getElementById('formAlert');
  var button = form.querySelector('button[type="submit"]');
  var next = BB.safeNext();

  BB.getUser().then(function (user) {
    if (user) BB.go(next || 'home.html');
  });

  if (next === 'bookings.html') {
    BB.showAlert(document.getElementById('nextNotice'), 'info',
      mode === 'register'
        ? 'Create an account to book a slot. It only takes a minute.'
        : 'Log in to book a slot.');
  }

  if (next) {
    document.querySelectorAll('[data-keep-next]').forEach(function (a) {
      a.href += '?next=' + encodeURIComponent(next);
    });
  }

  function value(name) { return form.elements[name].value; }

  function validateRegister() {
    var f = {};
    if (!value('name').trim()) f.name = 'Enter your first name.';
    if (!value('surname').trim()) f.surname = 'Enter your surname.';
    if (!/^\S+@\S+\.\S+$/.test(value('email').trim())) f.email = 'Enter a valid email address.';
    if (!/^\+?[0-9\s()\-]{7,20}$/.test(value('phone').trim())) f.phone = 'Enter a valid phone number.';
    if (value('password').length < 8) f.password = 'Use at least 8 characters.';
    if (value('password') !== value('confirm')) f.confirm = 'Passwords do not match.';
    return f;
  }
  function validateLogin() {
    var f = {};
    if (!/^\S+@\S+\.\S+$/.test(value('email').trim())) f.email = 'Enter a valid email address.';
    if (!value('password')) f.password = 'Enter your password.';
    return f;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    BB.hideAlert(alertBox);

    var problems = mode === 'register' ? validateRegister() : validateLogin();
    BB.showFieldErrors(form, problems);
    if (Object.keys(problems).length) return;

    var payload = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) payload[el.name] = el.value; });

    button.disabled = true;
    var label = button.textContent;
    button.textContent = mode === 'register' ? 'Creating account...' : 'Logging in...';

    BB.api(mode + '.php', { method: 'POST', body: payload }).then(function (data) {
      if (mode === 'register') {
      
        return BB.dialog({
          success: true,
          title: 'Registration successful!',
          message: 'Welcome to BubbleBoss, ' + data.user.name + '. Your account is ready. Taking you to the home page...',
          confirmText: 'Go to home page',
          autoCloseMs: 3000
        }).then(function () { BB.go('home.html'); });
      }
      BB.go(next || 'home.html');
    }).catch(function (err) {
      button.disabled = false;
      button.textContent = label;
      BB.showFieldErrors(form, err.fields);
      BB.showAlert(alertBox, 'error', err.message);
    });
  });
})();
