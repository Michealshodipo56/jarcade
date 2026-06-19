(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const form = document.getElementById('resetForm');
  const btn = document.getElementById('resetBtn');

  if (!token) {
    JarcadeAuth.showAuthError('This reset link is invalid or missing.');
    if (form) form.style.display = 'none';
    return;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('resetPassword')?.value || '';
    const confirmPassword = document.getElementById('resetConfirm')?.value || '';

    if (password.length < 6) {
      JarcadeAuth.showAuthError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      JarcadeAuth.showAuthError('Passwords do not match.');
      return;
    }

    JarcadeAuth.setButtonLoading(btn, true, 'Updating…');
    try {
      await JarcadeAuth.resetPassword({ token, password, confirmPassword });
      JarcadeAuth.showAuthSuccess('Password updated! You can sign in now.');
      setTimeout(() => {
        if (window.JarcadeUI?.navigateWithLoader) {
          JarcadeUI.navigateWithLoader('login.html', 'Opening login…');
        } else {
          window.location.href = 'login.html';
        }
      }, 500);
    } catch (err) {
      JarcadeAuth.showAuthError(err.message);
    } finally {
      JarcadeAuth.setButtonLoading(btn, false);
    }
  });
})();
