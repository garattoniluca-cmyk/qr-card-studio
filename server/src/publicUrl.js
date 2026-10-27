// Risoluzione del PUBLIC_BASE_URL: settings → env → IP LAN automatico.
import os from 'node:os';

const VIRTUAL_ADAPTER = /(vethernet|virtualbox|vmware|vmnet|wsl|docker|hyper-v|vboxnet|loopback|bluetooth|tailscale|zerotier|br-|veth)/i;

export function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return p[0] === 10 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31);
}

/**
 * Elenca gli IPv4 privati non interni, escludendo gli adattatori virtuali.
 * `interfaces` ha la forma di os.networkInterfaces() (iniettabile nei test).
 */
export function detectLanIps(interfaces = os.networkInterfaces()) {
  const out = [];
  for (const [name, addrs] of Object.entries(interfaces || {})) {
    if (VIRTUAL_ADAPTER.test(name)) continue;
    for (const a of addrs || []) {
      const fam = a.family === 4 ? 'IPv4' : a.family;
      if (fam !== 'IPv4' || a.internal) continue;
      if (!isPrivateIPv4(a.address)) continue;
      out.push({ interface: name, address: a.address });
    }
  }
  // Preferenza: 192.168.x, poi 10.x, poi 172.16-31.x
  const rank = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2);
  return out.sort((a, b) => rank(a.address) - rank(b.address));
}

/**
 * Calcola l'URL pubblico effettivo e la sua origine.
 * @returns {{ url: string, source: 'settings'|'env'|'auto-lan'|'auto-localhost', warning?: string, lanIps: Array }}
 */
export function resolvePublicBaseUrl({ settingsValue, envValue, port, interfaces } = {}) {
  const lanIps = detectLanIps(interfaces);
  const strip = (u) => u.replace(/\/+$/, '');
  if (settingsValue && settingsValue.trim()) return { url: strip(settingsValue.trim()), source: 'settings', lanIps };
  if (envValue && envValue.trim()) return { url: strip(envValue.trim()), source: 'env', lanIps };
  if (lanIps.length) return { url: `http://${lanIps[0].address}:${port}`, source: 'auto-lan', lanIps };
  return {
    url: `http://localhost:${port}`,
    source: 'auto-localhost',
    warning: 'Nessun IP di rete locale rilevato: il QR funzionerà solo su questo PC',
    lanIps,
  };
}

export async function getSetting(pool, key) {
  const [rows] = await pool.execute('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(pool, key, value) {
  await pool.execute(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, value],
  );
}

/** URL pubblico effettivo per la configurazione corrente. */
export async function currentPublicBase(pool, config, interfaces) {
  const settingsValue = await getSetting(pool, 'public_base_url');
  return resolvePublicBaseUrl({
    settingsValue,
    envValue: config.publicBaseUrlEnv,
    port: config.publicPort || config.port,
    interfaces,
  });
}

export function canonicalCardUrl(base, publicId) {
  return `${base.replace(/\/+$/, '')}/p/${publicId}`;
}
