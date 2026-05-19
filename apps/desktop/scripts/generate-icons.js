// Generates solid-colour PNG icons using only Node.js built-ins (no deps required).
// Run automatically via postinstall. Outputs resources/tray.png and resources/icon.png.

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const TABLE = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t.push(c)
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function solidPNG(size, r, g, b) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const raw = Buffer.allocUnsafe(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const base = y * (1 + size * 3)
    raw[base] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3] = r
      raw[base + 1 + x * 3 + 1] = g
      raw[base + 1 + x * 3 + 2] = b
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ICO file wrapping a PNG (supported since Windows Vista)
function pngToIco(pngBuf) {
  const w = 0  // 0 means 256
  const h = 0
  const dataOffset = 6 + 16  // ICONDIR + 1 ICONDIRENTRY

  const header = Buffer.allocUnsafe(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: icon
  header.writeUInt16LE(1, 4)   // count: 1

  const entry = Buffer.allocUnsafe(16)
  entry[0] = w; entry[1] = h; entry[2] = 0; entry[3] = 0
  entry.writeUInt16LE(1, 4)    // planes
  entry.writeUInt16LE(32, 6)   // bit count
  entry.writeUInt32LE(pngBuf.length, 8)
  entry.writeUInt32LE(dataOffset, 12)

  return Buffer.concat([header, entry, pngBuf])
}

const outDir = path.join(__dirname, '..', 'resources')
fs.mkdirSync(outDir, { recursive: true })

// Brand blue #2563eb = rgb(37, 99, 235)
const [r, g, b] = [37, 99, 235]

const tray = solidPNG(32, r, g, b)
const icon = solidPNG(256, r, g, b)

fs.writeFileSync(path.join(outDir, 'tray.png'), tray)
fs.writeFileSync(path.join(outDir, 'icon.png'), icon)
fs.writeFileSync(path.join(outDir, 'icon.ico'), pngToIco(icon))

console.log('✓ Icons generated in apps/desktop/resources/')
