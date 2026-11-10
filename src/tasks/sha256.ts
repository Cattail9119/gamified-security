// Власна реалізація SHA-256: crypto.subtle недоступний поза захищеним контекстом (http, file://),
// а для навчального завдання потрібна синхронна перевірка.
const primes: number[] = [];
for (let n = 2; primes.length < 64; n++) {
  if (primes.every((p) => n % p !== 0)) primes.push(n);
}
const frac = (x: number) => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0;
const K = primes.map((p) => frac(Math.cbrt(p)));
const H0 = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256Hex(text: string): string {
  const data = new TextEncoder().encode(text);
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  view.setUint32(padded.length - 4, bitLen >>> 0);

  const h = [...H0];
  const w = new Array<number>(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    const v = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + v[i]) >>> 0;
  }
  return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}
