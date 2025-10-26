/**
 * Checkout Page API Integration
 * Connects checkout.html to backend API
 */

class CheckoutPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.cart = [];
        this.isLoggedIn = AuthManager.isLoggedIn();
        this.user = null;
        this.shippingAddress = {};
        this.billingAddress = {};
        this.paymentMethod = 'credit_card';
        this.useSameAddress = true;

        // Coupon state
        this.appliedCoupon = null;
        this.couponDiscount = 0;

        console.log('[Checkout Page API] Initializing...');
        this.init();
    }

    async init() {
        try {
            // Load user if logged in (optional for guest checkout)
            if (this.isLoggedIn) {
                await this.loadUser();
                console.log('[Checkout Page API] User logged in:', this.user?.email);
            } else {
                console.log('[Checkout Page API] Guest checkout mode');
            }

            await this.loadCart();
            this.renderCheckout();
            this.setupEventListeners();
            this.prefillCheckoutContact();
            this.refreshAuthSections();
            console.log('[Checkout Page API] Initialization complete');
        } catch (error) {
            console.error('[Checkout Page API] Initialization error:', error);
            this.showError('Failed to initialize checkout');
        }
    }

    async loadUser() {
        try {
            const response = await this.apiClient.getMe();
            if (response.success && response.data) {
                this.user = response.data;
                console.log('[Checkout Page API] User loaded:', this.user.email);
            }
        } catch (error) {
            console.error('[Checkout Page API] Error loading user:', error);
        }
    }

    async loadCart() {
        try {
            console.log('[Checkout Page API] Loading cart...');

            if (this.isLoggedIn) {
                // Try to load from backend for logged-in users
                try {
                    const response = await this.apiClient.get('/cart');

                    if (response.success && response.data && response.data.items && response.data.items.length > 0) {
                        this.cart = response.data.items;
                        console.log('[Checkout Page API] Cart loaded from backend:', this.cart.length, 'items');
                    } else {
                        // Fallback to localStorage
                        this.loadLocalCart();
                    }
                } catch (error) {
                    console.warn('[Checkout Page API] Backend cart failed, using localStorage');
                    this.loadLocalCart();
                }
            } else {
                // Guest checkout - load from localStorage only
                this.loadLocalCart();
            }

            if (this.cart.length === 0) {
                alert('Your cart is empty');
                window.location.href = 'cart.html';
            }
        } catch (error) {
            console.error('[Checkout Page API] Error loading cart:', error);
            // Fallback to localStorage
            this.loadLocalCart();

            if (this.cart.length === 0) {
                alert('Your cart is empty');
                window.location.href = 'cart.html';
            }
        }
    }

    loadLocalCart() {
        const localCart = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('[Checkout Page API] Raw localStorage cart:', localCart);

        this.cart = localCart.map(item => {
            // Ensure product data exists
            if (!item.product && item.product_id) {
                console.warn('[Checkout Page API] Product data missing, using fallback');
                return {
                    product_id: item.product_id,
                    product: {
                        id: item.product_id,
                        title: item.title || 'Unknown Product',
                        price: item.price || 0,
                        images: item.images || [],
                        stock: item.stock || 0,
                        store: item.store || null
                    },
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price || 0)
                };
            }

            return {
                product_id: item.product_id,
                product: item.product,
                quantity: item.quantity || 1,
                price: parseFloat(item.price || item.product?.price || 0)
            };
        }).filter(item => item.product_id);

        console.log('[Checkout Page API] Cart loaded from localStorage:', this.cart.length, 'items');
    }

    renderCheckout() {
        this.renderOrderSummary();
        this.renderShippingForm();
        this.renderPaymentForm();
    }

    prefillCheckoutContact() {
        if (!this.user) return;

        const fieldMap = {
            firstName: this.user.first_name,
            lastName: this.user.last_name,
            email: this.user.email,
            phone: this.user.phone,
        };

        Object.entries(fieldMap).forEach(([fieldId, value]) => {
            const input = document.getElementById(fieldId);
            if (input && typeof value !== 'undefined' && value !== null) {
                input.value = value;
            }
        });
    }

    refreshAuthSections() {
        const savedAddresses = document.getElementById('saved-addresses');
        if (savedAddresses) {
            savedAddresses.style.display = this.isLoggedIn ? 'block' : 'none';
        }

        if (this.isLoggedIn) {
            this.switchUserType('member');
        }

        const memberMessage = document.getElementById('memberLoginMessage');
        const loginForm = document.getElementById('memberLoginForm');
        const loginBtn = loginForm?.querySelector('.login-btn');

        if (this.isLoggedIn) {
            const displayName = this.user?.first_name || this.user?.email || 'Üye';
            if (memberMessage) {
                this.setFormMessage(memberMessage, `✅ ${displayName} olarak giriş yaptınız.`, 'success');
            }
            if (loginForm) {
                loginForm.querySelectorAll('input').forEach(input => {
                    input.disabled = true;
                });
            }
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Already logged in';
            }
        } else {
            if (memberMessage) {
                this.setFormMessage(memberMessage, 'Üyeliğiniz varsa giriş yaparak kaydedilmiş adreslerinizi kullanabilirsiniz.', 'info');
            }
            if (loginForm) {
                loginForm.querySelectorAll('input').forEach(input => {
                    input.disabled = false;
                });
            }
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = '🔐 Login to Account';
            }
        }

        const registerForm = document.getElementById('checkoutRegisterForm');
        const registerBtn = registerForm?.querySelector('.register-btn');
        const registerMessage = document.getElementById('checkoutRegisterMessage');

        if (this.isLoggedIn) {
            if (registerMessage) {
                this.setFormMessage(registerMessage, 'Zaten giriş yaptınız. Ödeme adımlarına devam edebilirsiniz.', 'success');
            }
            if (registerForm) {
                registerForm.querySelectorAll('input, select, textarea').forEach(input => {
                    input.disabled = true;
                });
            }
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.textContent = 'Account active';
            }
        } else {
            if (registerMessage) {
                this.setFormMessage(registerMessage, '', 'info');
            }
            if (registerForm) {
                registerForm.querySelectorAll('input, select, textarea').forEach(input => {
                    input.disabled = false;
                });
            }
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
            this.toggleSellerStoreFields(document.getElementById('registerRole')?.value || 'buyer');
        }

        const memberInfo = document.getElementById('member-info');
        if (memberInfo) {
            if (this.isLoggedIn) {
                const name = this.user?.first_name || this.user?.email || 'Member';
                memberInfo.innerHTML = `<p>💎 Hoş geldiniz ${name}! Kaydedilmiş adresleriniz ve avantajlarınız aktif.</p>`;
                memberInfo.classList.add('active');
            } else {
                memberInfo.innerHTML = '<p>💎 Access saved addresses, faster checkout, order history</p>';
            }
        }

        const promoMessage = document.getElementById('promo-message');
        if (promoMessage) {
            if (this.isLoggedIn) {
                if (!promoMessage.textContent) {
                    promoMessage.textContent = '💎 As a member, try code MEMBER15 for extra savings!';
                }
                promoMessage.className = 'promo-message success';
            } else if (!promoMessage.classList.contains('success')) {
                promoMessage.textContent = '';
                promoMessage.className = 'promo-message';
            }
        }
    }

    setFormMessage(elementOrId, message = '', type = 'info') {
        const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (!element) return;

        if (!message) {
            element.textContent = '';
            element.classList.remove('show', 'success', 'error');
            return;
        }

        element.textContent = message;
        element.classList.add('show');
        element.classList.remove('success', 'error', 'info');

        if (type === 'success') {
            element.classList.add('success');
        } else if (type === 'error') {
            element.classList.add('error');
        } else if (type === 'info') {
            element.classList.add('info');
        }
    }

    switchUserType(type = 'guest') {
        const tabs = document.querySelectorAll('.user-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.type === type;
            tab.classList.toggle('active', isActive);
        });

        const infoBlocks = document.querySelectorAll('.user-info');
        infoBlocks.forEach(block => {
            const shouldShow = block.id === `${type}-info`;
            block.classList.toggle('active', shouldShow);
        });

        const loginSection = document.getElementById('member-login');
        const registerSection = document.getElementById('registration');

        if (type === 'member') {
            if (loginSection) loginSection.style.display = 'block';
            if (registerSection) registerSection.style.display = 'none';
        } else if (type === 'register') {
            if (loginSection) loginSection.style.display = 'none';
            if (registerSection) registerSection.style.display = 'block';
            this.toggleSellerStoreFields(document.getElementById('registerRole')?.value || 'buyer');
        } else {
            if (loginSection) loginSection.style.display = 'none';
            if (registerSection) registerSection.style.display = 'none';
        }
    }

    renderOrderSummary() {
        const itemsContainer = document.getElementById('summary-items');
        const totalElement = document.getElementById('total-amount');

        if (!itemsContainer || !totalElement) {
            console.error('[Checkout Page API] Order summary containers not found');
            console.log('[Checkout Page API] Looking for: #summary-items and #total-amount');
            return;
        }

        if (!this.cart || this.cart.length === 0) {
            console.warn('[Checkout Page API] Cart is empty');
            itemsContainer.innerHTML = '<p style="text-align:center;color:#666;padding:2rem;">Sepetiniz boş</p>';
            totalElement.textContent = '$0.00';
            return;
        }

        console.log('[Checkout Page API] Rendering order summary with', this.cart.length, 'items');
        console.log('[Checkout Page API] Cart data:', this.cart);

        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => {
            const price = parseFloat(item.price || item.product?.price || 0);
            return sum + (price * item.quantity);
        }, 0);

        const shipping = subtotal > 100 ? 0 : 10.00; // Free shipping over $100
        const tax = subtotal * 0.10; // 10% tax

        // Apply coupon discount
        const discount = this.couponDiscount || 0;
        const total = subtotal + shipping + tax - discount;

        // Render cart items
        const itemsHTML = this.cart.map(item => {
            const product = item.product;
            if (!product) {
                console.warn('[Checkout Page API] Product missing for item:', item);
                return '';
            }

            const price = parseFloat(item.price || product.price || 0);
            const itemTotal = price * item.quantity;

            const mainImage = product.images && product.images.length > 0
                ? product.images[0]
                : 'https://via.placeholder.com/60x60?text=No+Image';

            return `
                <div class="summary-item" style="display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e0e0e0; align-items: center;">
                    <img src="${mainImage}"
                         alt="${product.title}"
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 0.9rem; color: #2d6853;">
                            ${product.title}
                        </h4>
                        <p style="margin: 0; color: #666; font-size: 0.85rem;">
                            Quantity: ${item.quantity} x $${price.toFixed(2)}
                        </p>
                    </div>
                    <div style="text-align: right; font-weight: bold; color: #2d6853;">
                        $${itemTotal.toFixed(2)}
                    </div>
                </div>
            `;
        }).filter(html => html !== '').join('');

        const summaryHTML = `
            <div style="padding: 1rem 0; border-bottom: 1px solid #e0e0e0;">
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Shipping:</span>
                    <span style="color: ${shipping === 0 ? '#22c55e' : 'inherit'}; font-weight: ${shipping === 0 ? 'bold' : 'normal'};">
                        ${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}
                    </span>
                </div>
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Tax (10%):</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #22c55e; font-weight: bold;">
                    <span>🎁 Coupon Discount (${this.appliedCoupon?.code || ''}):</span>
                    <span>-$${discount.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
        `;

        itemsContainer.innerHTML = itemsHTML + summaryHTML;

        // Update total
        totalElement.textContent = `$${total.toFixed(2)}`;

        // Store total for later use
        this.orderTotal = total;
        this.orderSubtotal = subtotal;
        this.orderShipping = shipping;
        this.orderTax = tax;

        console.log('[Checkout Page API] Order summary rendered successfully:', {
            items: this.cart.length,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2)
        });
    }

    renderShippingForm() {
        const container = document.getElementById('shippingForm');
        if (!container) return;

        // Pre-fill with user data if available
        const firstName = this.user?.first_name || '';
        const lastName = this.user?.last_name || '';
        const email = this.user?.email || '';
        const phone = this.user?.phone || '';

        container.innerHTML = `
            <h3>Shipping Address</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" value="${firstName}" required>
                </div>
                <div class="form-group">
                    <label for="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" value="${lastName}" required>
                </div>
                <div class="form-group full-width">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" value="${email}" required>
                </div>
                <div class="form-group full-width">
                    <label for="phone">Phone *</label>
                    <input type="tel" id="phone" name="phone" value="${phone}" required>
                </div>
                <div class="form-group full-width">
                    <label for="address">Address Line 1 *</label>
                    <input type="text" id="address" name="address" required>
                </div>
                <div class="form-group full-width">
                    <label for="address2">Address Line 2 (Optional)</label>
                    <input type="text" id="address2" name="address2">
                </div>
                <div class="form-group">
                    <label for="city">City *</label>
                    <input type="text" id="city" name="city" required>
                </div>
                <div class="form-group">
                    <label for="state">State/Province</label>
                    <input type="text" id="state" name="state">
                </div>
                <div class="form-group">
                    <label for="postalCode">Postal Code *</label>
                    <input type="text" id="postalCode" name="postalCode" required>
                </div>
                <div class="form-group">
                    <label for="country">Country *</label>
                    <select id="country" name="country" required>
                        <option value="Turkey">Turkey</option>
                        <option value="USA">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                    </select>
                </div>
            </div>
        `;
    }

    renderPaymentForm() {
        const container = document.getElementById('paymentForm');
        if (!container) return;

        container.innerHTML = `
            <h3>Payment Method</h3>
            <div class="payment-methods">
                <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="credit_card" checked>
                    <span>💳 Credit Card</span>
                </label>
                <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="debit_card">
                    <span>💳 Debit Card</span>
                </label>
                <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="paypal">
                    <span>🅿️ PayPal</span>
                </label>
                <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="bank_transfer">
                    <span>🏦 Bank Transfer</span>
                </label>
            </div>

            <div id="cardDetails" class="card-details">
                <div class="form-group">
                    <label for="cardNumber">Card Number *</label>
                    <input type="text" id="cardNumber" name="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="cardExpiry">Expiry Date *</label>
                        <input type="text" id="cardExpiry" name="cardExpiry" placeholder="MM/YY" maxlength="5">
                    </div>
                    <div class="form-group">
                        <label for="cardCVV">CVV *</label>
                        <input type="text" id="cardCVV" name="cardCVV" placeholder="123" maxlength="4">
                    </div>
                </div>
                <div class="form-group">
                    <label for="cardName">Name on Card *</label>
                    <input type="text" id="cardName" name="cardName">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="backToCartBtn">
                    Back to Cart
                </button>
                <button type="button" class="btn btn-primary" id="placeOrderBtn">
                    Place Order
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        this.setupUserTypeTabs();
        this.setupMemberLoginForm();
        this.setupInlineRegistration();

        // Promo/Coupon code button
        const promoBtn = document.querySelector('.promo-btn');
        if (promoBtn) {
            promoBtn.addEventListener('click', () => {
                this.applyCoupon();
            });
        }

        // Form submit event
        const form = document.getElementById('checkout-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('[Checkout Page API] Form submitted');
                this.placeOrder();
            });
        } else {
            console.error('[Checkout Page API] Checkout form not found');
        }

        // Payment method change - listen to HTML payment method clicks
        document.addEventListener('click', (e) => {
            const paymentMethod = e.target.closest('.payment-method');
            if (paymentMethod) {
                const methodType = paymentMethod.dataset.method;
                if (methodType) {
                    this.paymentMethod = methodType;
                    console.log('[Checkout Page API] Payment method changed to:', methodType);
                    this.toggleCardDetails();
                }
            }
        });

        // Place order button (alternative)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'placeOrderBtn') {
                e.preventDefault();
                this.placeOrder();
            }
        });

        // Back to cart button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'backToCartBtn') {
                window.location.href = 'cart.html';
            }
        });

        // Card number formatting
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Expiry date formatting
        const cardExpiryInput = document.getElementById('cardExpiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
            });
        }
    }

    setupUserTypeTabs() {
        const tabs = document.querySelectorAll('.user-tab');
        if (tabs.length === 0) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const type = tab.dataset.type || 'guest';
                this.switchUserType(type);

                if (type !== 'member') {
                    this.setFormMessage('memberLoginMessage', '', 'info');
                }
                if (type !== 'register') {
                    this.setFormMessage('checkoutRegisterMessage', '', 'info');
                }
            });
        });

        const initialType = this.isLoggedIn ? 'member' : 'guest';
        this.switchUserType(initialType);
    }

    setupMemberLoginForm() {
        const form = document.getElementById('memberLoginForm');
        if (!form) return;

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = form.querySelector('.login-btn');
        const messageEl = document.getElementById('memberLoginMessage');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (this.isLoggedIn) {
                this.setFormMessage(messageEl, 'Zaten giriş yaptınız. Ödeme adımlarına geçebilirsiniz.', 'success');
                return;
            }

            const email = emailInput?.value.trim();
            const password = passwordInput?.value || '';

            if (!email || !password) {
                this.setFormMessage(messageEl, 'Lütfen e-posta ve şifrenizi girin.', 'error');
                return;
            }

            this.setFormMessage(messageEl, '');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }

            try {
                const response = await this.apiClient.login(email, password);
                if (!response.success) {
                    throw new Error(response.message || 'Login failed');
                }

                const payload = response.data || response;
                const tokens = payload.tokens;
                const user = payload.user;

                if (!tokens?.accessToken) {
                    throw new Error('No token received from server');
                }

                await this.handleAuthSuccess(user, tokens);

                this.setFormMessage(messageEl, 'Giriş başarılı! Üyelik avantajlarınız yüklendi.', 'success');
            } catch (error) {
                console.error('[Checkout Page API] Login failed:', error);
                this.setFormMessage(messageEl, error.message || 'Login failed. Please try again.', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🔐 Login to Account';
                }
            }
        });
    }

    setupInlineRegistration() {
        const form = document.getElementById('checkoutRegisterForm');
        if (!form) return;

        const messageEl = document.getElementById('checkoutRegisterMessage');
        const submitBtn = form.querySelector('.register-btn');
        const roleSelect = document.getElementById('registerRole');

        if (roleSelect) {
            roleSelect.addEventListener('change', () => {
                this.toggleSellerStoreFields(roleSelect.value);
            });
        }

        this.toggleSellerStoreFields(roleSelect?.value || 'buyer');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (this.isLoggedIn) {
                this.setFormMessage(messageEl, 'Zaten giriş yaptınız. Ödeme adımlarına geçebilirsiniz.', 'success');
                return;
            }

            const firstName = document.getElementById('registerFirstName')?.value.trim();
            const lastName = document.getElementById('registerLastName')?.value.trim();
            const email = document.getElementById('registerEmail')?.value.trim();
            const password = document.getElementById('registerPassword')?.value || '';
            const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';
            const role = roleSelect?.value || 'buyer';

            if (!firstName || !lastName || !email) {
                this.setFormMessage(messageEl, 'Lütfen tüm zorunlu alanları doldurun.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                this.setFormMessage(messageEl, 'Şifreler eşleşmiyor.', 'error');
                return;
            }

            if (password.length < 8) {
                this.setFormMessage(messageEl, 'Şifreniz en az 8 karakter olmalıdır.', 'error');
                return;
            }

            const storeData = {};
            if (role === 'seller') {
                const storeName = document.getElementById('registerStoreName')?.value.trim();
                if (!storeName) {
                    this.setFormMessage(messageEl, 'Satıcı hesabı için mağaza adı gereklidir.', 'error');
                    return;
                }

                storeData.name = storeName;
                storeData.description = document.getElementById('registerStoreDescription')?.value.trim() || undefined;
                storeData.phone = document.getElementById('registerStorePhone')?.value.trim() || undefined;
                storeData.email = document.getElementById('registerStoreEmail')?.value.trim() || email;
                storeData.address = document.getElementById('registerStoreAddress')?.value.trim() || undefined;
                storeData.city = document.getElementById('registerStoreCity')?.value.trim() || undefined;
                storeData.tax_number = document.getElementById('registerStoreTaxNumber')?.value.trim() || undefined;
            }

            this.setFormMessage(messageEl, '');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
            }

            try {
                const response = await this.apiClient.register({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password,
                    role,
                });

                if (!response.success) {
                    throw new Error(response.message || 'Registration failed');
                }

                const payload = response.data || response;
                const tokens = payload.tokens;
                const user = payload.user;

                if (!tokens?.accessToken) {
                    throw new Error('No token received from server');
                }

                await this.handleAuthSuccess(user, tokens);

                if (role === 'seller') {
                    try {
                        const storeResponse = await this.apiClient.createStore(storeData);
                        if (!storeResponse.success) {
                            throw new Error(storeResponse.message || 'Store creation failed');
                        }

                        this.setFormMessage(messageEl, 'Hesabınız ve mağazanız hazır! Satıcı paneline yönlendiriliyorsunuz...', 'success');
                        setTimeout(() => {
                            window.location.href = '../vendorcss/index.html';
                        }, 1500);
                        return;
                    } catch (storeError) {
                        console.error('[Checkout Page API] Store creation failed:', storeError);
                        this.setFormMessage(messageEl, `Hesabınız açıldı ancak mağaza kurulamadı: ${storeError.message || storeError}. Satıcı panelinden mağaza oluşturabilirsiniz.`, 'error');
                    }
                } else {
                    this.setFormMessage(messageEl, 'Hesabınız oluşturuldu! Üyelik avantajlarınız hazır.', 'success');
                }
            } catch (error) {
                console.error('[Checkout Page API] Registration failed:', error);
                this.setFormMessage(messageEl, error.message || 'Registration failed. Please try again.', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
                return;
            }

            if (!this.isLoggedIn && submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }

    toggleSellerStoreFields(role = 'buyer') {
        const storeFields = document.getElementById('sellerStoreFields');
        if (!storeFields) return;

        const shouldShow = role === 'seller' && !this.isLoggedIn;
        storeFields.style.display = shouldShow ? 'block' : 'none';

        storeFields.querySelectorAll('[data-store-field]').forEach(input => {
            if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) {
                return;
            }

            if (shouldShow) {
                if (input.dataset.required === 'true') {
                    input.setAttribute('required', 'required');
                }
            } else {
                input.removeAttribute('required');
                if (!this.isLoggedIn) {
                    input.value = '';
                }
            }
        });
    }

    async handleAuthSuccess(user, tokens) {
        AuthManager.login(tokens, user);
        this.user = user;
        this.isLoggedIn = true;

        await this.mergeGuestCartIfNeeded();
        await this.loadCart();
        this.renderOrderSummary();
        this.prefillCheckoutContact();
        this.refreshAuthSections();

        if (window.dostikAI) {
            try {
                const name = this.user?.first_name || this.user?.email || 'üyemiz';
                window.dostikAI.addChatMessage(`✅ ${name}, üyelik avantajların hazır!`);
            } catch (_) {}
        }
    }

    async mergeGuestCartIfNeeded() {
        try {
            if (window.cartManager && typeof window.cartManager.mergeGuestCart === 'function') {
                await window.cartManager.mergeGuestCart();
            }
        } catch (error) {
            console.warn('[Checkout Page API] Guest cart merge failed:', error);
        }
    }

    toggleCardDetails() {
        // Toggle card details visibility based on payment method
        const cardDetails = document.getElementById('card-details');
        const cryptoDetails = document.getElementById('crypto-details');
        const bankDetails = document.getElementById('bank-details');

        if (cardDetails) {
            cardDetails.style.display = 'none';
        }
        if (cryptoDetails) {
            cryptoDetails.style.display = 'none';
        }
        if (bankDetails) {
            bankDetails.style.display = 'none';
        }

        // Show relevant payment details
        if (this.paymentMethod === 'card' || this.paymentMethod === 'credit_card' || this.paymentMethod === 'debit_card') {
            if (cardDetails) {
                cardDetails.style.display = 'grid';
            }
        } else if (this.paymentMethod === 'crypto') {
            if (cryptoDetails) {
                cryptoDetails.style.display = 'block';
            }
        } else if (this.paymentMethod === 'bank' || this.paymentMethod === 'bank_transfer') {
            if (bankDetails) {
                bankDetails.style.display = 'block';
            }
        }

        console.log('[Checkout Page API] Card details toggled for:', this.paymentMethod);
    }

    validateShippingAddress() {
        // Map frontend field IDs to backend field names
        const fieldMapping = {
            'firstName': 'firstName',
            'lastName': 'lastName',
            'email': 'email',
            'phone': 'phone',
            'shippingAddress': 'address',           // HTML uses 'shippingAddress'
            'shippingCitySelect': 'city',           // HTML uses 'shippingCitySelect'
            'shippingZip': 'postalCode',            // HTML uses 'shippingZip'
            'shippingDistrict': 'district'          // HTML uses 'shippingDistrict'
        };

        const errors = [];
        const missingFields = [];

        // Validate required fields using correct IDs
        for (const [htmlId, backendName] of Object.entries(fieldMapping)) {
            const input = document.getElementById(htmlId);
            if (!input) {
                console.warn(`[Checkout] Field not found in DOM: ${htmlId} (${backendName})`);
                errors.push(`${backendName} field is missing`);
                missingFields.push(backendName);
            } else if (!input.value.trim()) {
                console.log(`[Checkout] Field empty: ${htmlId} (${backendName})`);
                errors.push(`${backendName} is required`);
                missingFields.push(backendName);
            } else {
                this.shippingAddress[backendName] = input.value.trim();
                console.log(`[Checkout] Field valid: ${htmlId} = ${input.value.trim()}`);
            }
        }

        // Country is required but uses different field
        const countryInput = document.getElementById('shippingCitySelect');
        if (countryInput && countryInput.value.trim()) {
            this.shippingAddress.country = 'Turkey'; // Default for Turkish cities
        }

        // Optional delivery instructions
        const deliveryInstructions = document.getElementById('deliveryInstructions');
        if (deliveryInstructions && deliveryInstructions.value.trim()) {
            this.shippingAddress.notes = deliveryInstructions.value.trim();
        }

        if (missingFields.length > 0) {
            console.log('[Checkout] Missing fields:', missingFields);
            console.log('[Checkout] All errors:', errors);
        } else {
            console.log('[Checkout] All required fields validated successfully');
            console.log('[Checkout] Shipping address:', this.shippingAddress);
        }

        return errors;
    }

    validatePayment() {
        const errors = [];

        console.log('[Checkout Page API] Validating payment method:', this.paymentMethod);

        // Only validate card details if card payment is selected
        if (this.paymentMethod === 'card' || this.paymentMethod === 'credit_card' || this.paymentMethod === 'debit_card') {
            const cardNumber = document.getElementById('cardNumber');
            const cardExpiry = document.getElementById('expiry');
            const cardCVV = document.getElementById('cvv');
            const cardName = document.getElementById('cardName');

            console.log('[Checkout Page API] Card payment selected, validating card fields...');

            if (!cardNumber || !cardNumber.value.trim()) {
                errors.push('Card number is required');
            }

            if (!cardExpiry || !cardExpiry.value.trim()) {
                errors.push('Expiry date is required');
            }

            if (!cardCVV || !cardCVV.value.trim()) {
                errors.push('CVV is required');
            }

            if (!cardName || !cardName.value.trim()) {
                errors.push('Name on card is required');
            }
        } else {
            console.log('[Checkout Page API] Non-card payment method, skipping card validation');
        }

        if (errors.length > 0) {
            console.log('[Checkout Page API] Payment validation errors:', errors);
        } else {
            console.log('[Checkout Page API] Payment validation passed');
        }

        return errors;
    }

    async placeOrder() {
        try {
            console.log('[Checkout Page API] Placing order...');

            // Validate shipping address
            const shippingErrors = this.validateShippingAddress();
            if (shippingErrors.length > 0) {
                alert('Please fill in all required shipping fields:\n' + shippingErrors.join('\n'));
                return;
            }

            // Validate payment
            const paymentErrors = this.validatePayment();
            if (paymentErrors.length > 0) {
                alert('Please fill in all required payment fields:\n' + paymentErrors.join('\n'));
                return;
            }

            // Show loading
            const submitBtn = document.querySelector('.checkout-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Processing...';
            }

            // Prepare order data
            console.log('[Checkout Page API] Raw shipping address:', this.shippingAddress);

            const orderData = {
                shipping_address: {
                    full_name: `${this.shippingAddress.firstName || ''} ${this.shippingAddress.lastName || ''}`.trim(),
                    phone: this.shippingAddress.phone || '',
                    address_line1: this.shippingAddress.address || '',
                    address_line2: this.shippingAddress.district || this.shippingAddress.address2 || '',
                    city: this.shippingAddress.city || '',
                    state: this.shippingAddress.district || this.shippingAddress.state || '',
                    postal_code: this.shippingAddress.postalCode || '',
                    country: this.shippingAddress.country || 'Turkey'
                },
                payment_method: this.paymentMethod || 'bank_transfer',
                items: this.cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: parseFloat(item.price || item.product?.price || 0)
                }))
            };

            // Add coupon info if applied
            if (this.appliedCoupon && this.couponDiscount > 0) {
                orderData.coupon_code = this.appliedCoupon.code;
                orderData.coupon_discount = this.couponDiscount;
            }

            console.log('[Checkout Page API] Prepared order data:', JSON.stringify(orderData, null, 2));

            // Group items by store
            const storeGroups = {};
            console.log('[Checkout Page API] Grouping cart items by store...');
            console.log('[Checkout Page API] Cart items:', JSON.stringify(this.cart, null, 2));

            this.cart.forEach(item => {
                const storeId = item.product?.store_id || item.product?.store?.id || item.store_id;
                console.log('[Checkout Page API] Item:', item.product?.title, 'Store ID:', storeId);

                if (!storeId) {
                    console.error('[Checkout Page API] Product missing store ID:', item);
                    alert(`Product "${item.product?.title || 'Unknown'}" is missing store information. Cannot proceed with checkout.`);
                    throw new Error('Product missing store ID');
                }

                if (!storeGroups[storeId]) {
                    storeGroups[storeId] = [];
                }

                storeGroups[storeId].push({
                    product_id: item.product_id,
                    quantity: item.quantity
                });
            });

            console.log('[Checkout Page API] Store groups:', storeGroups);

            // Create orders for each store
            const orderPromises = Object.entries(storeGroups).map(([storeId, items]) => {
                const storeOrderData = {
                    store_id: storeId,
                    items: items,
                    shipping_address: orderData.shipping_address,
                    payment_method: orderData.payment_method
                };

                // Add coupon if applied
                if (this.appliedCoupon && this.couponDiscount > 0) {
                    storeOrderData.coupon_code = this.appliedCoupon.code;
                    storeOrderData.coupon_discount = this.couponDiscount;
                }

                return this.apiClient.post('/orders', storeOrderData);
            });

            const results = await Promise.all(orderPromises);

            // Check if all orders were successful
            const allSuccessful = results.every(r => r.success);

            if (allSuccessful) {
                console.log('[Checkout Page API] Order(s) created successfully');

                // Store order data for success page
                const firstOrderId = results[0].data?.id || results[0].data?.order?.id || 'unknown';
                localStorage.setItem('lastOrder', JSON.stringify({
                    items: this.cart,
                    total: this.orderTotal,
                    subtotal: this.orderSubtotal,
                    shipping: this.orderShipping,
                    tax: this.orderTax
                }));

                // Clear cart
                localStorage.removeItem('cart');

                // Redirect to success page
                console.log('[Checkout Page API] Redirecting to order-success.html with order ID:', firstOrderId);
                window.location.href = `order-success.html?orderId=${firstOrderId}`;
            } else {
                alert('Some orders failed to process. Please contact support.');
                console.error('[Checkout Page API] Order errors:', results);
            }
        } catch (error) {
            console.error('[Checkout Page API] Error placing order:', error);
            alert('Failed to place order. Please try again.');
        } finally {
            const submitBtn = document.querySelector('.checkout-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🛡️ Complete Secure Purchase';
            }
        }
    }

    async applyCoupon() {
        try {
            const promoInput = document.getElementById('promoCode');
            const promoMessage = document.getElementById('promo-message');

            if (!promoInput || !promoMessage) {
                console.error('[Checkout Page API] Promo code elements not found');
                return;
            }

            const code = promoInput.value.trim().toUpperCase();
            if (!code) {
                promoMessage.textContent = '⚠️ Please enter a coupon code';
                promoMessage.style.color = '#ef4444';
                return;
            }

            // Show loading
            promoMessage.textContent = '⏳ Validating coupon...';
            promoMessage.style.color = '#666';

            // Calculate order amount (subtotal only, before shipping and tax)
            console.log('[Checkout API - applyCoupon] Cart items:', this.cart);
            console.log('[Checkout API - applyCoupon] Cart length:', this.cart.length);

            const orderAmount = this.cart.reduce((sum, item) => {
                const price = parseFloat(item.price || item.product?.price || 0);
                console.log('[Checkout API - applyCoupon] Item:', item.product?.title, 'Price:', price, 'Quantity:', item.quantity);
                return sum + (price * item.quantity);
            }, 0);

            console.log('[Checkout API - applyCoupon] Calculated order amount:', orderAmount);

            if (orderAmount <= 0) {
                promoMessage.textContent = '⚠️ Cart is empty or invalid';
                promoMessage.style.color = '#ef4444';
                return;
            }

            console.log('[Checkout Page API] Validating coupon:', code, 'for order amount:', orderAmount);

            // Call coupon validation API
            const response = await this.apiClient.post('/coupons/validate', {
                code: code,
                order_amount: orderAmount,
                user_id: this.user?.id || null
            });

            console.log('[Checkout Page API] API Response:', response);

            if (response.success && response.data && response.data.valid) {
                // Apply coupon
                this.appliedCoupon = response.data.coupon;
                this.couponDiscount = response.data.discount_amount;

                promoMessage.textContent = `✅ Coupon applied! You saved $${this.couponDiscount.toFixed(2)}`;
                promoMessage.style.color = '#22c55e';
                promoMessage.style.fontWeight = 'bold';

                console.log('[Checkout Page API] Coupon applied:', this.appliedCoupon);

                // Re-render order summary to show discount
                this.renderOrderSummary();

                // Disable promo input
                promoInput.disabled = true;
            } else {
                // Show backend error message
                let errorMsg = response.message || 'Invalid coupon code';

                // If there are validation errors, show them
                if (response.errors && response.errors.length > 0) {
                    console.error('[Checkout Page API] Validation errors:', response.errors);
                    const errorFields = response.errors.map(e => `${e.field}: ${e.message}`).join(', ');
                    errorMsg += ` (${errorFields})`;
                }

                promoMessage.textContent = `❌ ${errorMsg}`;
                promoMessage.style.color = '#ef4444';
                promoMessage.style.fontWeight = 'normal';
                console.error('[Checkout Page API] Coupon validation failed:', response);
            }
        } catch (error) {
            console.error('[Checkout Page API] Coupon validation error:', error);
            const promoMessage = document.getElementById('promo-message');
            if (promoMessage) {
                promoMessage.textContent = `❌ ${error.message || 'An error occurred'}`;
                promoMessage.style.color = '#ef4444';
            }
        }
    }

    showError(message) {
        alert(message);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.checkoutPageAPI = new CheckoutPageAPI();
    });
} else {
    window.checkoutPageAPI = new CheckoutPageAPI();
}
