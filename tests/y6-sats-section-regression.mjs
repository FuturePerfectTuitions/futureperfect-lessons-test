import assert from 'node:assert/strict';
import fs from 'node:fs';

const phase7 = fs.readFileSync('assets/phase7.js', 'utf8');
const phase21 = fs.readFileSync('assets/phase21-enrolled-visibility.js', 'utf8');
const phase6Css = fs.readFileSync('assets/phase6.css', 'utf8');
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
  index,
  /assets\/phase21-enrolled-visibility\.js\?v=20260912-y6-sats-section-2/,
  'Updated enrolled-visibility script must be cache-busted in index.html'
);

console.log('Y6 SATs section + orphan-heading regression: PASS');
