import assert from 'node:assert/strict';
import fs from 'node:fs';

const phase7 = fs.readFileSync('assets/phase7.js', 'utf8');
const phase21 = fs.readFileSync('assets/phase21-enrolled-visibility.js', 'utf8');
const phase6Css = fs.readFileSync('assets/phase6.css', 'utf8');
const year6Fix = fs.readFileSync('assets/year6-display-sequence-fix.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(
  phase7,
  /\^Y6MS\(\?:\[1-9\]\|1\[0-9\]\)\$/,
  'Year 6 SATs section must target only Y6MS1-Y6MS19 display IDs'
);
assert.match(
  phase7,
  /sectionHeading\.textContent\s*=\s*'SATs'/,
  'Lesson list must render an explicit SATs section heading'
);
assert.match(
  phase6Css,
  /\.phase6-lesson-section-heading\s*\{/,
  'SATs section heading must have dedicated styling'
);

assert.match(
  phase21,
  /function\s+removeEmptyLessonSectionHeadings\s*\(/,
  'Enrolled visibility pass must remove orphaned section headings'
);
assert.match(
  phase21,
  /removeEmptyLessonSectionHeadings\(\);[\s\S]*const remaining = lessonList\.querySelectorAll\('\.phase6-lesson-row'\)\.length/,
  'Section heading cleanup must happen after unavailable rows are removed and before the empty-list decision'
);
assert.match(
  phase21,
  /while \(sibling && !sibling\.classList\.contains\('phase6-lesson-section-heading'\)\)/,
  'Section cleanup must only retain a heading when its own section still contains a lesson row'
);

assert.match(
  year6Fix,
  /function\s+showYear6Menu\s*\(/,
  'Ordinary Year 6 must open an intermediate Year 6 menu instead of opening the lesson list directly'
);
assert.match(
  year6Fix,
  /viewsHeading\.textContent\s*=\s*'Year 6'/,
  'The intermediate navigation screen must be headed Year 6'
);
assert.match(
  year6Fix,
  /submenuCard\(baseCard,\s*'Lessons',\s*'Year 6 teaching lessons'/,
  'The Year 6 intermediate screen must expose a Lessons card'
);
assert.match(
  year6Fix,
  /submenuCard\(satsCard,\s*'SATS',\s*'SATs lessons'/,
  'The Year 6 intermediate screen must expose a SATS card'
);
assert.doesNotMatch(
  year6Fix,
  /makeSatsClone|fptSyntheticSats/,
  'SATS must not be cloned beside Year 6 on the Maths landing screen'
);
assert.match(
  year6Fix,
  /MATHS_L3_11P_T2M25_2026/,
  'Mean Median Mode must be explicitly excluded from ordinary Year 6 Lessons'
);
assert.match(
  year6Fix,
  /MATHS_L3_11P_T3M43_2026/,
  'Advanced Statistics must be explicitly excluded from ordinary Year 6 Lessons'
);
assert.match(
  year6Fix,
  /section === 'lessons'[\s\S]*isYear6ElevenPlusOnlyCode\(code\)/,
  'The ordinary Year 6 Lessons branch must remove the two 11+-only rows'
);
assert.match(
  index,
  /assets\/phase21-enrolled-visibility\.js\?v=20260912-y6-sats-section-2/,
  'Updated enrolled-visibility script must remain cache-busted in index.html'
);
assert.match(
  index,
  /assets\/year6-display-sequence-fix\.js\?v=20261001-y6-nested-1/,
  'Corrected nested Year 6 navigation script must be cache-busted in index.html'
);

console.log('Y6 nested Lessons/SATS navigation + catalogue exclusions regression: PASS');
