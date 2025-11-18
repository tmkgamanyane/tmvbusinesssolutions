// Script to update all HTML files with responsive features
// This script will be used to batch update HTML files

const fs = require('fs');
const path = require('path');

const responsiveHead = `    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="description" content="TMV Business Solutions - Professional business services">
    <meta name="theme-color" content="#3498db">`;

const mobileScript = `    <script src="../scripts/mobile-responsive.js"></script>`;
const mobileScriptRoot = `    <script src="scripts/mobile-responsive.js"></script>`;

const hamburgerButton = `        <!-- Hamburger Menu Button -->
        <button class="hamburger" id="hamburgerMenu" aria-label="Toggle navigation menu">
            <span></span>
            <span></span>
            <span></span>
        </button>`;

const mobileOverlay = `    <!-- Mobile Overlay -->
    <div class="mobile-overlay" id="mobileOverlay"></div>`;

function updateHTMLFile(filePath, isRootFile = false) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add responsive meta tags if not present
        if (!content.includes('user-scalable=no')) {
            content = content.replace(
                /<meta name="viewport"[^>]*>/i,
                responsiveHead
            );
        }
        
        // Add mobile script if not present
        if (!content.includes('mobile-responsive.js')) {
            const scriptToAdd = isRootFile ? mobileScriptRoot : mobileScript;
            content = content.replace(
                /<script src="[^"]*navigation-utils\.js"[^>]*><\/script>/i,
                '$&\n' + scriptToAdd
            );
        }
        
        // Add hamburger button if header exists and hamburger doesn't
        if (content.includes('<header') && !content.includes('class="hamburger"')) {
            content = content.replace(
                /<\/div>\s*<\/header>/i,
                '</div>\n\n' + hamburgerButton + '\n    </header>'
            );
        }
        
        // Add mobile overlay if not present
        if (content.includes('<nav') && !content.includes('mobile-overlay')) {
            content = content.replace(
                /<nav(?:\s+[^>]*)?>/, 
                mobileOverlay + '\n\n    $&'
            );
        }
        
        // Update nav to have ID if missing
        if (content.includes('<nav') && !content.includes('id="navigationMenu"')) {
            content = content.replace(
                /<nav(?:\s+[^>]*)?>/,
                '<nav id="navigationMenu">'
            );
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
    }
}

function findAndUpdateHTMLFiles(dir, isRootDir = false) {
    try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
                findAndUpdateHTMLFiles(filePath, false);
            } else if (file.endsWith('.html')) {
                updateHTMLFile(filePath, isRootDir);
            }
        });
    } catch (error) {
        console.error(`❌ Error reading directory ${dir}:`, error.message);
    }
}

// Run the update
console.log('🔄 Starting HTML files update for responsive design...');
findAndUpdateHTMLFiles('.', true);
console.log('✅ HTML files update completed!');