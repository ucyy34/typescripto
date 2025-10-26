#!/usr/bin/env node

/**
 * Production Build Script
 * Removes console.log statements and optimizes code for production
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build...\n');

// Configuration
const config = {
    jsDir: './assets/js',
    backupDir: './assets/js-backup',
    removeConsole: true,
    minify: false, // Set to true if you want basic minification
    verbose: true
};

// Create backup directory
if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log('✅ Created backup directory\n');
}

// Get all JS files
function getJSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...getJSFiles(fullPath));
        } else if (item.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Remove console statements
function removeConsoleLogs(code) {
    // Remove console.log, console.warn, console.info, console.debug
    // Keep console.error for production debugging
    const patterns = [
        /console\.log\([^)]*\);?/g,
        /console\.warn\([^)]*\);?/g,
        /console\.info\([^)]*\);?/g,
        /console\.debug\([^)]*\);?/g,
        /console\.table\([^)]*\);?/g,
        /console\.group\([^)]*\);?/g,
        /console\.groupEnd\([^)]*\);?/g,
        /console\.time\([^)]*\);?/g,
        /console\.timeEnd\([^)]*\);?/g
    ];
    
    let cleaned = code;
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned;
}

// Basic minification
function minifyCode(code) {
    // Remove comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    code = code.replace(/\/\/.*/g, '');
    
    // Remove extra whitespace
    code = code.replace(/\s+/g, ' ');
    code = code.replace(/\s*([{}();,:])\s*/g, '$1');
    
    return code.trim();
}

// Process files
const jsFiles = getJSFiles(config.jsDir);
let processedCount = 0;
let removedLines = 0;

console.log(`📦 Found ${jsFiles.length} JavaScript files\n`);

jsFiles.forEach(filePath => {
    try {
        // Read original file
        const originalCode = fs.readFileSync(filePath, 'utf8');
        const originalLines = originalCode.split('\n').length;
        
        // Backup original file
        const backupPath = filePath.replace(config.jsDir, config.backupDir);
        const backupDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.writeFileSync(backupPath, originalCode);
        
        // Process code
        let processedCode = originalCode;
        
        if (config.removeConsole) {
            processedCode = removeConsoleLogs(processedCode);
        }
        
        if (config.minify) {
            processedCode = minifyCode(processedCode);
        }
        
        // Write processed file
        fs.writeFileSync(filePath, processedCode);
        
        const processedLines = processedCode.split('\n').length;
        const linesRemoved = originalLines - processedLines;
        removedLines += linesRemoved;
        
        if (config.verbose) {
            const fileName = path.basename(filePath);
            const sizeBefore = (originalCode.length / 1024).toFixed(2);
            const sizeAfter = (processedCode.length / 1024).toFixed(2);
            const reduction = ((1 - processedCode.length / originalCode.length) * 100).toFixed(1);
            
            console.log(`✅ ${fileName}`);
            console.log(`   Size: ${sizeBefore}KB → ${sizeAfter}KB (${reduction}% reduction)`);
            console.log(`   Lines removed: ${linesRemoved}\n`);
        }
        
        processedCount++;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Build Summary');
console.log('='.repeat(50));
console.log(`✅ Processed: ${processedCount}/${jsFiles.length} files`);
console.log(`🗑️  Removed: ${removedLines} lines`);
console.log(`💾 Backup: ${config.backupDir}`);
console.log('='.repeat(50));

console.log('\n🎉 Production build complete!');
console.log('\n💡 Tips:');
console.log('   - Test your site thoroughly before deploying');
console.log('   - Backup files are in:', config.backupDir);
console.log('   - To restore: copy files from backup directory');
console.log('\n');
