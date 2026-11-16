/**
 * Generates PWA icon PNGs from public/logo.png into public/icons/
 * Matches sizes referenced in public/manifest.json.
 * Logo is scaled into the center ~72% safe zone (maskable-friendly).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'public', 'logo.png');
const outDir = path.join(root, 'public', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
/** Inner box ratio for maskable safe zone (content inside ~80% circle). */
const SAFE_RATIO = 0.72;
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
    if (!fs.existsSync(src)) {
        console.error(`Source not found: ${src}`);
        process.exit(1);
    }

    fs.mkdirSync(outDir, { recursive: true });

    const logoBuf = await sharp(src).ensureAlpha().png().toBuffer();
    const meta = await sharp(logoBuf).metadata();
    console.log(`Source: ${path.relative(root, src)} (${meta.width}x${meta.height})`);

    for (const size of SIZES) {
        const inner = Math.max(1, Math.round(size * SAFE_RATIO));
        const resized = await sharp(logoBuf)
            .resize(inner, inner, {
                fit: 'inside',
                withoutEnlargement: false,
            })
            .png()
            .toBuffer();

        const dest = path.join(outDir, `icon-${size}x${size}.png`);
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: BG,
            },
        })
            .composite([{ input: resized, gravity: 'center' }])
            .png({ compressionLevel: 9 })
            .toFile(dest);

        console.log(`Wrote ${path.relative(root, dest)}`);
    }

    console.log('Done.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
