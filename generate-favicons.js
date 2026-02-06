import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicons() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const svgPath = path.join(__dirname, 'public/assets/svg/minios_icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  const sizes = [16, 32, 180, 192, 512];

  for (const size of sizes) {
    await page.setViewport({ width: size, height: size });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: transparent; }
            svg { width: 100%; height: 100%; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `;
    
    await page.setContent(html);
    
    const outputPath = path.join(__dirname, 'public', `favicon-${size}x${size}.png`);
    await page.screenshot({
      path: outputPath,
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size }
    });
    
    console.log(`✓ Generated ${outputPath}`);
  }

  // Create favicon.ico (16x16)
  const favicon16Path = path.join(__dirname, 'public', 'favicon-16x16.png');
  const faviconIcoPath = path.join(__dirname, 'public', 'favicon.ico');
  fs.copyFileSync(favicon16Path, faviconIcoPath);
  console.log(`✓ Created favicon.ico`);

  await browser.close();
  console.log('✓ All favicons generated successfully!');
}

generateFavicons().catch(console.error);
