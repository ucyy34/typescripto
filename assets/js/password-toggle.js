/**
 * Password Toggle Component
 * Adds eye icon to password inputs for show/hide functionality
 */

class PasswordToggle {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPasswordToggles());
        } else {
            this.setupPasswordToggles();
        }
    }

    setupPasswordToggles() {
        // Find all password inputs
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            // Skip if already wrapped
            if (input.parentElement.classList.contains('password-input-wrapper')) {
                return;
            }

            this.wrapPasswordInput(input);
        });

        console.log(`[Password Toggle] Initialized ${passwordInputs.length} password fields`);
    }

    wrapPasswordInput(input) {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'password-input-wrapper';

        // Insert wrapper before input
        input.parentNode.insertBefore(wrapper, input);
        
        // Move input into wrapper
        wrapper.appendChild(input);

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';

        // Add toggle button to wrapper
        wrapper.appendChild(toggleBtn);

        // Add click event
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePassword(input, toggleBtn);
        });
    }

    togglePassword(input, button) {
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            // Show password
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            button.setAttribute('aria-label', 'Hide password');
        } else {
            // Hide password
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            button.setAttribute('aria-label', 'Show password');
        }
    }

    // Public method to manually add toggle to a specific input
    addToggle(inputElement) {
        if (inputElement && inputElement.type === 'password') {
            this.wrapPasswordInput(inputElement);
        }
    }
}

// Auto-initialize when script loads
window.passwordToggle = new PasswordToggle();





