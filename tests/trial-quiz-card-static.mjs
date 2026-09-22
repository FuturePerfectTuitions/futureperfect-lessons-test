import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

assert.ok(source.includes("const payload = await requestJson('/api/v2/student/quiz/eligibility')"));
assert.ok(source.includes("section.dataset.quizOnlySection = 'true'"), 'eligible Quiz must be able to create a Current section when a Trial has no Maths view');
assert.ok(source.includes("grid = section.querySelector('[data-view-grid=\"current\"]')"));
assert.ok(source.includes("document.querySelector('.empty-state')?.remove()"));
assert.ok(source.includes("button.dataset.quizPractice = 'true'"));
assert.ok(source.includes("if (grid?.querySelector('[data-quiz-practice]')) return"), 'must not duplicate the Quiz card');

console.log('TRIAL_QUIZ_CARD_STATIC_PASS');
