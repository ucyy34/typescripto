/**
 * Variant Types Configuration
 * Defines available variant types and their predefined values
 * Used for cascading dropdown in vendor panel
 */

const VARIANT_TYPES = {
    beden: {
        label: 'Beden',
        icon: '📏',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    },
    numara: {
        label: 'Numara',
        icon: '👟',
        values: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
    },
    boyut: {
        label: 'Boyut',
        icon: '📐',
        values: ['Mini', 'Küçük', 'Orta', 'Büyük', 'XL', 'XXL']
    },
    agirlik: {
        label: 'Ağırlık',
        icon: '⚖️',
        values: ['25g', '50g', '100g', '250g', '500g', '1kg', '2kg', '5kg', '10kg']
    },
    hacim: {
        label: 'Hacim',
        icon: '🧴',
        values: ['50ml', '100ml', '250ml', '500ml', '750ml', '1L', '2L', '5L']
    },
    malzeme: {
        label: 'Malzeme',
        icon: '🧵',
        values: ['Pamuk', 'Yün', 'İpek', 'Keten', 'Polyester', 'Deri', 'Süet', 'Kadife', 'Saten']
    },
    diger: {
        label: 'Diğer',
        icon: '📦',
        values: null // Free text input
    }
};

/**
 * Get all variant types for dropdown
 */
function getVariantTypes() {
    return Object.entries(VARIANT_TYPES).map(([key, config]) => ({
        key,
        label: config.label,
        icon: config.icon,
        hasPresetValues: config.values !== null
    }));
}

/**
 * Get values for a specific variant type
 */
function getVariantValues(typeKey) {
    const config = VARIANT_TYPES[typeKey];
    if (!config) return [];
    return config.values || [];
}

/**
 * Validate variant type
 */
function isValidVariantType(typeKey) {
    return VARIANT_TYPES.hasOwnProperty(typeKey);
}

/**
 * Generate SKU suffix from variant
 */
function generateSKUSuffix(colorName, variantType, variantValue) {
    let suffix = '';

    // Add color abbreviation
    if (colorName) {
        const colorCode = colorName
            .substring(0, 3)
            .toUpperCase()
            .replace(/[ıİ]/g, 'I')
            .replace(/[şŞ]/g, 'S')
            .replace(/[çÇ]/g, 'C')
            .replace(/[ğĞ]/g, 'G')
            .replace(/[üÜ]/g, 'U')
            .replace(/[öÖ]/g, 'O');
        suffix += colorCode;
    }

    // Add variant value
    if (variantValue) {
        const valueCode = variantValue
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .substring(0, 4);
        if (suffix) suffix += '-';
        suffix += valueCode;
    }

    return suffix;
}

module.exports = {
    VARIANT_TYPES,
    getVariantTypes,
    getVariantValues,
    isValidVariantType,
    generateSKUSuffix
};
