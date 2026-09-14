from pathlib import Path

app_path = Path('src/app.js')
app = app_path.read_text()
start_marker = 'function resourceRow(resource) {'
end_marker = 'function toggleVideo(video) {'
if app.count(start_marker) != 1 or app.count(end_marker) != 1:
    raise SystemExit('Expected unique lesson resource render markers.')
start = app.index(start_marker)
end = app.index(end_marker)

replacement = r'''function resourceScopes(resource) {
  const raw = Array.isArray(resource?.presentationScopes) ? resource.presentationScopes : [];
  const scopes = [...new Set(raw.map(value => String(value || '').trim()).filter(Boolean))];
  return scopes.length ? scopes : ['core'];
}

function resourceScope(resource) {
  const scopes = resourceScopes(resource);
  if (scopes.includes('vr')) return 'vr';
  if (scopes.includes('elevenPlus')) return 'elevenPlus';
  return 'core';
}

function fallbackResourceGroup(resource, previous = null) {
  const scope = resourceScope(resource);
  const prefix = scope === 'elevenPlus' ? 'elevenplus' : scope;
  const type = String(resource?.type || '').trim();
  if (type === 'answer-pack' && previous && resourceScope(previous) === scope) {
    const previousType = String(previous.type || '').trim();
    if (['prelesson','homework','cumulative-homework'].includes(previousType)) {
      return fallbackResourceGroup(previous);
    }
  }
  if (type === 'prelesson') return `${prefix}-prelesson`;
  if (type === 'homework') return `${prefix}-homework`;
  if (type === 'cumulative-homework') return `${prefix}-cumulative`;
  if (type === 'answer-pack') return `${prefix}-answers`;
  return scope === 'core' ? 'core-other' : `${prefix}-other`;
}

function groupLessonResources(resources) {
  const groups = new Map();
  let previous = null;
  for (const resource of resources.filter(row => row.type !== 'video')) {
    const explicit = String(resource.presentationGroup || '').trim();
    const group = explicit || fallbackResourceGroup(resource, previous);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(resource);
    previous = resource;
  }
  return groups;
}

function resourceRow(resource) {
  const kind = resource.type === 'prelesson' ? 'PreLesson Sheet'
    : resource.type === 'homework' ? 'Homework'
    : resource.type === 'cumulative-homework' ? 'Cumulative Homework'
    : resource.type === 'answer-pack' ? 'Answer Pack'
    : 'Resource';
  if (resource.type === 'answer-pack' || resource.protected) {
    return `<div class="resource-row"><div><span class="resource-name">${escapeHtml(resource.displayName||kind)}</span><span class="resource-kind">Protected Answer Pack</span></div><button class="button button-secondary" type="button" data-answer="${escapeHtml(resource.resourceId)}">Open</button></div>`;
  }
  return `<div class="resource-row"><div><span class="resource-name">${escapeHtml(resource.displayName||kind)}</span><span class="resource-kind">${kind}</span></div><a class="button button-secondary resource-link" href="${escapeHtml(apiUrl(resourceOpenPath(resource)))}" target="_blank" rel="noopener" data-direct-resource="${escapeHtml(resource.resourceId)}">Open</a></div>`;
}

function resourceList(items) {
  return items?.length ? `<div class="resource-list">${items.map(resourceRow).join('')}</div>` : '';
}

function collapsibleResourceSection(id, kicker, title, body) {
  if (!body) return '';
  const bodyId = `${id}-body`;
  return `<section class="resource-section resource-section-collapsible" data-resource-section="${escapeHtml(id)}">
    <div class="resource-section-heading">
      <div><p class="eyebrow">${escapeHtml(kicker)}</p><h2>${escapeHtml(title)}</h2></div>
      <button class="resource-collapse-toggle" type="button" data-resource-toggle="${escapeHtml(bodyId)}" aria-controls="${escapeHtml(bodyId)}" aria-expanded="false">View</button>
    </div>
    <div id="${escapeHtml(bodyId)}" class="resource-collapse-body" hidden>${body}</div>
  </section>`;
}

function resourceSubgroup(title, items) {
  if (!items?.length) return '';
  return `<section class="resource-subgroup"><h3 class="resource-subheading">${escapeHtml(title)}</h3>${resourceList(items)}</section>`;
}

function bindResourceCollapses() {
  document.querySelectorAll('[data-resource-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const body = document.getElementById(button.dataset.resourceToggle);
      if (!body) return;
      const opening = body.hidden;
      body.hidden = !opening;
      button.textContent = opening ? 'Hide' : 'View';
      button.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
  });
}

function renderLesson(payload) {
  const lesson = payload.lesson || {};
  const resources = payload.resources || [];
  const video = resources.find(row => row.type === 'video');
  const groups = groupLessonResources(resources);
  const take = key => groups.get(key) || [];
  const locked = !payload.resourcesIncluded || lesson.locked;

  const vrBody = [
    resourceSubgroup('VR PreLesson', take('vr-prelesson')),
    resourceSubgroup('VR Homework', take('vr-homework')),
    resourceSubgroup('Additional VR Answer Packs', take('vr-answers')),
    resourceSubgroup('Other VR Resources', take('vr-other'))
  ].filter(Boolean).join('');

  root.innerHTML = shell(`<section class="card"><div class="back-row"><button id="back-lessons" class="button button-link" type="button">← Lessons</button></div>
    <div class="lesson-heading"><div><span class="lesson-code">${escapeHtml(lesson.displayLessonId||lesson.lessonId)}</span><h1>${escapeHtml(lesson.title)}</h1><p class="intro">${escapeHtml(lesson.description||'')}</p></div><span class="state-pill">${locked?'🔒 Preview':lesson.accessMode==='prelesson-only'?'PreLesson only':'Available'}</span></div>
    ${locked?'<div class="notice">This lesson is visible as a preview. Resources remain locked until they are released to you.</div>':''}
    <div class="resource-sections">
      ${collapsibleResourceSection('core-prelesson','Before the lesson','PreLesson Sheets',resourceList(take('core-prelesson')))}
      ${video ? `<section class="resource-section"><div class="resource-section-heading"><div><p class="eyebrow">Main lesson</p><h2>Lesson Video</h2></div></div><div class="video-shell"><div><button id="video-toggle" class="resource-collapse-toggle" type="button">View</button></div><div id="player-frame" class="player-frame" hidden><iframe id="lesson-player" title="Lesson video" allow="fullscreen" allowfullscreen></iframe></div></div></section>` : ''}
      ${collapsibleResourceSection('core-homework','After the lesson','Homework',resourceList(take('core-homework')))}
      ${collapsibleResourceSection('core-cumulative','Revision','Cumulative Homework',resourceList(take('core-cumulative')))}
      ${collapsibleResourceSection('elevenplus-prelesson','11+ extension','11+ PreLesson',resourceList(take('elevenplus-prelesson')))}
      ${collapsibleResourceSection('elevenplus-homework','11+ extension','11+ Homework',resourceList(take('elevenplus-homework')))}
      ${collapsibleResourceSection('elevenplus-cumulative','11+ revision','11+ Cumulative Homework',resourceList(take('elevenplus-cumulative')))}
      ${collapsibleResourceSection('verbal-reasoning','11+ English extension','Verbal Reasoning',vrBody)}
      ${collapsibleResourceSection('core-answers','Protected resources','Additional Answer Packs',resourceList(take('core-answers')))}
      ${collapsibleResourceSection('elevenplus-answers','Protected resources','Additional 11+ Answer Packs',resourceList(take('elevenplus-answers')))}
      ${collapsibleResourceSection('core-other','Extra material','Other Resources',resourceList(take('core-other')))}
      ${collapsibleResourceSection('elevenplus-other','11+ extra material','Other 11+ Resources',resourceList(take('elevenplus-other')))}
      ${(!locked && !resources.length)?'<div class="empty-state">No lesson resources are currently available.</div>':''}
    </div></section>`, {portal:true});
  bindShell();
  bindResourceCollapses();
  document.querySelector('#back-lessons').addEventListener('click', () => { clearLessonMedia(); renderLessonList(); });
  document.querySelector('#video-toggle')?.addEventListener('click', () => toggleVideo(video));
  document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => openAnswerPack(resources.find(r => r.resourceId === button.dataset.answer))));
}

'''
app_path.write_text(app[:start] + replacement + app[end:])

css_path = Path('src/styles.css')
css = css_path.read_text()
marker = '/* CP12 old-Portal-V2 collapsible lesson resource hierarchy */'
if marker in css:
    raise SystemExit('CP12 collapsible CSS already present.')
css += r'''

/* CP12 old-Portal-V2 collapsible lesson resource hierarchy */
.resource-section-collapsible { padding-top:18px; padding-bottom:18px; }
.resource-section-heading { display:grid; grid-template-columns:minmax(0,1fr) 146px; column-gap:14px; align-items:center; margin-bottom:0; }
.resource-section-heading > div { min-width:0; }
.resource-section-heading .eyebrow, .resource-section-heading h2 { grid-column:1; }
.resource-section-heading h2 { margin:3px 0 0; }
.resource-collapse-toggle {
  grid-column:2;
  grid-row:1;
  justify-self:end;
  width:140px;
  min-width:140px;
  height:46px;
  min-height:46px;
  padding:0 18px;
  border:0;
  border-radius:999px;
  background:var(--navy);
  color:#fff;
  box-shadow:0 5px 13px rgba(1,33,105,.14);
  font:inherit;
  font-size:13px;
  font-weight:900;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
}
.resource-collapse-toggle:hover, .resource-collapse-toggle:focus-visible { background:#00194f; color:#fff; outline:none; }
.resource-collapse-body { margin-top:16px; }
.resource-subgroup + .resource-subgroup { margin-top:22px; padding-top:18px; border-top:1px solid var(--line); }
.resource-subheading { margin:0 0 10px; color:var(--navy); font-size:1rem; }
.video-shell > div:first-child { display:flex; justify-content:flex-end; }
@media (max-width:720px) {
  .resource-section-heading { grid-template-columns:minmax(0,1fr) 126px; column-gap:10px; }
  .resource-collapse-toggle { width:120px; min-width:120px; height:42px; min-height:42px; padding:0 14px; }
  .video-shell > div:first-child { justify-content:flex-end; }
}
'''
css_path.write_text(css)

Path('tests/cp12-collapsible-resource-sections-static.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(app, /presentationScopes/);
assert.match(app, /presentationGroup/);
assert.match(app, /Verbal Reasoning/);
assert.match(app, /VR PreLesson/);
assert.match(app, /VR Homework/);
assert.match(app, /11\+ PreLesson/);
assert.match(app, /11\+ Homework/);
assert.match(app, /data-resource-toggle/);
assert.match(app, /aria-expanded=\\"false\\"/);
assert.match(app, /button\.textContent = opening \? 'Hide' : 'View'/);
assert.ok(!/displayName[^\n]{0,80}(?:includes|match|test)[^\n]{0,80}VR/i.test(app), 'Grouping must not infer VR from filenames/display names.');
assert.match(css, /CP12 old-Portal-V2 collapsible lesson resource hierarchy/);
assert.match(css, /\.resource-collapse-toggle/);
assert.match(css, /\.resource-subgroup/);
console.log('CP12_COLLAPSIBLE_RESOURCE_SECTIONS_STATIC_PASS');
''')
