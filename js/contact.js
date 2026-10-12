
(function () {
  'use strict';
  var form = document.getElementById('contactForm');
  if (!form) return;
  var alertBox = document.getElementById('formAlert');
  var button = form.querySelector('button[type="submit"]');

  BB.getUser().then(function (u) {
    if (!u) return;
    if (!form.elements.name.value) form.elements.name.value = u.name + ' ' + u.surname;
    if (!form.elements.email.value) form.elements.email.value = u.email;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    BB.hideAlert(alertBox);

    var f = {};
    if (!form.elements.name.value.trim()) f.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.elements.email.value.trim())) f.email = 'Enter a valid email address.';
    if (!form.elements.subject.value.trim()) f.subject = 'Enter a subject.';
    if (form.elements.message.value.trim().length < 5) f.message = 'Write a short message.';
    BB.showFieldErrors(form, f);
    if (Object.keys(f).length) return;

    var payload = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) payload[el.name] = el.value; });

    button.disabled = true;
    button.textContent = 'Sending...';
    BB.api('message.php', { method: 'POST', body: payload }).then(function () {
      form.elements.subject.value = '';
      form.elements.message.value = '';
      BB.dialog({
        success: true,
        title: 'Message sent',
        message: 'Thanks for getting in touch. We have your message and will reply by email.',
        confirmText: 'Done'
      });
    }).catch(function (err) {
      BB.showFieldErrors(form, err.fields);
      BB.showAlert(alertBox, 'error', err.message);
    }).then(function () {
      button.disabled = false;
      button.textContent = 'Send Message';
    });
  });
})();
