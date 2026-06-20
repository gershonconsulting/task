// Web Crypto PBKDF2 password hashing — works on Cloudflare edge runtime (no Node.js needed)
// Format: pbkdf2:sha256:310000:<salt_hex>:<hash_hex>

const ITERATIONS = 310_000;
const HASH = 'SHA-256';

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexDecode(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr.buffer as ArrayBuffer;
}

async function derive(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: HASH, salt, iterations: ITERATIONS },
    key, 256
  );
}

export async function hashPassword(password: string): Promise<string> {
  const saltView = new Uint8Array(16);
  crypto.getRandomValues(saltView);
  const salt = saltView.buffer as ArrayBuffer;
  const hash = await derive(password, salt);
  return `pbkdf2:sha256:${ITERATIONS}:${hexEncode(salt)}:${hexEncode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const salt = hexDecode(parts[3]);
  const expectedHash = parts[4];
  const derived = await derive(password, salt);
  return hexEncode(derived) === expectedHash;
}
