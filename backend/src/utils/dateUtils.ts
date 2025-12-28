/**
 * Date Utilities
 * Central date/time functions for consistent timezone handling
 */

/**
 * Türkiye iş günü tarihi hesaplama
 * Tüm siftah işlemlerinde bu fonksiyon kullanılır
 * 
 * @returns {string} YYYY-MM-DD formatında Türkiye saatine göre tarih
 * 
 * @example
 * const today = getTurkeyBusinessDateString();
 * // Returns: "2025-12-09" (Turkey time)
 */
function getTurkeyBusinessDateString(): string {
    const now = new Date();

    // Türkiye UTC+3 offset (milisaniye cinsinden)
    const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

    // UTC zamanına Türkiye offset'ini ekle
    const turkeyTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + TURKEY_OFFSET_MS);

    // YYYY-MM-DD formatına çevir
    const year = turkeyTime.getFullYear();
    const month = String(turkeyTime.getMonth() + 1).padStart(2, '0');
    const day = String(turkeyTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export { getTurkeyBusinessDateString };

// CommonJS compatibility
module.exports = { getTurkeyBusinessDateString };
