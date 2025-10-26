# 🔐 Test Login Credentials

Use these credentials to test the authentication system:

## Buyer Account (Customer)
- **Email:** `buyer@test.com`
- **Password:** `Buyer123!`
- **Redirect:** Profile page (`pages/profile.html`)

## Seller Account (Vendor)
- **Email:** `seller@test.com`
- **Password:** `Seller123!`
- **Redirect:** Vendor dashboard (`vendorcss/index.html`)

## Admin Account
- **Email:** `admin@dostanmarket.com`
- **Password:** `Admin@123456`
- **Redirect:** Admin panel (`admincss/index.html`)

---

## Testing Workflow

### 1. Test Customer Login
1. Navigate to: `http://localhost:3001/pages/login.html`
2. Use buyer credentials above
3. Should redirect to profile page
4. Verify: Profile shows user name, orders, settings

### 2. Test Vendor Login
1. Navigate to: `http://localhost:3001/pages/login.html`
2. Use seller credentials above
3. Should redirect to vendor dashboard
4. Verify: Vendor panel loads correctly

### 3. Test New Registration
1. Navigate to: `http://localhost:3001/pages/register.html`
2. Fill in form with new email
3. Select role (Buyer or Seller)
4. Should auto-login and redirect based on role

### 4. Test Logout
1. Login with any account
2. Navigate to profile page
3. Click "Logout" in sidebar
4. Should redirect to homepage

---

## API Endpoints Being Tested

- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/register` - New user registration
- `GET /api/v1/auth/me` - Get current user profile
- `GET /api/v1/orders` - Get user's orders
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/password` - Change password

---

## Troubleshooting

### "Invalid email or password"
- Check that backend is running: `cd backend && npm run dev`
- Verify test users were created: `node src/scripts/seed-test-users.js`
- Check console for detailed error messages

### "Failed to load profile"
- Check authentication token in localStorage
- Verify `/auth/me` endpoint returns user data
- Check browser console for API errors

### "No token received from server"
- Check API response structure in console
- Verify backend returns tokens in correct format
- Check that login/register endpoints return `{tokens: {accessToken, refreshToken}}`
