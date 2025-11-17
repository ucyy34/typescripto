# Address Management System - Technical Notes

## System Architecture Overview

### Database Structure
- **Model**: `backend/src/models/Address.js`
- **Table**: `addresses` (PostgreSQL)
- **Key Fields**:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key → users table, CASCADE delete)
  - `type` (ENUM: 'shipping', 'billing', 'both')
  - `label` (String: "Home", "Office", etc.)
  - `full_name` (String: Recipient name)
  - `phone` (String: Phone number with validation)
  - `email` (String: Optional email, can be NULL)
  - `address_line1` (String: Street address)
  - `address_line2` (String: Optional additional details)
  - `city` (String: City name - stored as TEXT INPUT from profile)
  - `state` (String: District/Province - stored as TEXT INPUT from profile)
  - `postal_code` (String: Postal code)
  - `country` (String: Default "Turkey")
  - `is_default` (Boolean: Only one default per user)
  - `notes` (Text: Delivery instructions)

### API Endpoints
- **Base Path**: `/api/v1/addresses`
- **Authentication**: All endpoints require JWT authentication
- **Routes** (`backend/src/routes/address.routes.js`):
  - `GET /` - Get all user addresses
  - `GET /:id` - Get specific address
  - `POST /` - Create new address
  - `PUT /:id` - Update address
  - `DELETE /:id` - Delete address
  - `POST /:id/set-default` - Set as default address
  - `GET /default/:type` - Get default address by type

### Frontend Components

#### 1. Profile Page (`pages/profile.html` + `assets/js/profile-api.js`)
- **Purpose**: Manage saved addresses
- **Input Type**: TEXT INPUTS for city and state (manual keyboard entry)
- **Form Fields**:
  - Label, Full Name, Phone, Email
  - Address Line 1, Address Line 2
  - City (TEXT INPUT - user types "istanbul")
  - State (TEXT INPUT - user types "kadıköy")
  - Postal Code, Country, Notes
  - Default checkbox

#### 2. Checkout Page (`pages/checkout.html` + `assets/js/checkout-api.js`)
- **Purpose**: Use saved addresses or enter new shipping address
- **Input Type**: DROPDOWN SELECTS for city and district (selection-based)
- **Two Modes**:
  1. **Guest Mode**: Show full address form
  2. **Member Mode**: Show saved addresses + "new address" option
- **Form Fields**:
  - Contact Info: First Name, Last Name, Email, Phone
  - Delivery Address: Street, City (SELECT), District (SELECT), Postal Code

## Critical System Behavior

### 1. City/District Data Flow Issue

**THE MAIN PROBLEM DISCOVERED:**

```
Profile Page (Save):
  User types: city = "istanbul", state = "kadıköy"
  Database stores: city = "istanbul", state = "kadıköy"

Checkout Page (Load):
  City field: <select id="shippingCitySelect">
    → Expects option value="istanbul"
  District field: <select id="shippingDistrict">
    → Loads dynamically AFTER city is selected
    → Initially DISABLED with only "Önce şehir seçin" option
```

**Why District Was Missing:**
1. Profile saves `state: "kadıköy"` as plain text
2. Checkout tries to set `shippingDistrict.value = "kadıköy"` immediately
3. BUT district dropdown is empty/disabled until city triggers its change event
4. District value gets lost because the option doesn't exist yet!

### 2. Solution Implemented

**File**: `assets/js/checkout-api.js` → `fillShippingAddress()` method

```javascript
// BEFORE (BROKEN):
shippingCitySelect.value = cityValue;
shippingDistrict.value = districtValue; // ❌ Fails! Options not loaded yet

// AFTER (FIXED):
shippingCitySelect.value = cityValue.toLowerCase();
// Trigger change event to load districts
shippingCitySelect.dispatchEvent(new Event('change'));
// WAIT for districts to load (500ms)
setTimeout(() => {
    // THEN find and set district option
    const option = Array.from(shippingDistrict.options).find(
        opt => opt.value.toLowerCase() === districtValue.toLowerCase()
    );
    if (option) shippingDistrict.value = option.value;
}, 500);
```

### 3. Name Handling Issue

**Problem**: Single-word names in `full_name` field
- Example: `full_name: "testt"` (only one word)
- Original code: `lastName = nameParts.slice(1).join(' ')` → Empty string!

**Solution**:
```javascript
const nameParts = (address.full_name || '').trim().split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
// If only one name, use it for BOTH firstName and lastName
```

### 4. Email Fallback Logic

**Problem**: Address saved without email (email = NULL in database)

**Solution**:
```javascript
email: address.email || this.user?.email || ''
// Fallback chain:
// 1. Use address email if exists
// 2. Else use logged-in user's email
// 3. Else empty string
```

### 5. Validation Logic

**Two Scenarios**:

#### A. Form Visible (Guest or "New Address" mode):
```javascript
if (isAddressFormVisible) {
    // Read values from DOM inputs
    const value = document.getElementById(htmlId).value;
}
```

#### B. Form Hidden (Saved Address Selected):
```javascript
if (!isAddressFormVisible) {
    // Read values from this.shippingAddress object
    // (Already filled by fillShippingAddress() method)
    if (!this.shippingAddress[backendName]) {
        errors.push(`${backendName} is required`);
    }
}
```

**Critical**: Don't override `this.shippingAddress` after `fillShippingAddress()` runs!

### 6. Form Visibility Control

**Methods**:
- `showAddressForm()` - Display: block, Enable required validation
- `hideAddressForm()` - Display: none, Disable required validation

**When to Hide**:
- Member logged in AND saved address selected

**When to Show**:
- Guest checkout
- Member clicks "➕ Yeni adres kullan"

## Data Mapping Reference

### Profile → Database
```javascript
{
  label: "home",
  full_name: "testt",
  phone: "4534545",
  email: null,                    // Can be NULL
  address_line1: "sadfjsdlkfj",
  address_line2: "lkdsjlk",
  city: "istanbul",              // TEXT INPUT - lowercase
  state: "kadıköy",              // TEXT INPUT - lowercase
  postal_code: "4342",
  country: "Turkey",
  notes: "",
  is_default: true
}
```

### Database → Checkout Form
```javascript
// Contact Information
firstName: "testt"                           // Split from full_name
lastName: "testt"                            // Fallback to firstName if single word
email: "emma.wilson@email.com"               // Fallback to user.email if NULL
phone: "4534545"                             // Direct mapping

// Delivery Address
address: "sadfjsdlkfj, lkdsjlk"             // Joined address_line1 + address_line2
city: "istanbul"                             // Maps to shippingCitySelect.value
district: "kadıköy"                          // Maps to shippingDistrict.value (AFTER city loads)
postalCode: "4342"                           // Direct mapping
```

## Key Files Modified

1. **Backend**:
   - `backend/src/models/Address.js` - Model with email field
   - `backend/src/controllers/address.controller.js` - CRUD operations
   - `backend/src/routes/address.routes.js` - API routes
   - `backend/src/models/index.js` - User ↔ Address associations
   - `backend/src/app.js` - Mount address routes

2. **Frontend**:
   - `assets/js/profile-api.js` - Address management UI
   - `assets/js/checkout-api.js` - Saved address integration + validation fix
   - `pages/checkout.html` - Removed static address examples

## Testing Checklist

### Guest Checkout
- [ ] Can fill all fields manually
- [ ] Validation works correctly
- [ ] Order places successfully

### Member Checkout - Saved Address
- [ ] Login → Saved addresses appear
- [ ] First address auto-selected
- [ ] Form hidden when saved address selected
- [ ] City dropdown shows selected city
- [ ] District dropdown loads and shows selected district
- [ ] Phone, email, all fields populated
- [ ] Validation passes
- [ ] Order places successfully

### Member Checkout - New Address
- [ ] "➕ Yeni adres kullan" shows form
- [ ] Can enter new address
- [ ] Validation works
- [ ] Order places successfully

### Profile Page
- [ ] Can add new address with email
- [ ] Can edit existing address
- [ ] Can delete address
- [ ] Can set default address
- [ ] Email field saves correctly
- [ ] City and state save as text

## Common Issues & Solutions

### Issue: "district is required" error
**Cause**: District dropdown not populated before value is set
**Solution**: Trigger city change event, wait 500ms, then set district

### Issue: "lastName is required" error
**Cause**: Single-word name in full_name field
**Solution**: Use firstName for both fields if only one word

### Issue: "email is required" error
**Cause**: Address saved without email (NULL in database)
**Solution**: Fallback to user.email from logged-in user data

### Issue: Validation fails even with saved address
**Cause**: `this.shippingAddress` overridden by user data
**Solution**: Only use user data as fallback if form is visible

## Performance Considerations

- **District Loading**: 500ms setTimeout (adjust if districts load faster/slower)
- **API Calls**: Addresses loaded once on page load, cached in `this.addresses`
- **Form Rendering**: Dynamic rendering prevents static HTML validation errors

## Security Notes

- All endpoints require JWT authentication
- User can only access their own addresses (enforced by `user_id` filter)
- CASCADE delete ensures orphaned addresses are removed with user
- Phone validation regex prevents invalid characters
- Email validation ensures proper format

## Future Improvements

1. **Standardize City/District Input**:
   - Use SELECT dropdowns in profile page too (consistency)
   - OR use text inputs in checkout page (simplicity)

2. **Cache District Data**:
   - Pre-load all cities and districts
   - Eliminate 500ms timeout

3. **Better Error Messages**:
   - Show which field is missing to user
   - Highlight invalid fields in red

4. **Address Autocomplete**:
   - Google Places API integration
   - Turkish address validation

5. **Mobile Optimization**:
   - Larger touch targets for address selection
   - Simplified form on small screens

---

**Last Updated**: 2025-11-01
**System Version**: v1.0
**Author**: Claude Code Assistant
