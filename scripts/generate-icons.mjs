/**
 * Generates the PWA icon set as real PNG files.
 *
 * PNGs are encoded by hand with Node's built-in zlib rather than pulling in an
 * image library: the artwork is a few flat shapes, so a dependency would cost
 * more than the 60 lines it saves.
 *
 * Run with: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BACKGROUND = [10, 14, 23]; // matches --app-bg
const FOREGROUND = [16, 185, 129]; // matches --app-primary

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes RGB pixel data as a PNG buffer. */
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Each scanline is prefixed with its filter type (0 = none).
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Draws a dumbbell: a bar with a plate at each end.
 * `inset` shrinks the artwork for maskable icons, whose edges get cropped.
 */
function drawIcon(size, inset) {
  const pixels = Buffer.alloc(size * size * 3);
  const usable = size * (1 - inset * 2);
  const origin = size * inset;

  const inRect = (x, y, left, top, width, height) =>
    x >= left && x < left + width && y >= top && y < top + height;

  /** Centred horizontal band, expressed in fractions of the usable area. */
  const band = (x, y, leftFraction, widthFraction, heightFraction) =>
    inRect(
      x,
      y,
      origin + usable * leftFraction,
      origin + (usable - usable * heightFraction) / 2,
      usable * widthFraction,
      usable * heightFraction,
    );

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const onBar = band(x, y, 0.2, 0.6, 0.11);
      // Two plates per side, the outer one shorter, which is what reads as a dumbbell.
      const onPlates =
        band(x, y, 0.14, 0.11, 0.46) ||
        band(x, y, 0.75, 0.11, 0.46) ||
        band(x, y, 0.03, 0.08, 0.28) ||
        band(x, y, 0.89, 0.08, 0.28);

      const colour = onBar || onPlates ? FOREGROUND : BACKGROUND;
      const offset = (y * size + x) * 3;
      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
    }
  }

  return encodePng(size, size, pixels);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.1 },
  { file: 'icon-512.png', size: 512, inset: 0.1 },
  // Maskable icons are cropped to a circle by some launchers, so keep clear of the edge.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.2 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.1 },
];

for (const target of targets) {
  writeFileSync(join(OUTPUT_DIR, target.file), drawIcon(target.size, target.inset));
  console.log(`generated ${target.file} (${target.size}x${target.size})`);
}
