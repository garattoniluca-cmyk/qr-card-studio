import { describe, expect, it } from 'vitest';
import { detectLanIps, resolvePublicBaseUrl } from '../src/publicUrl.js';
import { normalizeHttpUrl } from '../src/validation.js';

const IFACES = {
  'vEthernet (Default Switch)': [{ address: '172.17.80.1', family: 'IPv4', internal: false }],
  'vEthernet (WSL)': [{ address: '172.25.16.1', family: 'IPv4', internal: false }],
  'Docker Desktop': [{ address: '10.0.75.1', family: 'IPv4', internal: false }],
  'VirtualBox Host-Only Network': [{ address: '192.168.56.1', family: 'IPv4', internal: false }],
  Ethernet: [
    { address: 'fe80::1', family: 'IPv6', internal: false },
    { address: '192.168.1.20', family: 'IPv4', internal: false },
  ],
  'Loopback Pseudo-Interface 1': [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
};

describe('@step5 URL pubblico — unitari', () => {
  it('T5.1 — rilevamento IP: scarta adattatori virtuali e sceglie 192.168.1.20', () => {
    const ips = detectLanIps(IFACES);
    expect(ips.map((i) => i.address)).toEqual(['192.168.1.20']);
    expect(resolvePublicBaseUrl({ port: 8080, interfaces: IFACES })).toMatchObject({ url: 'http://192.168.1.20:8080', source: 'auto-lan' });
  });

  it('T5.1 — senza IP privati si ripiega su localhost con un avviso', () => {
    const only = { Wifi: [{ address: '169.254.10.1', family: 'IPv4', internal: false }], 'vEthernet (WSL)': IFACES['vEthernet (WSL)'] };
    const r = resolvePublicBaseUrl({ port: 8080, interfaces: only });
    expect(r.url).toBe('http://localhost:8080');
    expect(r.source).toBe('auto-localhost');
    expect(r.warning).toMatch(/solo su questo PC/);
  });

  it.each([
    ['https://set.it/', 'https://env.it', 'https://set.it', 'settings'],
    ['https://set.it', '', 'https://set.it', 'settings'],
    ['', 'https://env.it/', 'https://env.it', 'env'],
    [null, 'https://env.it', 'https://env.it', 'env'],
    ['', '', 'http://192.168.1.20:9000', 'auto-lan'],
    [null, null, 'http://192.168.1.20:9000', 'auto-lan'],
    ['   ', '  ', 'http://192.168.1.20:9000', 'auto-lan'],
  ])('T5.2 — priorità settings → env → auto (settings=%j, env=%j)', (settingsValue, envValue, url, source) => {
    const r = resolvePublicBaseUrl({ settingsValue, envValue, port: 9000, interfaces: IFACES });
    expect(r.url).toBe(url);
    expect(r.source).toBe(source);
  });

  it('T5.6 — URL delle Impostazioni: solo http/https, slash finale normalizzato', () => {
    expect(normalizeHttpUrl('https://esempio.it/', { trimSlash: true })).toBe('https://esempio.it');
    expect(normalizeHttpUrl('http://192.168.1.6:8080///', { trimSlash: true })).toBe('http://192.168.1.6:8080');
    expect(normalizeHttpUrl('  https://esempio.it/schede/  ', { trimSlash: true })).toBe('https://esempio.it/schede');
    for (const bad of ['ftp://esempio.it', 'javascript:alert(1)', 'esempio.it', '', 'https://user:pw@esempio.it', 'mailto:a@b.it']) {
      expect(() => normalizeHttpUrl(bad, { trimSlash: true }), bad).toThrowError();
    }
  });
});
