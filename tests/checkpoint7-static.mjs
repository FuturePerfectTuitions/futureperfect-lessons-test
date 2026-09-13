import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const viewer = fs.readFileSync(new URL('../src/protected-viewer.js', import.meta.url), 'utf8');

assert.equal((index.match(/<script/gi) || []).length, 1, 'index must load one core module entry only');
assert.match(index, /src="\/src\/app\.js"/);
for (const legacy of ['phase5.css','phase6.js','phase7.js','phase8.js','phase9.js','phase10.js','phase11','phase16','phase18','phase19','phase20','phase21','phase22','phase23','phase24','pdf.min.js']) {
  assert.equal(index.includes(legacy), false, `legacy startup asset must not be referenced: ${legacy}`);
}
assert.match(app, /import '\.\/styles\.css'/);
assert.match(app, /AbortController/);
assert.match(app, /inflight = new Map\(\)/);
assert.match(app, /navigationEpoch/);
assert.match(app, /import\('\.\/protected-viewer\.js'\)/);
assert.match(app, /player\.src = apiUrl\(resourceOpenPath\(video\)\)/);
assert.match(app, /target="_blank"/);
assert.equal(/new Blob\s*\(/.test(app), false, 'ordinary resources must not use Blob reconstruction');
assert.equal(/createObjectURL/.test(app), false, 'ordinary resources must not use object URLs');
assert.equal(/\/api\/v2\/student\/subjects\//.test(app), false, 'subject selection must stay local');
assert.equal(/pdfjs-dist/.test(app), false, 'PDF.js must not be in the core app module');
assert.match(viewer, /pdfjs-dist\/build\/pdf\.mjs/);
assert.match(viewer, /pdf\.worker\.mjs\?url/);
assert.match(viewer, /credentials: 'include'/);
assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /grid-template-columns: minmax\(0,1fr\) 118px/);
assert.match(css, /@media print \{ body \{ display: none !important; \} \}/);

console.log(JSON.stringify({
  marker: 'REBUILD_CHECKPOINT7_FRONTEND_STATIC_PASS',
  oneCoreEntry: true,
  oneCompiledCssSource: true,
  lazyProtectedViewer: true,
  subjectSelectionLocal: true,
  abortAndDedupPresent: true,
  videoLazy: true,
  ordinaryBlobReconstruction: false
}));
