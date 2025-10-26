// Login page controller extracted from inline script to satisfy CSP
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // If already logged in, redirect to profile
    try {
      if (AuthManager && AuthManager.getToken && AuthManager.getToken()) {
        window.location.href = 'profile.html';
        return;
      }
    } catch (_) {}

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const email = emailInput ? emailInput.value : '';
      const password = passwordInput ? passwordInput.value : '';

      if (errorMessage) errorMessage.classList.remove('show');
      if (successMessage) successMessage.classList.remove('show');

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
      }

      try {
        const apiClient = new ApiClient();
        const response = await apiClient.post('/auth/login', { email, password });

        if (!response.success) {
          throw new Error(response.message || 'Login failed');
        }

        const data = response.data || {};
        const tokens = data.tokens;
        const user = data.user;

        if (!tokens || !tokens.accessToken) {
          throw new Error('No token received from server');
        }

        AuthManager.login(tokens, user);

        // Merge guest cart to user cart
        if (window.cartManager && window.cartManager.mergeGuestCart) {
          try { await window.cartManager.mergeGuestCart(); } catch (_) {}
        }

        if (successMessage) {
          successMessage.textContent = 'Login successful! Redirecting...';
          successMessage.classList.add('show');
        }

        setTimeout(() => {
          if (user && user.role === 'seller') {
            window.location.href = '../vendorcss/index.html';
          } else if (user && user.role === 'admin') {
            window.location.href = '../admincss/index.html';
          } else {
            window.location.href = 'profile.html';
          }
        }, 500);
      } catch (err) {
        if (errorMessage) {
          errorMessage.textContent = (err && err.message) ? err.message : 'Login failed';
          errorMessage.classList.add('show');
        }
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
        }
      }
    });
  });
})();

