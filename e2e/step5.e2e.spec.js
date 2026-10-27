import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createCard, decodeQrBuffer, login, resetData, saveShot } from './helpers.js';

test.describe('@step5 @e2e URL pubblico e QR', () => {
  test.beforeEach(async ({ page }) => {
    await resetData();
    await login(page);
  });

  test('T5.7 — Impostazioni: URL effettivo, origine, IP selezionabili e «Prova URL»', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Impostazioni' }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    const value = page.getByTestId('effective-url-value');
    await expect(value).toHaveText(/^http:\/\/.+:18080$/);
    await expect(page.getByTestId('effective-url-source')).toHaveAttribute('data-source', /auto-lan|auto-localhost/);

    // Imposta un URL fisso e verifica origine «settings» (anche sul database)
    await page.getByLabel('URL pubblico (vuoto = automatico)').fill('http://127.0.0.1:18080/');
    await page.getByRole('button', { name: 'Salva URL' }).click();
    await expect(value).toHaveText('http://127.0.0.1:18080');
    await expect(page.getByTestId('effective-url-source')).toHaveAttribute('data-source', 'settings');

    await page.getByRole('button', { name: 'Prova URL' }).click();
    await expect(page.getByTestId('probe-result')).toHaveAttribute('data-state', 'ok');
    await expect(page.getByTestId('probe-result')).toContainText('Raggiungibile');

    // IP selezionabili (se la macchina ne ha): «Usa questo» imposta quell'URL
    const ips = page.getByTestId('lan-ips').getByRole('button', { name: 'Usa questo' });
    if ((await ips.count()) > 0) {
      await ips.first().click();
      await expect(value).toHaveText(/^http:\/\/(192\.168|10\.|172\.)/);
    }
    await saveShot(page, 5, 'T5.7-impostazioni.png');

    // URL non valido: messaggio di errore, nessun salvataggio
    await page.getByLabel('URL pubblico (vuoto = automatico)').fill('ftp://sbagliato');
    await page.getByRole('button', { name: 'Salva URL' }).click();
    await expect(page.getByRole('alert')).toContainText('http');
    await page.getByRole('button', { name: "Torna all'automatico" }).click();
    await expect(page.getByTestId('effective-url-source')).toHaveAttribute('data-source', /auto/);
  });

  test('T5.8 — download PNG e SVG validi, «Copia link» e cartellino', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const card = await createCard(page, { title: 'Lampada QR', sku: 'LMP-1', price: '€ 30' });
    await page.goto(`/admin/cards/${card.id}`);
    const actions = page.getByTestId('qr-actions');
    await expect(actions).toBeVisible();

    for (const kind of ['PNG', 'SVG']) {
      const [download] = await Promise.all([page.waitForEvent('download'), actions.getByRole('link', { name: `Scarica ${kind}` }).click()]);
      expect(download.suggestedFilename()).toBe(`qr-LMP-1.${kind.toLowerCase()}`);
      const buf = await fs.readFile(await download.path());
      if (kind === 'PNG') expect(buf.subarray(1, 4).toString()).toBe('PNG');
      else expect(buf.toString()).toMatch(/^<svg/);
      expect(await decodeQrBuffer(buf)).toBe(card.publicUrl);
    }

    await actions.getByRole('button', { name: 'Copia link' }).click();
    await expect(page.getByTestId('toast').filter({ hasText: 'Link copiato' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(card.publicUrl);

    await actions.getByRole('link', { name: 'Stampa cartellino' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/cards/${card.id}/tag$`));
    await expect(page.getByTestId('qr-tag')).toContainText('Lampada QR');
    const img = page.getByTestId('tag-qr');
    await expect(img).toBeVisible();
    const qrBuf = await (await page.request.get(await img.getAttribute('src'))).body();
    expect(await decodeQrBuffer(qrBuf)).toBe(card.publicUrl);
    await saveShot(page, 5, 'T5.8-cartellino.png');
  });

  test('T5.8 — anteprima nell\'editor mostra il QR della scheda salvata', async ({ page }) => {
    const card = await createCard(page, { title: 'Sedia', sku: 'SD-9' });
    await page.goto(`/admin/cards/${card.id}`);
    const qr = page.getByTestId('live-preview').getByTestId('card-qr');
    await expect(qr).toBeVisible();
    const buf = await (await page.request.get(await qr.getAttribute('src'))).body();
    expect(await decodeQrBuffer(buf)).toBe(card.publicUrl);
    await expect(page.getByTestId('live-preview').getByTestId('qr-target')).toHaveText(card.publicUrl);
  });
});
