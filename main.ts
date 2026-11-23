// AURORA BAY — entrypoint: copies game/ and screenshots/ to the output
// directory and writes /output/dossier.json with buildDossier from the
// vendored make.fun library (vendor/makefun-game.ts, unchanged).
// Runs on Node 22 with no install: `MAKEFUN_OUTPUT_DIR=out node main.ts`
// (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const entryDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name) {
  const from = join(entryDir, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the entry directory`);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
copyTree('screenshots');
// Fail loudly instead of handing in an empty game: the judge refuses an
// entry with no screenshots, and a silent empty dossier is worse.
const shotDir = join(outputDir, 'screenshots');
const shots = readdirSync(shotDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (shots.length === 0) throw new Error('main.ts: no screenshots in screenshots/ — capture them first');
for (const f of shots) {
  if (statSync(join(shotDir, f)).size === 0) throw new Error(`main.ts: screenshot ${f} is empty`);
}
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, CAPS));
console.log(`AURORA BAY handed in: ${outputDir} (${shots.length} screenshots, dossier written)`);
