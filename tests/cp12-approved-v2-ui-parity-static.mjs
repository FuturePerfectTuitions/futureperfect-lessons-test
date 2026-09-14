import assert from 'node:assert/strict';
import fs from 'node:fs';
const app = fs.readFileSync('src/app.js','utf8');
const css = fs.readFileSync('src/styles.css','utf8');

// Approved Portal V2 presentation parity.
assert.ok(app.includes("return first ? `${first}'s Portal` : 'Student Portal'"));
assert.ok(app.includes('EYE_OPEN'));
assert.ok(app.includes('EYE_CLOSED'));
assert.ok(app.includes('aria-pressed="false">${EYE_OPEN}</button>'));
assert.ok(!app.includes('>Show</button>'));
assert.ok(app.includes('class="choice-card subject-maths"'));
assert.ok(app.includes('class="choice-card subject-english"'));
assert.ok(app.includes("backButton('back-subjects','Subjects')"));
assert.ok(app.includes("backButton('back-lessons','Lessons')"));
assert.ok(app.includes('SATs Practice Papers'));
assert.ok(app.includes('lesson-description-toggle'));
assert.ok(!app.includes("?'PreLesson only':'Available'"));
assert.ok(css.includes('.floating-back{position:fixed'));
assert.ok(css.includes('background:var(--navy);color:#fff'));
assert.ok(css.includes('.subject-maths{background:linear-gradient'));
assert.ok(css.includes('.subject-english{background:linear-gradient'));
assert.ok(css.includes('body::before'));

// Mandatory retained collapsible hierarchy and VR grouping.
for (const marker of ['VR PreLesson','VR Homework','Verbal Reasoning','data-resource-toggle','aria-expanded="false"']) assert.ok(app.includes(marker), marker);
assert.ok(app.includes("collapsibleResourceSection('verbal-reasoning'"));
assert.ok(app.includes("resourceSubgroup('Additional VR Answer Packs'"));

// Fast architecture/security anchors must remain intact; no legacy API/polling layer is introduced.
for (const endpoint of ['/api/v2/student/home','/api/v2/student/views/','/api/v2/student/lessons/']) assert.ok(app.includes(endpoint), endpoint);
assert.ok(app.includes("cache: method === 'GET' ? 'default' : 'no-store'"));
assert.ok(app.includes("player.src = apiUrl(resourceOpenPath(video))"));
assert.ok(app.includes("method:'POST', body:{ password:"));
assert.ok(app.includes("await import('./protected-viewer.js')"));
assert.ok(!app.includes('/api/admin/'));
assert.ok(!app.includes('setInterval('));
assert.ok(!app.includes('pdfjs-dist') && !app.includes('pdfjsLib'));
console.log('CP12 approved V2 UI parity static gates: PASS');
