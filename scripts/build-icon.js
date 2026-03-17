'use strict';

/**
 * Convert build/icon.svg → build/icon.ico (Windows) + build/icon.png (Linux)
 * Requires: sharp, to-ico  (installed as devDependencies)
 */

const path = require('path');
const fs   = require('fs');

const sharp = require('sharp');
const toIco = require('to-ico');

const ROOT   = path.join(__dirname, '..');
const SVG    = path.join(ROOT, 'build', 'icon.svg');
const ICO    = path.join(ROOT, 'build', 'icon.ico');
const PNG    = path.join(ROOT, 'build', 'icon.png');

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svgBuf = fs.readFileSync(SVG);
  console.log('Building icon from', SVG);

  // Generate the 1024×1024 PNG for Linux / general use
  await sharp(svgBuf).resize(1024, 1024).png().toFile(PNG);
  console.log('  ✓ icon.png (1024×1024)');

  // Generate PNG buffers at each ICO size
  const pngBuffers = await Promise.all(
    ICO_SIZES.map(size =>
      sharp(svgBuf).resize(size, size).png().toBuffer()
    )
  );

  // Combine into a single .ico file
  const icoBuf = await toIco(pngBuffers);
  fs.writeFileSync(ICO, icoBuf);
  console.log(`  ✓ icon.ico (${ICO_SIZES.join(', ')}px)`);

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
