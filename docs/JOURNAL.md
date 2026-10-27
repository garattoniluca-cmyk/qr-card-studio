# JOURNAL — Diario delle sessioni

Voci in ordine cronologico inverso (la più recente in alto).

> ### Da fare con l'utente
> Verifiche manuali (M) in sospeso, non bloccano l'esecuzione autonoma:
> - **T8.8** — scansione del QR da smartphone in LAN. Prima la rete Ethernet va impostata come «Privata» e va eseguito `scripts\firewall-windows.ps1` come amministratore.
> - **T9.M1** — stampa reale del cartellino (`/admin/cards/:id/tag`) e scansione del QR stampato.
> - **T9.M2** — prova d'uso dell'editor con una scheda vera.

---

## 2026-10-27 — Step 5: URL pubblico e QR — IN CORSO
**Fatto:**
- Monorepo `client/` + `server/` + `shared/`. Database `infoqrshow` portato a `utf8mb4_unicode_ci`; creati gli utenti `qrcard_app` e `qrcard_test` (ADR-008, ADR-010).
- Migrazione `001_init.sql`.
- API: schede, media, QR, impostazioni, login (`server/src/*`).
- Client: dashboard, editor TipTap 3, impostazioni, vista pubblica, cartellino, 404 (`client/src/*`). Commit `a0b64e1`.
- Prova manuale completa nel browser: login, «Carica esempio», editor con anteprima live, upload dello sfondo, salvataggio, QR verso `http://192.168.1.6:5173/p/…`, Impostazioni con «Prova URL», vista pubblica a 375 px dall'IP LAN, 404 curata.

**Verifiche:** 16 test U/I dello step 5 superati, database di test creati e distrutti. Verify non ancora disponibile.
**Decisioni:** ADR-010 … ADR-017.
**Difetti:** BUG-001 chiuso.
**Resta da fare:** T5.7 e T5.8 (E con Playwright); test degli step 0–4 e 6–9; `scripts/verify.ps1`.

| Test | Esito | Evidenza |
|---|---|---|
| T5.1 | ✅ | U: 2/2 superati — test-results/step-5/unit-it.txt |
| T5.2 | ✅ | U: 7/7 combinazioni superate — test-results/step-5/unit-it.txt |
| T5.3 | ✅ | I: 3/3 (PNG, SVG, QR pubblico) decodificati con jsQR — test-results/step-5/unit-it.txt |
| T5.4 | ✅ | I: 1/1 — test-results/step-5/unit-it.txt |
| T5.5 | ✅ | I: 1/1, righe di `cards` identiche prima e dopo — test-results/step-5/unit-it.txt |
| T5.6 | ✅ | U 1/1 + I 1/1 — test-results/step-5/unit-it.txt |
| T5.7 | ⏳ | da fare (E) |
| T5.8 | ⏳ | da fare (E) |
