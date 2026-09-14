from pathlib import Path
import re

APP = Path('src/app.js')
CSS = Path('src/styles.css')
TEST = Path('tests/cp12-approved-v2-ui-parity-static.mjs')
app = APP.read_text()


def once(old, new, label):
    global app
    count = app.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    app = app.replace(old, new, 1)


def regex_once(pattern, replacement, label):
    global app
    app2, count = re.subn(pattern, replacement, app, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex anchor, found {count}')
    app = app2


helpers = r'''
function portalOwnerName() {
  return String(state.account?.firstName || state.account?.name || '').trim().split(/\s+/)[0] || '';
}

function portalLabel() {
  const first = portalOwnerName();
  return first ? `${first}'s Portal` : 'Student Portal';
}

function backButton(id, label) {
  return `<div class="back-row"><button id="${escapeHtml(id)}" class="floating-back" type="button" data-back-label="${escapeHtml(label)}" aria-label="Back to ${escapeHtml(label)}"><span class="back-arrow" aria-hidden="true">←</span><span class="back-label">${escapeHtml(label)}</span></button></div>`;
}

const EYE_OPEN = `<svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>`;
const EYE_CLOSED = `<svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3 3.5M8.2 8.2C5 10 2.5 12 2.5 12s3.5 6 9.5 6a10.6 10.6 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

function bindPasswordEye(button, input) {
  if (!button || !input) return;
  button.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
    button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    button.setAttribute('aria-pressed', showing ? 'false' : 'true');
  });
}
'''
once("const enc = value => encodeURIComponent(String(value ?? ''));\n", "const enc = value => encodeURIComponent(String(value ?? ''));\n" + helpers + "\n", 'insert presentation helpers')

shell = r'''function shell(content, { portal = false } = {}) {
  const label = portalLabel();
  document.title = portal ? `${label} | Future Perfect Tuitions` : 'Student Portal | Future Perfect Tuitions';
  if (!portal) return `<main class="login-layout">${content}</main><footer class="footer">Future Perfect Tuitions · Student Portal</footer>`;
  return `<div class="shell">
    <header class="topbar">
      <a class="brand" href="https://futureperfect.education/" aria-label="Future Perfect Tuitions"><img src="${logoUrl}" alt="Future Perfect Tuitions"></a>
      <div class="topbar-actions"><span class="greeting">${escapeHtml(label)}</span><button id="logout" class="button site-logout" type="button">Log out</button></div>
    </header>
    <main class="main">${content}</main>
    <footer class="footer">Future Perfect Tuitions · ${escapeHtml(label)}</footer>
  </div>`;
}

function bindShell'''
regex_once(r'function shell\(content, \{ portal = false \} = \{\}\) \{.*?\n\}\n\nfunction bindShell', shell, 'canonical shell')

once('<button id="toggle-password" class="password-toggle" type="button" aria-label="Show password">Show</button>', '<button id="toggle-password" class="password-toggle" type="button" aria-label="Show password" aria-pressed="false">${EYE_OPEN}</button>', 'login eye button')
regex_once(r"  document\.querySelector\('#toggle-password'\)\.addEventListener\('click', event => \{.*?\n  \}\);", "  bindPasswordEye(document.querySelector('#toggle-password'), password);", 'login eye binding')

# Personalised portal wording and inverted subject classes.
once('<p class="eyebrow">Student Portal</p><h1>Welcome', '<p class="eyebrow">${escapeHtml(portalLabel())}</p><h1>Welcome', 'personalised home eyebrow')
once('class="choice-card" data-subject="maths"', 'class="choice-card subject-maths" data-subject="maths"', 'maths subject treatment')
once('class="choice-card" data-subject="english"', 'class="choice-card subject-english" data-subject="english"', 'english subject treatment')

# All portal back controls become one approved fixed navy control.
replacements = {
    '<div class="back-row"><button id="back-subjects" class="button button-link" type="button">← Subjects</button></div>': "${backButton('back-subjects','Subjects')}",
    '<div class="back-row"><button id="back-views" class="button button-link" type="button">← ${state.subject===\'maths\'?\'Maths\':\'English\'}</button></div>': "${backButton('back-views', state.subject==='maths'?'Maths':'English')}",
    '<div class="back-row"><button id="back-lessons" class="button button-link" type="button">← Lessons</button></div>': "${backButton('back-lessons','Lessons')}"
}
for old, new in replacements.items():
    if old not in app:
        raise SystemExit(f'floating back anchor missing: {old[:70]}')
    app = app.replace(old, new)

# Y6 SATs remains presentation-only: split by canonical lesson IDs already present in the prepared view payload.
lesson_list_fn = r'''function lessonRowHtml(row) {
  return `<article class="lesson-row"><div class="lesson-main"><span class="lesson-code">${escapeHtml(row.displayLessonId||row.lessonId)}</span><div class="lesson-title">${escapeHtml(row.title)}</div></div><button class="button ${row.locked?'lesson-action locked':'button-primary lesson-action'}" type="button" data-lesson="${escapeHtml(row.lessonId)}">${row.locked?'Preview':'Open'}</button></article>`;
}

function isSatsLesson(row) {
  return /^Y6MS\d+$/i.test(String(row.displayLessonId || row.lessonId || '').trim());
}

function lessonRowsHtml(rows) {
  if (!rows.length) return '<div class="empty-state">No lessons match your search.</div>';
  const sats = rows.filter(isSatsLesson);
  if (!sats.length) return rows.map(lessonRowHtml).join('');
  const weekly = rows.filter(row => !isSatsLesson(row));
  const section = (title, intro, items, extra = '') => items.length ? `<section class="lesson-list-section ${extra}"><div class="lesson-list-section-heading"><span></span><div><p class="eyebrow">${escapeHtml(title === 'SATs Practice Papers' ? 'Year 6 revision' : 'Weekly lessons')}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p></div><span></span></div><div class="lesson-list">${items.map(lessonRowHtml).join('')}</div></section>` : '';
  return `${section('Weekly Lessons','Your weekly lessons in chronological order.',weekly)}${section('SATs Practice Papers','SATs papers are grouped together so weekly lessons stay easy to scan.',sats,'sats-list-section')}`;
}

function renderLessonList() {
  const rows = filteredLessons();
  root.innerHTML = shell(`<section class="card portal-card">${backButton('back-views', state.subject==='maths'?'Maths':'English')}<p class="eyebrow">${escapeHtml(portalLabel())}</p><h1>${escapeHtml(state.view?.label||'Lessons')}</h1><p class="intro">Your lessons are shown in chronological order.</p>
    <div class="search-wrap"><label for="lesson-search">Search lessons</label><input id="lesson-search" class="field" type="search" placeholder="Search by lesson ID, title or topic" value="${escapeHtml(state.search)}"></div>
    <div class="lesson-list-wrap">${lessonRowsHtml(rows)}</div></section>`, {portal:true});
  bindShell();
  document.querySelector('#back-views').addEventListener('click', () => renderViews(state.subject));
  const search = document.querySelector('#lesson-search');
  search.addEventListener('input', () => { state.search = search.value; renderLessonList(); document.querySelector('#lesson-search')?.focus(); });
  document.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => loadLesson(button.dataset.lesson)));
}

async function loadLesson'''
regex_once(r'function renderLessonList\(\) \{.*?\n\}\n\nasync function loadLesson', lesson_list_fn, 'lesson list with SATs grouping')

render_lesson_fn = r'''function renderLesson(payload) {
  const lesson = payload.lesson || {};
  const resources = payload.resources || [];
  const video = resources.find(row => row.type === 'video');
  const groups = groupLessonResources(resources);
  const take = key => groups.get(key) || [];
  const locked = !payload.resourcesIncluded || lesson.locked;
  const statusPill = locked ? '<span class="state-pill locked-pill">🔒 Preview</span>' : lesson.accessMode === 'prelesson-only' ? '<span class="state-pill">PreLesson only</span>' : '';
  const description = String(lesson.description || '').trim();
  const descriptionBlock = description ? `<section class="lesson-description-block"><div class="lesson-description-heading"><p class="eyebrow">Lesson overview</p><button id="lesson-description-toggle" class="details-toggle" type="button" aria-controls="lesson-description-body" aria-expanded="false">Details</button></div><div id="lesson-description-body" class="lesson-description-body" hidden><p>${escapeHtml(description)}</p></div></section>` : '';

  const vrBody = [
    resourceSubgroup('VR PreLesson', take('vr-prelesson')),
    resourceSubgroup('VR Homework', take('vr-homework')),
    resourceSubgroup('Additional VR Answer Packs', take('vr-answers')),
    resourceSubgroup('Other VR Resources', take('vr-other'))
  ].filter(Boolean).join('');

  root.innerHTML = shell(`<section class="card portal-card">${backButton('back-lessons','Lessons')}
    <div class="lesson-heading"><div><span class="lesson-code">${escapeHtml(lesson.displayLessonId||lesson.lessonId)}</span><h1>${escapeHtml(lesson.title)}</h1></div>${statusPill}</div>
    ${descriptionBlock}
    ${locked?'<div class="notice">This lesson is visible as a preview. Resources remain locked until they are released to you.</div>':''}
    <div class="resource-sections">
      ${collapsibleResourceSection('core-prelesson','Before the lesson','PreLesson Sheets',resourceList(take('core-prelesson')))}
      ${video ? `<section class="resource-section video-section"><div class="resource-section-heading"><div><p class="eyebrow">Main lesson</p><h2>Lesson Video</h2></div><button id="video-toggle" class="resource-collapse-toggle" type="button" aria-controls="player-frame" aria-expanded="false">View</button></div><div id="player-frame" class="player-frame" hidden><iframe id="lesson-player" title="Lesson video" allow="fullscreen" allowfullscreen></iframe></div></section>` : ''}
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
  const detailsButton = document.querySelector('#lesson-description-toggle');
  detailsButton?.addEventListener('click', () => {
    const body = document.querySelector('#lesson-description-body');
    const opening = body?.hidden === true;
    if (!body) return;
    body.hidden = !opening;
    detailsButton.textContent = opening ? 'Hide' : 'Details';
    detailsButton.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
  document.querySelector('#video-toggle')?.addEventListener('click', () => toggleVideo(video));
  document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => openAnswerPack(resources.find(r => r.resourceId === button.dataset.answer))));
}

function toggleVideo'''
regex_once(r'function renderLesson\(payload\) \{.*?\n\}\n\nfunction toggleVideo', render_lesson_fn, 'lesson detail approved presentation')

# Synchronise video toggle aria state without changing lazy-load semantics.
once("    frame.hidden = false; button.textContent = 'Hide';\n    return;", "    frame.hidden = false; button.textContent = 'Hide'; button.setAttribute('aria-expanded', 'true');\n    return;", 'video first-open aria')
once("  frame.hidden = !frame.hidden; button.textContent = frame.hidden ? 'View' : 'Hide';", "  frame.hidden = !frame.hidden; button.textContent = frame.hidden ? 'View' : 'Hide'; button.setAttribute('aria-expanded', frame.hidden ? 'false' : 'true');", 'video toggle aria')

answer_fn = r'''async function openAnswerPack(resource) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="answer-password-title"><div class="modal-head"><div><p class="eyebrow">Protected resource</p><h2 id="answer-password-title">Open Answer Pack</h2></div><button class="icon-button" type="button" data-close aria-label="Close">×</button></div><p class="intro">Enter the Answer Pack password. The password is checked every time you open an Answer Pack.</p><form id="answer-form" class="form"><label for="answer-password">Answer Pack password</label><div class="password-wrap"><input id="answer-password" class="field" type="password" maxlength="4" autocomplete="off" required><button id="answer-toggle-password" class="password-toggle" type="button" aria-label="Show password" aria-pressed="false">${EYE_OPEN}</button></div><button id="answer-submit" class="button button-primary" type="submit">Open Answer Pack</button><div id="answer-error" class="error-box" hidden role="alert"></div></form></section>`;
  const close = () => backdrop.remove(); backdrop.querySelector('[data-close]').addEventListener('click', close); backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); }); document.body.append(backdrop);
  bindPasswordEye(backdrop.querySelector('#answer-toggle-password'), backdrop.querySelector('#answer-password'));
  backdrop.querySelector('#answer-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = backdrop.querySelector('#answer-submit'); const error = backdrop.querySelector('#answer-error'); button.disabled = true; button.textContent='Checking…'; error.hidden=true;
    try {
      const payload = await requestJson(resourceOpenPath(resource), { method:'POST', body:{ password:backdrop.querySelector('#answer-password').value } });
      close();
      const viewerModule = await import('./protected-viewer.js');
      state.viewer = await viewerModule.openProtectedViewer({ url:apiUrl(payload.viewerUrl), title:resource.displayName || 'Answer Pack', watermark:`Future Perfect Tuitions · ${state.account?.firstName||'Student'}`, onClose:()=>{state.viewer=null;} });
    } catch (err) {
      if (err.status === 429) error.textContent = 'Too many incorrect attempts. Please try again shortly.';
      else if (err.status === 401) error.textContent = 'Incorrect Answer Pack password.';
      else error.textContent = friendlyError(err);
      error.hidden=false;
    } finally { button.disabled=false; button.textContent='Open Answer Pack'; }
  });
}

async function logout'''
regex_once(r'async function openAnswerPack\(resource\) \{.*?\n\}\n\nasync function logout', answer_fn, 'answer pack eye presentation')

APP.write_text(app)

# One canonical consolidated stylesheet: approved V2 presentation + retained fast resource hierarchy.
CSS.write_text(r''':root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color:#13213a; background:#f4f6f8; font-synthesis:none;
  --navy:#012169; --navy-2:#153b86; --red:#c8102e; --ink:#14213d; --muted:#667085;
  --line:#d9e0ea; --soft:#f7f9fc; --white:#fff; --danger:#9f1239;
  --shadow:0 18px 54px rgba(13,34,72,.12);
}
*{box-sizing:border-box} html,body{min-height:100%;margin:0} html{background:#f4f6f8}
body{min-width:320px;background:radial-gradient(circle at top,#fff 0,#f4f6f8 42rem);color:var(--ink)}
body::before{content:"";position:fixed;z-index:1000;pointer-events:none;inset:0;border:6px solid transparent;border-image:repeating-linear-gradient(135deg,var(--red) 0 18px,#fff 18px 34px,var(--navy) 34px 52px,#fff 52px 68px) 6}
button,input{font:inherit} button,a{-webkit-tap-highlight-color:transparent} button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid rgba(1,33,105,.24);outline-offset:2px}[hidden]{display:none!important}
.shell{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.topbar{position:sticky;top:0;z-index:40;min-height:82px;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);border-bottom:1px solid rgba(217,224,234,.9);display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px clamp(22px,4vw,58px);box-shadow:0 8px 24px rgba(13,34,72,.05)}
.brand{display:inline-flex;align-items:center;text-decoration:none;color:var(--navy);font-weight:800}.brand img{width:min(238px,46vw);height:50px;object-fit:contain;object-position:left center}.topbar-actions{display:flex;align-items:center;gap:14px}.greeting{font-weight:900;color:var(--navy)}
.button{border:0;border-radius:999px;padding:11px 18px;font-weight:850;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,background .12s ease}.button:hover{transform:translateY(-1px)}.button-primary{background:var(--navy);color:#fff;box-shadow:0 6px 16px rgba(1,33,105,.2)}.button-secondary{background:#edf2fb;color:var(--navy)}.button-danger{background:#fff1f2;color:var(--danger)}.button-link{background:transparent;color:var(--navy);box-shadow:none}.site-logout{background:var(--red);color:#fff;box-shadow:0 5px 14px rgba(200,16,46,.2)}
.main{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:clamp(28px,5vw,58px) 0}.card{position:relative;background:var(--white);border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow);padding:clamp(24px,4vw,46px);overflow:visible}.portal-card{border-top:5px solid var(--navy)}
.login-layout{min-height:calc(100vh - 86px);display:grid;place-items:center;padding:32px 18px}.login-card{width:min(570px,100%);overflow:hidden;border-top:0}.login-card::before{content:"";position:absolute;inset:0 0 auto;height:7px;background:linear-gradient(90deg,var(--navy) 0 67%,var(--red) 67% 100%)}.login-logo{display:block;width:min(300px,75%);max-height:82px;object-fit:contain;margin:10px auto 22px}.eyebrow{margin:0 0 8px;color:var(--red);font-size:.76rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}h1,h2,h3,p{margin-top:0}h1{color:var(--navy);font-size:clamp(2rem,5vw,3.05rem);line-height:1.04;margin-bottom:12px}h2{color:var(--navy)}.intro{color:var(--muted);line-height:1.62}.form{display:grid;gap:10px;margin-top:26px}.form label{font-weight:850;color:var(--ink)}.field{width:100%;min-height:52px;border:1px solid #b9c4d4;border-radius:14px;padding:12px 14px;background:#eef2f7;color:var(--ink);transition:border-color .12s ease,box-shadow .12s ease}.field:focus{background:#fff;border-color:#8198bd;box-shadow:0 0 0 4px rgba(1,33,105,.08)}
.password-wrap{position:relative;display:block}.password-wrap .field{padding-right:58px}.password-toggle{position:absolute;right:5px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:44px;height:42px;border:0;background:transparent;border-radius:12px;cursor:pointer;color:var(--navy)}.password-toggle:hover{background:rgba(1,33,105,.07)}.eye-svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.login-card .button-primary{min-height:52px;margin-top:6px;background:linear-gradient(135deg,var(--navy),var(--navy-2))}.error-box,.notice{margin-top:16px;padding:14px 16px;border-radius:13px;line-height:1.46}.error-box{background:#fff1f2;color:var(--danger);border:1px solid #fecdd3}.notice{background:#f0f5ff;color:var(--navy);border:1px solid #d5e2ff}.security-note{margin:22px 0 0;color:#6d7685;font-size:.9rem;line-height:1.5}.footer{padding:22px 16px 34px;text-align:center;color:#667085;font-size:.9rem}
.back-row{height:0;margin:0}.floating-back{position:fixed;z-index:75;left:max(20px,calc((100vw - 1120px)/2 - 8px));bottom:28px;width:52px;height:52px;border:0;border-radius:999px;background:var(--navy);color:#fff;box-shadow:0 12px 30px rgba(1,33,105,.28);display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 16px;overflow:hidden;white-space:nowrap;cursor:pointer;font-weight:900;transition:width .18s ease,transform .12s ease,box-shadow .12s ease}.floating-back:hover,.floating-back:focus-visible{width:148px;transform:translateY(-1px);box-shadow:0 14px 34px rgba(1,33,105,.34)}.back-arrow{font-size:1.45rem;line-height:1;flex:0 0 20px}.back-label{opacity:0;transition:opacity .1s ease}.floating-back:hover .back-label,.floating-back:focus-visible .back-label{opacity:1}
.subject-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:28px}.choice-card{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px;width:100%;min-height:132px;padding:27px;border:0;border-radius:20px;cursor:pointer;text-align:left;color:#fff;box-shadow:0 14px 32px rgba(23,48,92,.16);overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}.choice-card::before{content:"";position:absolute;inset:0 0 auto;height:5px;background:rgba(255,255,255,.7)}.choice-card:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(23,48,92,.2)}.subject-maths{background:linear-gradient(145deg,#012169,#153b86)}.subject-english{background:linear-gradient(145deg,#c8102e,#a90d27)}.choice-title{font-size:1.42rem;font-weight:950}.choice-meta{display:block;margin-top:6px;color:rgba(255,255,255,.82);font-size:.9rem;font-weight:700}.choice-arrow{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.42);border-radius:50%;font-size:1.45rem}
.view-section+.view-section{margin-top:30px}.view-section-title{margin-bottom:13px;font-size:.82rem;text-transform:uppercase;letter-spacing:.11em;color:var(--red);font-weight:950}.view-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:15px}.view-card{position:relative;min-height:112px;border:1px solid #ccd6e4;border-radius:17px;background:#fff;padding:20px;cursor:pointer;text-align:left;display:flex;flex-direction:column;justify-content:space-between;gap:10px;overflow:hidden;box-shadow:0 8px 22px rgba(23,48,92,.06);transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}.view-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--navy)}.view-card:hover{transform:translateY(-2px);border-color:#9eb1ce;box-shadow:0 12px 26px rgba(23,48,92,.1)}.view-card.locked{background:#f7f8fb}.view-card.locked::before{background:#9aa5b4}.view-label{color:var(--navy);font-weight:950;font-size:1.12rem}.view-count{color:var(--muted);font-size:.88rem}
.search-wrap{margin:24px 0}.search-wrap label{display:block;font-weight:850;margin-bottom:8px}.lesson-list-wrap{display:grid;gap:32px}.lesson-list{display:grid;gap:11px}.lesson-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 118px;gap:14px;align-items:center;min-height:84px;border:1px solid var(--line);border-radius:16px;padding:14px 16px 14px 20px;background:#fff;overflow:hidden;box-shadow:0 5px 16px rgba(23,48,92,.04)}.lesson-row::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--navy)}.lesson-main{min-width:0}.lesson-code{display:inline-flex;align-items:center;min-height:25px;padding:3px 8px;border-radius:999px;background:#edf2fb;color:var(--navy);font-size:.77rem;font-weight:950;letter-spacing:.04em}.lesson-title{margin:7px 0 0;color:var(--ink);font-weight:850;line-height:1.27}.lesson-action{width:100%;min-height:42px}.lesson-action.locked{background:#eef1f5;color:#667085}.lesson-list-section-heading{display:grid;grid-template-columns:1fr minmax(0,720px) 1fr;align-items:center;gap:16px;text-align:center;margin:6px 0 17px}.lesson-list-section-heading>span{height:1px;background:linear-gradient(90deg,transparent,#ccd5e1)}.lesson-list-section-heading>span:last-child{background:linear-gradient(90deg,#ccd5e1,transparent)}.lesson-list-section-heading h2{margin:2px 0 5px}.lesson-list-section-heading p:last-child{margin:0;color:var(--muted);font-size:.92rem}.sats-list-section{margin-top:10px}.sats-list-section .lesson-row::before{background:var(--red)}
.lesson-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.lesson-heading h1{font-size:clamp(1.8rem,4vw,2.7rem);margin-top:8px}.state-pill{flex:0 0 auto;border-radius:999px;padding:8px 12px;font-size:.78rem;font-weight:950;background:#edf2fb;color:var(--navy)}.locked-pill{background:#f2f3f5;color:#596579}.lesson-description-block{margin:0 0 20px;border:1px solid var(--line);border-radius:15px;background:#f9fafc;overflow:hidden}.lesson-description-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px}.lesson-description-heading .eyebrow{margin:0}.details-toggle,.resource-collapse-toggle{width:140px;min-width:140px;height:46px;min-height:46px;padding:0 18px;border:0;border-radius:999px;background:var(--navy);color:#fff;box-shadow:0 5px 13px rgba(1,33,105,.14);font:inherit;font-size:13px;font-weight:950;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.details-toggle:hover,.resource-collapse-toggle:hover{background:#00194f}.lesson-description-body{padding:0 16px 15px;color:var(--muted);line-height:1.62}.lesson-description-body p{margin:0}
.resource-sections{display:grid;gap:0}.resource-section{border-top:1px solid var(--line);padding:20px 0}.resource-section-heading{display:grid;grid-template-columns:minmax(0,1fr) 146px;column-gap:14px;align-items:center;margin-bottom:0}.resource-section-heading>div{min-width:0}.resource-section-heading h2{margin:3px 0 0}.resource-collapse-toggle{grid-column:2;grid-row:1;justify-self:end}.resource-collapse-body{margin-top:16px}.resource-subgroup+.resource-subgroup{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.resource-subheading{margin:0 0 10px;color:var(--navy);font-size:1rem}.resource-list{display:grid;gap:10px}.resource-row{position:relative;min-height:64px;border:1px solid #d7deea;border-radius:14px;padding:12px 14px 12px 18px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;background:#fff;overflow:hidden}.resource-row::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--navy)}.resource-name{font-weight:850;color:var(--ink)}.resource-kind{display:block;margin-top:3px;color:var(--muted);font-size:.82rem}.resource-link{text-decoration:none}.video-section .resource-section-heading{margin-bottom:16px}.player-frame{width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:16px;background:#09152c;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}.player-frame iframe{display:block;width:100%;height:100%;border:0;background:#09152c}.empty-state{padding:24px;border:1px dashed #cbd5e1;border-radius:14px;color:var(--muted);text-align:center}.loading-row{display:flex;align-items:center;gap:10px;color:var(--muted)}.spinner{width:18px;height:18px;border-radius:50%;border:2px solid #d2d8e2;border-top-color:var(--navy);animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(10,21,44,.75);display:grid;place-items:center;padding:18px;backdrop-filter:blur(3px)}.modal{position:relative;width:min(520px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.35);padding:26px;border-top:6px solid var(--navy)}.modal-wide{width:min(1040px,100%)}.modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.icon-button{border:0;background:#eef2f7;color:var(--ink);width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.2rem}.protected-toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;background:#fff;padding-bottom:12px;border-bottom:1px solid var(--line)}.protected-document{position:relative;display:grid;gap:18px;justify-items:center;padding:18px 0;background:#edf1f6;border-radius:14px;min-height:220px}.protected-page{position:relative;max-width:100%;background:#fff;box-shadow:0 8px 26px rgba(0,0,0,.12)}.protected-page canvas{display:block;max-width:100%;height:auto}.watermark{pointer-events:none;position:absolute;inset:0;display:grid;place-items:center;color:rgba(1,33,105,.13);font-weight:900;font-size:clamp(1rem,4vw,2.4rem);transform:rotate(-28deg);text-align:center;padding:20px}
@media print{body{display:none!important}}
@media(max-width:720px){body::before{border-width:5px}.topbar{min-height:68px;padding:10px 18px}.brand img{width:156px;height:42px}.greeting{display:none}.main{width:min(100% - 24px,1120px);padding:22px 0 34px}.card{border-radius:20px;padding:22px 17px}.subject-grid{grid-template-columns:1fr}.view-grid{grid-template-columns:1fr 1fr}.lesson-row{grid-template-columns:minmax(0,1fr) 98px;gap:10px;padding:12px 12px 12px 17px}.lesson-heading{display:block}.state-pill{display:inline-block;margin-top:5px}.resource-section-heading{grid-template-columns:minmax(0,1fr) 126px;column-gap:10px}.details-toggle,.resource-collapse-toggle{width:120px;min-width:120px;height:42px;min-height:42px}.resource-row{grid-template-columns:1fr}.resource-row .button,.resource-row .resource-link{width:100%;text-align:center}.floating-back{left:16px;bottom:18px;width:48px;height:48px;padding:0 14px}.floating-back:hover,.floating-back:focus-visible{width:132px}.lesson-list-section-heading{grid-template-columns:24px 1fr 24px;gap:10px}}
@media(max-width:420px){.view-grid{grid-template-columns:1fr}.lesson-row{grid-template-columns:minmax(0,1fr) 92px}h1{font-size:2rem}.choice-card{min-height:116px;padding:22px}.topbar-actions{gap:8px}.site-logout{padding:10px 14px}}
''')

TEST.write_text(r'''import assert from 'node:assert/strict';
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
''')

print('CP12 approved V2 UI parity source patch prepared')
