// Controlla la memoria di progetto: file della sezione 2.1 presenti e intestazioni obbligatorie.
// Uso: node scripts/check-docs.mjs  (esce con codice 1 se manca qualcosa)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REQUIRED = {
  'CLAUDE.md': ["## Cos'è questo progetto", '## Stack', '## Comandi essenziali', '## Mappa di docs/', '## Regole non negoziabili', '## Stato attuale'],
  '.claude/goal.md': [
    'Condizione da incollare in /goal',
    'Autorizzazioni date dall',
    'Vincoli non negoziabili',
    'Convenzioni di test',
    'Definizione di «fatto»',
    'Resoconto finale',
  ],
  '.claude/loop.md': ['git status', 'verify.ps1', 'BUGS.md'],
  'docs/JOURNAL.md': ["Da fare con l'utente", 'T8.8', 'T9.M1', 'T9.M2'],
  'docs/BUGS.md': ['## Aperti', '## Chiusi', '## Idee'],
  'docs/DECISIONS.md': ['## ADR-001', '## ADR-009', '**Stato:**', '**Decisione:**'],
  'docs/ROADMAP.md': ['Regole di avanzamento', 'G1', 'G8', 'Step 0', 'Step 9'],
  'docs/DESIGN.md': ['Perimetro v1', 'Fuori perimetro'],
  'docs/DESIGN-SYSTEM.md': ['Colori', 'Tipografia', 'Componenti'],
  'docs/ARCHITECTURE.md': ['Database', 'API', 'Dipendenze'],
  'docs/ANALYSIS.md': ['Stack scelto', 'Rischi', 'Decisioni aperte'],
  'docs/FEASIBILITY.md': ['Requisito', 'Decisioni aperte'],
  'docs/GLOSSARY.md': ['| Termine | Significato | Dove compare nel codice |', 'public_id', 'PUBLIC_BASE_URL', 'media orfano'],
  'docs/CONSOLE.md': ['npm run dev', 'npm run verify', 'media:cleanup'],
};

/** Facoltativo per il controllo (ignorato da git): se manca si segnala soltanto. */
export const LOCAL_ONLY = 'docs/local DBs.txt';

export function checkDocs(rootDir) {
  const problems = [];
  const warnings = [];
  for (const [file, headings] of Object.entries(REQUIRED)) {
    const abs = path.join(rootDir, file);
    if (!fs.existsSync(abs)) {
      problems.push(`manca il file ${file}`);
      continue;
    }
    const text = fs.readFileSync(abs, 'utf8');
    for (const h of headings) if (!text.includes(h)) problems.push(`${file}: manca «${h}»`);
  }
  if (!fs.existsSync(path.join(rootDir, LOCAL_ONLY))) warnings.push(`${LOCAL_ONLY} non presente (promemoria locale delle credenziali)`);
  return { ok: problems.length === 0, problems, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { ok, problems, warnings } = checkDocs(root);
  for (const w of warnings) console.log(`avviso: ${w}`);
  if (ok) console.log(`check-docs: OK (${Object.keys(REQUIRED).length} file controllati)`);
  else {
    for (const p of problems) console.log(`errore: ${p}`);
    console.log(`check-docs: FAIL (${problems.length} problemi)`);
    process.exit(1);
  }
}
