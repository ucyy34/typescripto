# CLAUDE.md - Quick Project Understanding

## 🎯 Project Summary
DostanWebCSS is a **Nordic-themed e-commerce marketplace** with comprehensive vendor and admin management systems. Built with vanilla HTML/CSS/JS, featuring Dostik AI assistant integration.

## 📁 File Structure
```
dostanwebcss4/
├── index.html, cart.html, product-detail.html, profile.html
├── wood-carvings.html, glass-art.html (category pages)
├── assets/css/style.css, assets/js/script.js (main site)
├── vendorcss/ (vendor management panel)
└── admincss/ (admin control panel)
```

## 🏪 Vendor Panel (/vendorcss/)
**Purpose**: Full vendor management dashboard
**Key Files**:
- `index.html` - Dashboard interface
- `vendor-dashboard.css` - Styling with CSS variables
- `vendor-dashboard.js` - Navigation and functionality

**Sections**: Dashboard, Products, Orders, Analytics, Inventory, Returns & Refunds, Store Management, Shipping & Logistics, SEO & Marketing, Messages, Settings

## 👑 Admin Panel (/admincss/)
**Purpose**: Platform administration and oversight
**Key Files**:
- `index.html` - Admin interface
- `admin-dashboard.css` - Admin styling
- `admin-dashboard.js` - Admin functionality

**Sections**: Dashboard, Users, Vendors, Products, Orders, Finances, Analytics, Security, Settings, Support

## 🐉 Dostik AI Integration
**Character**: Wise Nordic dragon assistant
**Features**:
- Floating wisdom tips
- Context-aware guidance
- Performance celebrations
- Cultural insights

**Location**: Positioned outside sidebar to avoid menu interference

## 🎨 Design System
**Theme**: Nordic minimalism with glassmorphism
**Colors**: Forest greens (#2d6853), earth tones (#8b6d47)
**Layout**: CSS Grid/Flexbox, mobile-first responsive
**Animations**: CSS transitions, performance optimized

## ⚡ Performance Optimizations
- CSS variables for theming
- Hardware-accelerated animations
- `will-change` and `contain` properties
- `requestAnimationFrame` for smooth initialization
- Accessibility features (reduced motion, high contrast)

## 🔧 Recent Enhancements
### Vendor Panel v2.0
- ✅ Added 4 new sections (Returns, Store Management, Shipping, SEO)
- ✅ Fixed Dostik sidebar positioning conflict
- ✅ Enhanced mobile responsiveness
- ✅ Performance and accessibility improvements

### Technical Improvements
- ✅ CSS optimization (faster transitions, lighter shadows)
- ✅ JavaScript performance (tab visibility checks)
- ✅ Responsive design fixes
- ✅ Z-index hierarchy management

## 🛠 Common Tasks

### Adding New Vendor Panel Section
1. Add menu item in sidebar with `data-section="name"`
2. Create section HTML with `id="name-section"`
3. Add case in `loadSectionData()` method
4. Create corresponding `loadNameData()` method

### Customizing Dostik Tips
Edit tips array in vendor-dashboard.js:
```javascript
const tips = [
    "Your custom wisdom here...",
    // Add more tips
];
```

### Theme Customization
Modify CSS variables:
```css
:root {
    --vendor-primary: #your-color;
    --vendor-secondary: #your-color;
    /* etc */
}
```

## 🚨 Important Notes
- **Dostik Positioning**: Always outside sidebar to prevent menu interference
- **Mobile Navigation**: Sidebar toggles with dostik wisdom box sync
- **Z-Index Hierarchy**: Header(1000) > Sidebar(999) > Dostik tips(1010)
- **Performance**: Use `transform` over position changes for animations

## 🔍 Debugging Tips
- Check console for Dostik initialization messages
- Verify section navigation with data-section attributes
- Test mobile sidebar toggle functionality
- Validate CSS variable inheritance

## 📱 Browser Testing
- Chrome 90+ (full support)
- Firefox 88+ (full support)
- Safari 14+ (full support)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Key Features to Understand
1. **Section-based Navigation**: JavaScript switches content sections
2. **Dostik AI**: Floating tips with personality and wisdom
3. **Responsive Design**: Mobile-first with breakpoints at 768px, 480px
4. **Performance First**: Optimized animations and transitions
5. **Accessibility**: ARIA labels, focus states, reduced motion support

---
*This file helps Claude Code quickly understand the project structure and recent enhancements.*