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
        this.addresses = [];
        this.shippingAddress = {};
        this.billingAddress = {};
        this.paymentMethod = 'card';
        this.useSameAddress = true;
        this.currentMode = this.isLoggedIn ? 'member' : 'guest';

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
                await this.loadAddresses();
                console.log('[Checkout Page API] User logged in:', this.user?.email);
            } else {
                console.log('[Checkout Page API] Guest checkout mode');
            }

            await this.loadCart();
            this.setupEventListeners();
            this.renderCheckout();
            this.prefillContactInfo();
            this.renderSavedAddresses();
            this.updateMemberBenefits(this.isLoggedIn);
            this.setCheckoutMode(this.currentMode);
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

    async loadAddresses() {
        try {
            console.log('[Checkout Page API] Loading addresses...');
            const response = await this.apiClient.get('/addresses');
            this.addresses = response.data?.addresses || response.addresses || [];
            console.log('[Checkout Page API] Loaded', this.addresses.length, 'addresses');
            console.log('[Checkout Page API] First address:', this.addresses[0]);
        } catch (error) {
            console.error('[Checkout Page API] Error loading addresses:', error);
            this.addresses = [];
        }
    }

    async loadCart() {
        try {
            console.log('[Checkout Page API] Loading cart from API...');

            const items = await window.cartManager.getCart(true);
            this.cart = Array.isArray(items) ? items : [];

            console.log('[Checkout Page API] Cart loaded:', this.cart.length, 'items');

            if (this.cart.length === 0) {
                alert('Your cart is empty');
                window.location.href = 'cart.html';
            }
        } catch (error) {
            console.error('[Checkout Page API] Error loading cart:', error);
            this.cart = [];
            alert('Failed to load cart. Please try again.');
            window.location.href = 'cart.html';
        }
    }

    renderCheckout() {
        this.renderOrderSummary();
        this.renderShippingForm();
        this.renderPaymentForm();
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
        const cardExpiryInput = document.getElementById('expiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
            });
        }

        this.setupAuthSections();
        this.setupSavedAddressHandlers();
        this.setupCityDistrictSelection();
        this.toggleCardDetails();
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

    setupAuthSections() {
        this.setupUserTypeTabs();
        this.setupLoginForm();
        this.setupRegisterForm();
        this.updateAuthFormsState();
    }

    setupUserTypeTabs() {
        const userTabs = document.querySelectorAll('.user-tab');
        if (!userTabs.length) return;

        userTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const type = tab.dataset.type || 'guest';
                this.setCheckoutMode(type);
            });
        });
    }

    setCheckoutMode(mode) {
        if (!mode) return;

        this.currentMode = mode;

        const userTabs = document.querySelectorAll('.user-tab');
        userTabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.type === mode);
        });

        const infoBoxes = document.querySelectorAll('.user-info');
        infoBoxes.forEach((info) => info.classList.remove('active'));
        const activeInfo = document.getElementById(`${mode}-info`);
        if (activeInfo) {
            activeInfo.classList.add('active');
        }

        const memberLoginSection = document.getElementById('member-login');
        if (memberLoginSection) {
            memberLoginSection.style.display = mode === 'member' && !this.isLoggedIn ? 'block' : 'none';
        }

        const registrationSection = document.getElementById('registration');
        if (registrationSection) {
            registrationSection.style.display = mode === 'register' && !this.isLoggedIn ? 'block' : 'none';
        }

        const contactSection = document.querySelector('.checkout-form .form-section');
        if (contactSection) {
            contactSection.style.display = mode === 'member' && this.isLoggedIn ? 'none' : 'block';
        }

        const savedAddresses = document.getElementById('saved-addresses');
        if (savedAddresses) {
            const shouldShow = mode === 'member' && this.isLoggedIn && this.hasSavedAddresses();
            savedAddresses.style.display = shouldShow ? 'block' : 'none';
        }

        // Show/hide address form based on mode and saved addresses
        if (mode === 'guest' || !this.isLoggedIn || !this.hasSavedAddresses()) {
            // Guest or no saved addresses - always show form
            this.showAddressForm();
        }

        this.updateAuthFormsState();
    }

    updateAuthFormsState() {
        const loginForm = document.getElementById('checkoutLoginForm');
        const loggedInSummary = document.getElementById('loggedInSummary');
        const registerForm = document.getElementById('checkoutRegisterForm');
        const registerNotice = document.getElementById('registerLoggedInNotice');

        if (loginForm) {
            loginForm.style.display = this.isLoggedIn ? 'none' : 'block';
        }

        if (loggedInSummary) {
            if (this.isLoggedIn && this.user) {
                loggedInSummary.innerHTML = '';

                const alert = document.createElement('div');
                alert.className = 'form-alert success';
                const fullName = [this.user.first_name, this.user.last_name]
                    .filter(Boolean)
                    .join(' ');
                const displayName = fullName || this.user.email || 'Hesabınız';
                alert.textContent = `✅ ${displayName} olarak giriş yaptınız.`;
                loggedInSummary.appendChild(alert);

                const logoutBtn = document.createElement('button');
                logoutBtn.type = 'button';
                logoutBtn.id = 'checkoutLogoutBtn';
                logoutBtn.className = 'login-btn secondary';
                logoutBtn.textContent = '🚪 Çıkış Yap';
                loggedInSummary.appendChild(logoutBtn);
                loggedInSummary.style.display = 'block';
                this.setupCheckoutLogout();
            } else {
                loggedInSummary.innerHTML = '';
                loggedInSummary.style.display = 'none';
            }
        }

        if (registerForm) {
            registerForm.style.display = this.isLoggedIn ? 'none' : 'block';
        }

        if (registerNotice) {
            registerNotice.style.display = this.isLoggedIn ? 'block' : 'none';
        }
    }

    setupLoginForm() {
        const form = document.getElementById('checkoutLoginForm');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitBtn = document.getElementById('checkoutLoginSubmit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Giriş yapılıyor...';
            }

            this.clearAuthMessage('login');

            try {
                const email = (document.getElementById('loginEmail')?.value || '').trim();
                const password = document.getElementById('loginPassword')?.value || '';

                if (!email || !password) {
                    throw new Error('Lütfen e-posta ve şifre giriniz.');
                }

                const response = await this.apiClient.login(email, password);
                if (!response?.success || !response.data) {
                    throw new Error(response?.message || 'Giriş başarısız.');
                }

                const { user, tokens } = response.data;
                if (!tokens?.accessToken) {
                    throw new Error('Sunucudan erişim belirteci alınamadı.');
                }

                AuthManager.login(tokens, user);
                this.isLoggedIn = true;
                this.user = user;

                if (window.cartManager?.mergeGuestCart) {
                    try {
                        await window.cartManager.mergeGuestCart();
                    } catch (mergeError) {
                        console.warn('[Checkout Page API] mergeGuestCart failed after login:', mergeError);
                    }
                }

                await this.afterAuthChange('login');
                this.showAuthMessage('login', 'success', '✅ Giriş başarılı! Bilgileriniz yüklendi.');
            } catch (error) {
                this.showAuthMessage('login', 'error', error.message || 'Giriş başarısız.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🔐 Login to Account';
                }
            }
        });
    }

    setupRegisterForm() {
        const form = document.getElementById('checkoutRegisterForm');
        if (!form) return;

        const sellerCheckbox = document.getElementById('registerAsSeller');
        const sellerFields = document.getElementById('sellerStoreFields');

        if (sellerCheckbox && sellerFields) {
            const toggleSellerFields = () => {
                sellerFields.style.display = sellerCheckbox.checked ? 'block' : 'none';
            };
            sellerCheckbox.addEventListener('change', toggleSellerFields);
            toggleSellerFields();
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (this.isLoggedIn) {
                this.showAuthMessage('register', 'info', 'Zaten giriş yaptınız.');
                return;
            }

            const submitBtn = document.getElementById('checkoutRegisterSubmit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Hesap oluşturuluyor...';
            }

            this.clearAuthMessage('register');

            try {
                const firstName = (document.getElementById('registerFirstName')?.value || '').trim();
                const lastName = (document.getElementById('registerLastName')?.value || '').trim();
                const email = (document.getElementById('registerEmail')?.value || '').trim();
                const password = document.getElementById('registerPassword')?.value || '';
                const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';
                const wantsSeller = sellerCheckbox?.checked || false;

                if (!firstName || !lastName || !email || !password) {
                    throw new Error('Lütfen gerekli alanları doldurun.');
                }

                if (password !== confirmPassword) {
                    throw new Error('Şifreler eşleşmiyor.');
                }

                const role = wantsSeller ? 'seller' : 'buyer';

                const rawStoreData = wantsSeller
                    ? {
                        name: (document.getElementById('registerStoreName')?.value || '').trim(),
                        description: (document.getElementById('registerStoreDescription')?.value || '').trim(),
                        city: (document.getElementById('registerStoreCity')?.value || '').trim(),
                        phone: (document.getElementById('registerStorePhone')?.value || '').trim(),
                    }
                    : null;

                if (role === 'seller' && (!rawStoreData || !rawStoreData.name)) {
                    throw new Error('Satıcı kaydı için mağaza adı gereklidir.');
                }

                const response = await this.apiClient.register({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password,
                    role,
                });

                if (!response?.success || !response.data) {
                    throw new Error(response?.message || 'Kayıt başarısız.');
                }

                const { user, tokens } = response.data;
                if (!tokens?.accessToken) {
                    throw new Error('Sunucudan erişim belirteci alınamadı.');
                }

                AuthManager.login(tokens, user);
                this.isLoggedIn = true;
                this.user = user;

                if (window.cartManager?.mergeGuestCart) {
                    try {
                        await window.cartManager.mergeGuestCart();
                    } catch (mergeError) {
                        console.warn('[Checkout Page API] mergeGuestCart failed after register:', mergeError);
                    }
                }

                await this.afterAuthChange('register', { role, storeData: rawStoreData });
                this.showAuthMessage('register', 'success', '🎉 Hesabınız oluşturuldu!');
            } catch (error) {
                this.showAuthMessage('register', 'error', error.message || 'Kayıt başarısız.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '⭐ Üye Ol ve Devam Et';
                }
            }
        });
    }

    showAuthMessage(target, type, message, append = false) {
        const containers = {
            login: document.getElementById('loginMessage'),
            register: document.getElementById('registerMessage'),
        };

        const container = containers[target];
        if (!container) return;

        if (!append) {
            container.innerHTML = '';
        }

        const alert = document.createElement('div');
        alert.className = `form-alert ${type || 'info'}`;
        alert.textContent = message;
        container.appendChild(alert);
        container.style.display = 'block';
    }

    clearAuthMessage(target) {
        const containers = {
            login: document.getElementById('loginMessage'),
            register: document.getElementById('registerMessage'),
        };

        const container = containers[target];
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'none';
    }

    hasSavedAddresses() {
        return Array.isArray(this.addresses) && this.addresses.length > 0;
    }

    renderSavedAddresses() {
        const listContainer = document.getElementById('savedAddressesList');
        const wrapper = document.getElementById('saved-addresses');

        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (!this.isLoggedIn) {
            if (wrapper) {
                wrapper.style.display = 'none';
            }
            return;
        }

        const addresses = this.addresses || [];

        if (!addresses.length) {
            const empty = document.createElement('div');
            empty.className = 'saved-addresses-empty';
            empty.innerHTML = `
                <p style="text-align: center; color: #6b7280; padding: 2rem;">
                    📍 Kayıtlı adres bulunamadı.
                    <a href="profile.html" style="color: #2d6853; text-decoration: underline;">Profil sayfasından</a> adres ekleyebilirsiniz.
                </p>
            `;
            listContainer.appendChild(empty);
            if (wrapper) {
                wrapper.style.display = this.currentMode === 'member' ? 'block' : 'none';
            }
            return;
        }

        addresses.forEach((address, index) => {
            const card = document.createElement('div');
            card.className = 'address-card';

            const header = document.createElement('div');
            header.className = 'address-header';

            const radioId = `savedAddress-${address.id || index}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'savedAddress';
            radio.id = radioId;
            radio.value = address.id || `index-${index}`;
            radio.dataset.index = index;
            radio.checked = index === 0;

            const label = document.createElement('label');
            label.setAttribute('for', radioId);
            const labelText = address.label || address.title || address.tag || `Adres ${index + 1}`;
            label.textContent = labelText;

            header.appendChild(radio);
            header.appendChild(label);

            const details = document.createElement('div');
            details.className = 'address-details';

            // Add name
            if (address.full_name) {
                const nameEl = document.createElement('div');
                nameEl.style.fontWeight = '600';
                nameEl.textContent = address.full_name;
                details.appendChild(nameEl);
            }

            // Add email if exists
            if (address.email) {
                const emailEl = document.createElement('div');
                emailEl.style.color = '#6b7280';
                emailEl.textContent = `📧 ${address.email}`;
                details.appendChild(emailEl);
            }

            // Add phone
            if (address.phone) {
                const phoneEl = document.createElement('div');
                phoneEl.style.color = '#6b7280';
                phoneEl.textContent = `📞 ${address.phone}`;
                details.appendChild(phoneEl);
            }

            // Add address lines
            const lines = [
                address.address_line1 || address.address || address.street || null,
                address.address_line2 || address.line2 || null,
                [address.district || address.state || null, address.city || null]
                    .filter(Boolean)
                    .join(', ')
                    .trim(),
                [address.postal_code || address.zip || null, address.country || null]
                    .filter(Boolean)
                    .join(' ')
                    .trim(),
            ].filter((line) => line && line.length > 0);

            if (!lines.length && !address.full_name && !address.email && !address.phone) {
                details.textContent = 'Adres bilgisi bulunamadı.';
            } else {
                lines.forEach((line) => {
                    if (!line) return;
                    const lineEl = document.createElement('div');
                    lineEl.textContent = line;
                    details.appendChild(lineEl);
                });
            }

            card.appendChild(header);
            card.appendChild(details);
            listContainer.appendChild(card);
        });

        const newCard = document.createElement('div');
        newCard.className = 'address-card new-address';
        const newHeader = document.createElement('div');
        newHeader.className = 'address-header';
        const newRadio = document.createElement('input');
        newRadio.type = 'radio';
        newRadio.name = 'savedAddress';
        newRadio.id = 'savedAddress-new';
        newRadio.value = 'new';
        newRadio.dataset.index = 'new';
        newRadio.checked = false;
        const newLabel = document.createElement('label');
        newLabel.setAttribute('for', 'savedAddress-new');
        newLabel.textContent = '➕ Yeni adres kullan';
        newHeader.appendChild(newRadio);
        newHeader.appendChild(newLabel);
        newCard.appendChild(newHeader);
        listContainer.appendChild(newCard);

        if (wrapper) {
            wrapper.style.display = this.currentMode === 'member' ? 'block' : 'none';
        }

        if (addresses.length > 0) {
            // First address is selected by default, hide the form
            this.hideAddressForm();
            this.fillShippingAddress(addresses[0]);
        } else {
            // No saved addresses, show the form
            this.showAddressForm();
        }
    }

    setupSavedAddressHandlers() {
        const wrapper = document.getElementById('saved-addresses');
        if (!wrapper) return;

        wrapper.addEventListener('change', (event) => {
            const target = event.target;
            if (!target || target.name !== 'savedAddress') return;

            const indexAttr = target.dataset.index;

            if (target.value === 'new' || indexAttr === 'new') {
                // Show address form for new address
                this.showAddressForm();
                this.clearShippingAddressFields();
                return;
            }

            const index = parseInt(indexAttr, 10);
            if (Number.isNaN(index)) {
                return;
            }

            const addresses = this.addresses || [];
            if (addresses[index]) {
                // Hide address form when using saved address
                this.hideAddressForm();
                this.fillShippingAddress(addresses[index]);
            }
        });
    }

    showAddressForm() {
        const addressForm = document.querySelector('.address-form');
        if (addressForm) {
            addressForm.style.display = 'block';
            // Re-enable required validation for form fields
            const requiredFields = addressForm.querySelectorAll('input[data-required="true"], select[data-required="true"]');
            requiredFields.forEach(field => {
                field.required = true;
            });
        }
    }

    hideAddressForm() {
        const addressForm = document.querySelector('.address-form');
        if (addressForm) {
            addressForm.style.display = 'none';
            // Disable required validation when form is hidden to prevent validation errors
            const requiredFields = addressForm.querySelectorAll('input[required], select[required]');
            requiredFields.forEach(field => {
                field.dataset.required = 'true'; // Store original state
                field.required = false;
            });
        }
    }

    fillShippingAddress(address) {
        if (!address) return;

        console.log('[Checkout] fillShippingAddress called with:', address);

        // Split full_name into firstName and lastName
        const nameParts = (address.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''; // If only one name, use it for both

        // SMART FIX: Handle Turkey address confusion (City vs State)
        // If user entered city/state backwards (common issue), swap them
        let cityValue = address.city || '';
        let districtValue = address.district || address.state || '';

        // Detect if values are swapped: if "city" starts lowercase and "state" starts uppercase
        // This means user probably entered district in city field and city in state field
        if (cityValue && districtValue) {
            const cityFirstChar = cityValue.charAt(0);
            const stateFirstChar = districtValue.charAt(0);

            // If city starts with lowercase and state starts with uppercase, swap them
            if (cityFirstChar === cityFirstChar.toLowerCase() &&
                stateFirstChar === stateFirstChar.toUpperCase()) {
                console.log('[Checkout] Detected swapped city/state, swapping back:', {
                    before: { city: cityValue, state: districtValue },
                    after: { city: districtValue, state: cityValue }
                });
                [cityValue, districtValue] = [districtValue, cityValue];
            }
        }

        // Update this.shippingAddress object directly for validation
        this.shippingAddress = {
            ...this.shippingAddress,
            firstName: firstName,
            lastName: lastName,
            email: address.email || this.user?.email || '', // Fallback to user email if address email is null
            phone: address.phone || '',
            address: [
                address.address_line1 || address.address || address.street,
                address.address_line2 || address.line2
            ].filter(Boolean).join(', '),
            city: cityValue,
            district: districtValue,
            postalCode: address.postal_code || address.zip || '',
        };

        console.log('[Checkout] Extracted from address:', {
            full_name: address.full_name,
            firstName: firstName,
            lastName: lastName,
            email: address.email,
            user_email_fallback: this.user?.email,
            final_email: this.shippingAddress.email,
            phone: address.phone,
            state: address.state,
            district: this.shippingAddress.district
        });

        // Fill Contact Information fields
        const firstNameInput = document.getElementById('firstName');
        if (firstNameInput && this.shippingAddress.firstName) {
            firstNameInput.value = this.shippingAddress.firstName;
        }

        const lastNameInput = document.getElementById('lastName');
        if (lastNameInput && this.shippingAddress.lastName) {
            lastNameInput.value = this.shippingAddress.lastName;
        }

        const emailInput = document.getElementById('email');
        if (emailInput && address.email) {
            emailInput.value = address.email;
        }

        const phoneInput = document.getElementById('phone');
        if (phoneInput && address.phone) {
            phoneInput.value = address.phone;
        }

        // Fill Delivery Address fields
        const fullNameInput = document.getElementById('fullName');
        if (fullNameInput && address.full_name) {
            fullNameInput.value = address.full_name;
        }

        const shippingAddressInput = document.getElementById('shippingAddress');
        if (shippingAddressInput) {
            const addressLine = [
                address.address_line1 || address.address || address.street,
                address.address_line2 || address.line2
            ].filter(Boolean).join(', ');
            shippingAddressInput.value = addressLine || '';
        }

        const shippingZip = document.getElementById('shippingZip');
        if (shippingZip) {
            shippingZip.value = address.postal_code || address.zip || '';
        }

        const shippingCitySelect = document.getElementById('shippingCitySelect');

        if (shippingCitySelect && cityValue) {
            // Set city value
            if (!this.setSelectValueByText(shippingCitySelect, cityValue)) {
                shippingCitySelect.value = cityValue.toLowerCase();
            }

            // Trigger change event to load districts
            const changeEvent = new Event('change', { bubbles: true });
            shippingCitySelect.dispatchEvent(changeEvent);

            // Wait for districts to load, then set district value
            if (districtValue) {
                setTimeout(() => {
                    const shippingDistrict = document.getElementById('shippingDistrict');
                    if (shippingDistrict && shippingDistrict.options.length > 1) {
                        // Try to find the district option
                        const option = Array.from(shippingDistrict.options).find(
                            opt => opt.value.toLowerCase() === districtValue.toLowerCase() ||
                                   opt.text.toLowerCase() === districtValue.toLowerCase()
                        );
                        if (option) {
                            shippingDistrict.value = option.value;
                            console.log('[Checkout] District set to:', option.value);
                        } else {
                            console.warn('[Checkout] District option not found:', districtValue);
                        }
                    }
                }, 500); // Wait 500ms for districts to load
            }
        }

        const deliveryInstructions = document.getElementById('deliveryInstructions');
        if (deliveryInstructions && address.notes) {
            deliveryInstructions.value = address.notes;
        }

        console.log('[Checkout Page API] Filled shipping address:', address.label || 'Address');
        console.log('[Checkout Page API] Updated this.shippingAddress:', this.shippingAddress);
    }

    clearShippingAddressFields(keepContact = true) {
        const fields = ['shippingAddress', 'shippingZip', 'deliveryInstructions'];
        fields.forEach((fieldId) => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.value = '';
            }
        });

        const shippingCitySelect = document.getElementById('shippingCitySelect');
        if (shippingCitySelect) {
            shippingCitySelect.value = '';
        }

        const shippingDistrict = document.getElementById('shippingDistrict');
        if (shippingDistrict) {
            shippingDistrict.value = '';
        }

        if (!keepContact) {
            ['firstName', 'lastName', 'email', 'phone'].forEach((id) => {
                const input = document.getElementById(id);
                if (input) {
                    input.value = '';
                }
            });
        }
    }

    setSelectValueByText(select, value) {
        if (!select || !value) return false;
        const target = value.toString().toLowerCase();

        for (const option of Array.from(select.options)) {
            const optionValue = option.value?.toString().toLowerCase();
            const optionText = option.textContent?.toString().toLowerCase();
            if (optionValue === target || optionText === target) {
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                return true;
            }
        }

        return false;
    }

    prefillContactInfo(force = false) {
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        if (!this.user) {
            if (force) {
                [firstNameInput, lastNameInput, emailInput, phoneInput].forEach((input) => {
                    if (input) {
                        input.value = '';
                    }
                });
            }
            return;
        }

        if (firstNameInput && (force || !firstNameInput.value)) {
            firstNameInput.value = this.user.first_name || '';
        }
        if (lastNameInput && (force || !lastNameInput.value)) {
            lastNameInput.value = this.user.last_name || '';
        }
        if (emailInput && (force || !emailInput.value)) {
            emailInput.value = this.user.email || '';
        }
        if (phoneInput && (force || !phoneInput.value)) {
            phoneInput.value = this.user.phone || '';
        }
    }

    updateMemberBenefits(isActive) {
        const benefits = document.getElementById('member-benefits');
        if (!benefits) return;
        benefits.style.display = isActive ? 'block' : 'none';
    }

    setupCheckoutLogout() {
        const logoutBtn = document.getElementById('checkoutLogoutBtn');
        if (!logoutBtn || logoutBtn.dataset.bound === 'true') return;

        logoutBtn.dataset.bound = 'true';
        logoutBtn.addEventListener('click', () => this.handleCheckoutLogout());
    }

    handleCheckoutLogout() {
        AuthManager.logout(false);
        this.isLoggedIn = false;
        this.user = null;
        this.addresses = [];
        this.apiClient = new ApiClient();

        this.clearAuthMessage('login');
        this.clearAuthMessage('register');

        this.loadLocalCart();
        this.renderOrderSummary();
        this.prefillContactInfo(true);
        this.clearShippingAddressFields(false);
        this.renderSavedAddresses();
        this.updateMemberBenefits(false);
        this.setCheckoutMode('guest');
    }

    async afterAuthChange(action, options = {}) {
        try {
            this.apiClient = new ApiClient();
            await this.loadUser();
            await this.loadAddresses();
            await this.loadCart();
            this.prefillContactInfo(true);
            this.renderOrderSummary();
            this.renderSavedAddresses();
            this.updateMemberBenefits(true);
            this.setCheckoutMode('member');

            if (options.role === 'seller' && options.storeData) {
                await this.createStoreForNewSeller(options.storeData);
            }
        } catch (error) {
            console.error('[Checkout Page API] afterAuthChange error:', error);
        }
    }

    async createStoreForNewSeller(storeData) {
        if (!storeData) return;

        const payload = { ...storeData };
        Object.keys(payload).forEach((key) => {
            if (!payload[key]) {
                delete payload[key];
            }
        });

        if (!payload.name) return;

        if (this.user?.email) {
            payload.email = this.user.email;
        }

        try {
            const response = await this.apiClient.createStore(payload);
            if (!response?.success) {
                throw new Error(response?.message || 'Mağaza oluşturulamadı');
            }

            const createdStore = response.data || {};
            this.showAuthMessage(
                'register',
                'success',
                `🏪 Mağazanız oluşturuldu: ${createdStore.name || payload.name}`,
                true
            );
        } catch (error) {
            this.showAuthMessage(
                'register',
                'warning',
                `⚠️ Mağaza oluşturulamadı: ${error.message || 'Bilinmeyen bir hata oluştu'}`,
                true
            );
        }
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

        // If logged in, use user data for contact info
        // Check if address form is visible
        const addressForm = document.querySelector('.address-form');
        const isAddressFormVisible = addressForm && addressForm.style.display !== 'none';

        console.log('[Checkout] Address form visible:', isAddressFormVisible);

        // If logged in and using saved address (form hidden), keep the address data that was already filled
        // If logged in and form is visible (new address), use user data as defaults
        if (this.isLoggedIn && this.user && isAddressFormVisible) {
            // Only use user data as fallback if not already set
            if (!this.shippingAddress.firstName) this.shippingAddress.firstName = this.user.first_name || '';
            if (!this.shippingAddress.lastName) this.shippingAddress.lastName = this.user.last_name || '';
            if (!this.shippingAddress.email) this.shippingAddress.email = this.user.email || '';
            if (!this.shippingAddress.phone) this.shippingAddress.phone = this.user.phone || '';
            console.log('[Checkout] Using logged-in user data for contact info (form visible)');
        }

        console.log('[Checkout] Current shippingAddress state:', this.shippingAddress);

        // Validate required fields using correct IDs
        for (const [htmlId, backendName] of Object.entries(fieldMapping)) {
            const input = document.getElementById(htmlId);

            // Skip contact fields if form is hidden (using saved address) OR if user is logged in
            if (['firstName', 'lastName', 'email', 'phone'].includes(backendName) && (!isAddressFormVisible || this.isLoggedIn)) {
                // Check if value exists in this.shippingAddress (from saved address or user data)
                if (!this.shippingAddress[backendName]) {
                    console.warn(`[Checkout] Contact field missing ${backendName}`);
                    errors.push(`${backendName} is required`);
                    missingFields.push(backendName);
                } else {
                    console.log(`[Checkout] Using existing value for ${backendName}: ${this.shippingAddress[backendName]}`);
                }
                continue;
            }

            // Skip address form fields if form is hidden (using saved address)
            if (!isAddressFormVisible && ['address', 'city', 'postalCode', 'district'].includes(backendName)) {
                // Check if value exists in this.shippingAddress (filled from saved address)
                if (!this.shippingAddress[backendName]) {
                    console.warn(`[Checkout] Saved address missing ${backendName}`);
                    console.warn(`[Checkout] Current this.shippingAddress:`, this.shippingAddress);
                    errors.push(`${backendName} is required`);
                    missingFields.push(backendName);
                } else {
                    console.log(`[Checkout] Using saved address value for ${backendName}: ${this.shippingAddress[backendName]}`);
                }
                continue;
            }

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

            const shippingAddressPayload = {
                full_name: `${this.shippingAddress.firstName || ''} ${this.shippingAddress.lastName || ''}`.trim(),
                phone: this.shippingAddress.phone || '',
                address_line1: this.shippingAddress.address || '',
                address_line2: this.shippingAddress.district || this.shippingAddress.address2 || '',
                city: this.shippingAddress.city || '',
                state: this.shippingAddress.district || this.shippingAddress.state || '',
                postal_code: this.shippingAddress.postalCode || '',
                country: this.shippingAddress.country || 'Turkey'
            };

            const checkoutPayload = {
                shipping_address: shippingAddressPayload,
                payment_method: this.paymentMethod || 'card'
            };

            const derivedStoreId = this.cart[0]?.product?.store?.id
                || this.cart[0]?.store?.id
                || this.cart[0]?.product?.store_id
                || this.cart[0]?.store_id;

            if (derivedStoreId) {
                checkoutPayload.store_id = derivedStoreId;
            }

            if (!this.useSameAddress) {
                const billing = this.billingAddress || {};
                checkoutPayload.billing_address = {
                    full_name: `${billing.firstName || billing.full_name || shippingAddressPayload.full_name}`.trim(),
                    phone: billing.phone || shippingAddressPayload.phone,
                    address_line1: billing.address || billing.address_line1 || shippingAddressPayload.address_line1,
                    address_line2: billing.district || billing.address2 || billing.address_line2 || shippingAddressPayload.address_line2,
                    city: billing.city || shippingAddressPayload.city,
                    state: billing.state || billing.district || shippingAddressPayload.state,
                    postal_code: billing.postalCode || billing.postal_code || shippingAddressPayload.postal_code,
                    country: billing.country || shippingAddressPayload.country
                };
            }

            if (this.shippingAddress.notes) {
                checkoutPayload.customer_note = this.shippingAddress.notes;
            }

            const response = await this.apiClient.post('/cart/checkout', checkoutPayload);

            if (!response.success) {
                console.error('[Checkout Page API] Checkout failed:', response);
                alert(response.message || 'Failed to complete checkout.');
                return;
            }

            console.log('[Checkout Page API] Checkout response:', response);

            // Backend returns { orders: [...] } array
            const orders = response.data?.orders || response.orders || [];
            const order = orders[0] || response.data || response.order || {};

            console.log('[Checkout Page API] Order created:', order);

            try {
                localStorage.setItem('lastOrder', JSON.stringify({
                    orderId: order.id || null,
                    items: this.cart,
                    totals: window.cartManager.getTotals(),
                }));
            } catch (_) {
                // Ignore storage errors silently
            }

            await window.cartManager.getCart(true);

            const orderId = order.id || 'unknown';
            console.log('[Checkout Page API] Redirecting to order-success.html with order ID:', orderId);
            window.location.href = `order-success.html?orderId=${orderId}`;
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

    setupCityDistrictSelection() {
        const districts = {
            'istanbul': [
                'Kadıköy', 'Beşiktaş', 'Şişli', 'Beyoğlu', 'Üsküdar', 'Fatih',
                'Bakırköy', 'Maltepe', 'Ataşehir', 'Pendik', 'Kartal', 'Tuzla',
                'Avcılar', 'Başakşehir', 'Beylikdüzü', 'Büyükçekmece', 'Çekmeköy',
                'Esenler', 'Esenyurt', 'Gaziosmanpaşa', 'Güngören', 'Kağıthane'
            ],
            'ankara': [
                'Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut',
                'Gölbaşı', 'Pursaklar', 'Altındağ', 'Polatlı', 'Elmadağ', 'Kalecik'
            ],
            'izmir': [
                'Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir',
                'Narlıdere', 'Balçova', 'Bayraklı', 'Güzelbahçe', 'Karabağlar', 'Torbalı'
            ],
            'bursa': [
                'Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'Gemlik', 'İnegöl',
                'Karacabey', 'Mustafakemalpaşa', 'Orhangazi', 'Büyükorhan'
            ],
            'antalya': [
                'Muratpaşa', 'Kepez', 'Konyaaltı', 'Döşemealtı', 'Aksu', 'Alanya',
                'Manavgat', 'Serik', 'Kemer', 'Kaş', 'Demre', 'Finike'
            ]
        };

        const citySelect = document.getElementById('shippingCitySelect');
        const districtSelect = document.getElementById('shippingDistrict');

        if (citySelect && districtSelect) {
            citySelect.addEventListener('change', (e) => {
                const selectedCity = e.target.value.toLowerCase();
                districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
                districtSelect.disabled = !selectedCity;

                if (selectedCity && districts[selectedCity]) {
                    districts[selectedCity].forEach(districtName => {
                        const option = document.createElement('option');
                        option.value = districtName;
                        option.textContent = districtName;
                        districtSelect.appendChild(option);
                    });
                    districtSelect.disabled = false;
                    console.log('[Checkout API] Loaded districts for:', selectedCity);
                }

                // Update shipping address
                this.shippingAddress.city = e.target.value;
                this.shippingAddress.district = '';
            });

            districtSelect.addEventListener('change', (e) => {
                this.shippingAddress.district = e.target.value;
            });
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
