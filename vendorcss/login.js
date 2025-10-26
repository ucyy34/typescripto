/**
 * Vendor Login Page JavaScript
 * Handles vendor authentication and redirects to dashboard
 */

console.log('[Vendor Login] Page loaded');

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Vendor Login] Checking existing auth...');

    if (AuthManager.isLoggedIn()) {
        const user = AuthManager.getUser();
        console.log('[Vendor Login] User already logged in:', user);

        // If seller or admin, redirect to dashboard
        if (user.role === 'seller' || user.role === 'admin') {
            console.log('[Vendor Login] Redirecting to dashboard...');
            window.location.href = 'index.html';
            return;
        }
    }

    // Setup login form
    setupLoginForm();
});

/**
 * Setup login form event handlers
 */
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    if (!form) {
        console.error('[Vendor Login] Login form not found');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[Vendor Login] Form submitted');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate inputs
        if (!email || !password) {
            showAlert('Lütfen e-posta ve şifre giriniz.', 'error');
            return;
        }

        // Disable form
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'block';
        hideAlert();

        try {
            console.log('[Vendor Login] Attempting login for:', email);

            // Create API client
            const apiClient = new ApiClient();

            // Call login API
            const response = await apiClient.login(email, password);
            console.log('[Vendor Login] API response:', response);

            // Check if login was successful
            if (response.success && response.data) {
                const { tokens, user } = response.data;

                console.log('[Vendor Login] Login successful:', user);

                // Check if user is seller or admin
                if (user.role !== 'seller' && user.role !== 'admin') {
                    console.warn('[Vendor Login] User is not a seller or admin:', user.role);
                    showAlert('Bu panel sadece satıcılar içindir. Lütfen satıcı hesabı ile giriş yapın.', 'error');
                    loginBtn.disabled = false;
                    btnText.style.display = 'block';
                    btnSpinner.style.display = 'none';
                    return;
                }

                // Save auth data
                AuthManager.login(tokens, user);

                // Show success message
                showAlert('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');

                // Redirect to dashboard after 1 second
                setTimeout(() => {
                    console.log('[Vendor Login] Redirecting to dashboard...');
                    window.location.href = 'index.html';
                }, 1000);

            } else {
                // Login failed
                console.error('[Vendor Login] Login failed:', response.message);
                showAlert(response.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.', 'error');
                loginBtn.disabled = false;
                btnText.style.display = 'block';
                btnSpinner.style.display = 'none';
            }

        } catch (error) {
            console.error('[Vendor Login] Login error:', error);
            showAlert('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            loginBtn.disabled = false;
            btnText.style.display = 'block';
            btnSpinner.style.display = 'none';
        }
    });

    console.log('[Vendor Login] Form setup complete');
}

/**
 * Show alert message
 */
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${type === 'error' ? '❌' : '✅'}</span>
        <span>${message}</span>
    `;
    alertDiv.style.display = 'flex';
}

/**
 * Hide alert message
 */
function hideAlert() {
    const alertDiv = document.getElementById('alertMessage');
    if (alertDiv) {
        alertDiv.style.display = 'none';
    }
}

/**
 * Quick fill test credentials (for development)
 */
window.fillTestCredentials = (type = 'seller') => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (type === 'seller') {
        emailInput.value = 'seller@test.com';
        passwordInput.value = 'Seller123!';
    } else if (type === 'admin') {
        emailInput.value = 'admin@dostanmarket.com';
        passwordInput.value = 'Admin@123456';
    }

    console.log('[Vendor Login] Test credentials filled:', type);
};

// Add keyboard shortcut for quick test fill (Ctrl+Shift+S for seller, Ctrl+Shift+A for admin)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        fillTestCredentials('seller');
    } else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        fillTestCredentials('admin');
    }
});
