/**
 * Kanzulilm International — PWA Icon Generator
 * 
 * Usage: node generate-icons.js
 * Requires: npm install sharp
 * 
 * Place logo.png in root folder and run this script.
 * It will generate all required PWA icons in /icons/ directory.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'logo.png');
const OUTPUT_DIR = path.join(__dirname, 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons from logo.png...\n');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 2, g: 6, b: 23, alpha: 1 } // #020617 background
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ icon-${size}x${size}.png`);
  }

  console.log('\nAll icons generated in /icons/ directory.');
  console.log('Upload the /icons/ folder to your server root.');
}

generateIcons().catch(console.error);
