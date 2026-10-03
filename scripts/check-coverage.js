import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const p = spawnSync('node', ['--test', '--experimental-test-coverage', '--test-reporter=lcov', '--test-reporter-destination=coverage.lcov'], { stdio: 'inherit' });
if (p.status !== 0) process.exit(p.status);

let linesHit=0,linesTotal=0,brHit=0,brTotal=0,fnHit=0,fnTotal=0;
const lcov = readFileSync('coverage.lcov','utf8');
for (const l of lcov.split('\n')) {
  if (l.startsWith('LH:')) linesHit += +l.slice(3);
  if (l.startsWith('LF:')) linesTotal += +l.slice(3);
  if (l.startsWith('BRH:')) brHit += +l.slice(4);
  if (l.startsWith('BRF:')) brTotal += +l.slice(4);
  if (l.startsWith('FNH:')) fnHit += +l.slice(4);
  if (l.startsWith('FNF:')) fnTotal += +l.slice(4);
}
const lp = linesTotal ? (linesHit*100/linesTotal) : 0;
const bp = brTotal ? (brHit*100/brTotal) : 0;
const fp = fnTotal ? (fnHit*100/fnTotal) : 0;
console.log(`Coverage: L ${lp.toFixed(2)}% B ${bp.toFixed(2)}% F ${fp.toFixed(2)}%`);
const thr = 95;
if (lp < thr) {
  console.error(`Coverage below ${thr}%`);
  process.exit(1);
}
console.log(`Coverage OK (>= ${thr}%)`);
try { readFileSync('coverage.lcov'); } catch {}
