from pathlib import Path
import hashlib

path = Path('src/app.js')
source = path.read_text(encoding='utf-8')
marker = 'YEAR6_NESTED_NAVIGATION_V2_20261001'
expected = 'b7dc28557706d4f6946fb05b8db05ccf8e3568c4b8d588927246b394e74f5d80'
actual = hashlib.sha256(source.encode('utf-8')).hexdigest()
print('SOURCE_SHA256_BEFORE=', actual)
if marker in source:
    print('PATCH_ALREADY_PRESENT')
    raise SystemExit(0)
if actual != expected:
    raise SystemExit(f'Fail closed: recovered source changed unexpectedly: {actual}')


def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'Fail closed: {label} expected once, found {count}')
    source = source.replace(old, new, 1)


replace_once(
    "  view: null,\n  lessons: [],",
    "  view: null,\n  year6Section: '',\n  lessons: [],",
    'state year6Section')

replace_once(
    "function subjectViews(subject) {\n  return (state.home?.views || []).filter(view => String(view.subject).toLowerCase() === subject);\n}\n",
    "function subjectViews(subject) {\n  return (state.home?.views || []).filter(view => String(view.subject).toLowerCase() === subject);\n}\n\nfunction isYear6TeachingView(view) {\n  const id = String(view?.viewId || '').trim().toLowerCase();\n  const subject = String(view?.subject || state.subject || '').trim().toLowerCase();\n  return subject === 'maths' && (id === 'maths-year6' || id === 'maths-year6-lessons');\n}\n\nfunction isMathsSatsView(view) {\n  return String(view?.viewId || '').trim().toLowerCase() === 'maths-sats';\n}\n\nfunction topLevelSubjectViews(subject) {\n  const views = subjectViews(subject);\n  if (subject !== 'maths' || !views.some(isYear6TeachingView)) return views;\n  return views.filter(view => !isMathsSatsView(view));\n}\n",
    'top-level view helpers')

replace_once(
    "  navigationEpoch += 1; abortScope('view'); abortScope('lesson'); clearLessonMedia(); state.subject=''; state.view=null;\n  const maths = subjectViews('maths');\n  const english = subjectViews('english');",
    "  navigationEpoch += 1; abortScope('view'); abortScope('lesson'); clearLessonMedia(); state.subject=''; state.view=null; state.year6Section=''; state.search='';\n  const maths = topLevelSubjectViews('maths');\n  const english = topLevelSubjectViews('english');",
    'subject reset and visible counts')

insert = r'''// YEAR6_NESTED_NAVIGATION_V2_20261001
function renderYear6Hub(view) {
  navigationEpoch += 1;
  abortScope('view'); abortScope('lesson'); clearLessonMedia();
  state.subject = 'maths';
  state.view = view || state.view || { viewId:'maths-year6', subject:'maths', label:'Year 6' };
  state.year6Section = '';
  state.lessons = [];
  state.search = '';
  root.innerHTML = shell(`<section class="card">${backButton('back-views','Maths')}<p class="eyebrow">${escapeHtml(portalLabel())}</p><h1>Year 6</h1><p class="intro">Choose Lessons or SATS.</p>
    <section class="view-section"><div class="view-grid" data-year6-grid="true">
      <button class="view-card" type="button" data-year6-section="lessons"><span class="view-label">Lessons</span><span class="view-count">Year 6 teaching lessons</span></button>
      <button class="view-card" type="button" data-year6-section="sats"><span class="view-label">SATS</span><span class="view-count">Year 6 SATS practice</span></button>
    </div></section></section>`, { portal:true });
  bindShell();
  document.querySelector('#back-views')?.addEventListener('click', () => renderViews('maths'));
  document.querySelectorAll('[data-year6-section]').forEach(button => button.addEventListener('click', () => loadYear6Section(button.dataset.year6Section)));
}

async function loadYear6Section(section) {
  if (!['lessons','sats'].includes(section)) return;
  const epoch = ++navigationEpoch;
  abortScope('lesson'); clearLessonMedia();
  const controller = controllerFor('view');
  state.year6Section = section;
  state.search = '';
  const heading = section === 'sats' ? 'SATS' : 'Lessons';
  const viewId = String(state.view?.viewId || 'maths-year6');
  root.innerHTML = shell(`<section class="card">${backButton('back-year6','Year 6')}<p class="eyebrow">${escapeHtml(portalLabel())}</p><h1>${heading}</h1><div class="loading-row"><span class="spinner"></span><span>Loading your knowledge bank of lessons…</span></div></section>`, {portal:true});
  bindShell();
  document.querySelector('#back-year6')?.addEventListener('click', () => renderYear6Hub(state.view));
  try {
    const payload = await requestJson(`/api/v2/student/views/${enc(viewId)}/lessons`, { signal: controller.signal });
    if (epoch !== navigationEpoch) return;
    state.lessons = year6RowsForSection(payload.lessons || [], section);
    renderLessonList();
  } catch (error) {
    if (controller.signal.aborted || epoch !== navigationEpoch) return;
    renderViewError(error);
  }
}

'''
replace_once('function renderViews(subject) {', insert + 'function renderViews(subject) {', 'Year 6 hub insertion')

replace_once(
    "  navigationEpoch += 1; abortScope('view'); abortScope('lesson'); clearLessonMedia(); state.subject = subject;\n  const label = subject === 'maths' ? 'Maths' : 'English';\n  const views = subjectViews(subject);",
    "  navigationEpoch += 1; abortScope('view'); abortScope('lesson'); clearLessonMedia(); state.subject = subject; state.year6Section=''; state.search='';\n  const label = subject === 'maths' ? 'Maths' : 'English';\n  const views = topLevelSubjectViews(subject);",
    'renderViews reset/filter')

replace_once(
    "  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => loadView(button.dataset.view)));",
    "  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {\n    const view = topLevelSubjectViews(state.subject).find(item => item.viewId === button.dataset.view);\n    if (isYear6TeachingView(view)) renderYear6Hub(view);\n    else loadView(button.dataset.view);\n  }));",
    'view click routing')

replace_once(
    "  state.view = view;\n  root.innerHTML = shell(`",
    "  state.view = view;\n  state.year6Section = '';\n  state.search = '';\n  root.innerHTML = shell(`",
    'direct loadView reset')

old_error = '''function renderViewError(error) {
  root.innerHTML = shell(`<section class="card">${backButton('back-views', state.subject==='maths'?'Maths':'English')}<p class="eyebrow">${escapeHtml(state.subject)}</p><h1>${escapeHtml(state.view?.label||'Lessons')}</h1><div class="error-box" role="alert">${escapeHtml(friendlyError(error))}</div><p><button id="retry-view" class="button button-primary" type="button">Try again</button></p></section>`, {portal:true});
  bindShell(); document.querySelector('#back-views').addEventListener('click', () => renderViews(state.subject)); document.querySelector('#retry-view').addEventListener('click', () => loadView(state.view.viewId));
}
'''
new_error = '''function renderViewError(error) {
  const nestedYear6 = Boolean(state.year6Section) && isYear6TeachingView(state.view);
  const heading = currentLessonListHeading();
  const backId = nestedYear6 ? 'back-year6' : 'back-views';
  const backLabel = nestedYear6 ? 'Year 6' : (state.subject==='maths'?'Maths':'English');
  root.innerHTML = shell(`<section class="card">${backButton(backId, backLabel)}<p class="eyebrow">${escapeHtml(state.subject)}</p><h1>${escapeHtml(heading)}</h1><div class="error-box" role="alert">${escapeHtml(friendlyError(error))}</div><p><button id="retry-view" class="button button-primary" type="button">Try again</button></p></section>`, {portal:true});
  bindShell();
  document.querySelector(`#${backId}`)?.addEventListener('click', () => nestedYear6 ? renderYear6Hub(state.view) : renderViews(state.subject));
  document.querySelector('#retry-view')?.addEventListener('click', () => nestedYear6 ? loadYear6Section(state.year6Section) : loadView(state.view.viewId));
}
'''
replace_once(old_error, new_error, 'view error routing')

old_sats = '''function isSatsLesson(row) {
  return /^Y6MS\\d+$/i.test(String(row.displayLessonId || row.lessonId || '').trim());
}
'''
new_sats = r'''function isSatsLesson(row) {
  const values = [row?.displayLessonId, row?.lessonId].map(value => String(value || '').trim()).filter(Boolean);
  for (const value of values) {
    if (/^Y6(?:SM|MS)\d+$/i.test(value)) return true;
    const canonical = value.match(/^Y6M(\d+)$/i);
    if (canonical) {
      const n = Number(canonical[1]);
      if (n >= 51 && n <= 69) return true;
    }
  }
  return false;
}

const YEAR6_ELEVEN_PLUS_ONLY_IDS = new Set([
  'MATHS_L3_11P_T2M25_2026',
  'MATHS_L3_11P_T3M43_2026',
  'L3T2M24',
  'Y6M1.4'
]);

function isYear6ElevenPlusOnlyLesson(row) {
  const values = [row?.lessonId, row?.canonicalLessonId, row?.displayLessonId]
    .map(value => String(value || '').trim().toUpperCase())
    .filter(Boolean);
  if (values.some(value => YEAR6_ELEVEN_PLUS_ONLY_IDS.has(value))) return true;
  const display = String(row?.displayLessonId || '').trim();
  if (/^L3T\d+M\d+$/i.test(display)) return true;
  const title = String(row?.title || '').trim().toLowerCase();
  return title === 'mean median mode' || title === 'advanced statistics';
}

function year6RowsForSection(rows, section) {
  const source = Array.isArray(rows) ? rows : [];
  if (section === 'sats') return source.filter(isSatsLesson);
  return source.filter(row => !isSatsLesson(row) && !isYear6ElevenPlusOnlyLesson(row));
}

function currentLessonListHeading() {
  if (state.year6Section === 'sats' && isYear6TeachingView(state.view)) return 'SATS';
  if (state.year6Section === 'lessons' && isYear6TeachingView(state.view)) return 'Lessons';
  return state.view?.label || 'Lessons';
}

function backFromLessonList() {
  if (state.year6Section && isYear6TeachingView(state.view)) return renderYear6Hub(state.view);
  return renderViews(state.subject);
}
'''
replace_once(old_sats, new_sats, 'SATS and 11+ classification')

replace_once(
    "function lessonRowsHtml(rows) {\n  if (!rows.length) return '<div class=\"empty-state\">No lessons match your search.</div>';\n  const sats = rows.filter(isSatsLesson);",
    "function lessonRowsHtml(rows) {\n  if (!rows.length) return '<div class=\"empty-state\">No lessons match your search.</div>';\n  if (state.year6Section && isYear6TeachingView(state.view)) return rows.map(lessonRowHtml).join('');\n  const sats = rows.filter(isSatsLesson);",
    'nested section list rendering')

old_list = '''function renderLessonList() {
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
'''
new_list = '''function renderLessonList() {
  const rows = filteredLessons();
  const nestedYear6 = Boolean(state.year6Section) && isYear6TeachingView(state.view);
  const heading = currentLessonListHeading();
  const backId = nestedYear6 ? 'back-year6' : 'back-views';
  const backLabel = nestedYear6 ? 'Year 6' : (state.subject==='maths'?'Maths':'English');
  const intro = state.year6Section === 'sats' ? 'Your SATS lessons and practice papers are shown in chronological order.' : 'Your lessons are shown in chronological order.';
  root.innerHTML = shell(`<section class="card portal-card">${backButton(backId, backLabel)}<p class="eyebrow">${escapeHtml(portalLabel())}</p><h1>${escapeHtml(heading)}</h1><p class="intro">${escapeHtml(intro)}</p>
    <div class="search-wrap"><label for="lesson-search">Search lessons</label><input id="lesson-search" class="field" type="search" placeholder="Search by lesson ID, title or topic" value="${escapeHtml(state.search)}"></div>
    <div class="lesson-list-wrap">${lessonRowsHtml(rows)}</div></section>`, {portal:true});
  bindShell();
  document.querySelector(`#${backId}`)?.addEventListener('click', backFromLessonList);
  const search = document.querySelector('#lesson-search');
  search.addEventListener('input', () => { state.search = search.value; renderLessonList(); document.querySelector('#lesson-search')?.focus(); });
  document.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => loadLesson(button.dataset.lesson)));
}
'''
replace_once(old_list, new_list, 'lesson-list nested navigation')

replace_once(
    '''  root.innerHTML = shell(`<section class="card">${backButton('back-lessons','Lessons')}<div class="loading-row"><span class="spinner"></span><span>Loading lesson…</span></div></section>`, {portal:true});
  bindShell(); document.querySelector('#back-lessons').addEventListener('click', renderLessonList);''',
    '''  const lessonBackLabel = state.year6Section === 'sats' ? 'SATS' : 'Lessons';
  root.innerHTML = shell(`<section class="card">${backButton('back-lessons',lessonBackLabel)}<div class="loading-row"><span class="spinner"></span><span>Loading lesson…</span></div></section>`, {portal:true});
  bindShell(); document.querySelector('#back-lessons').addEventListener('click', renderLessonList);''',
    'lesson loading back label')

replace_once(
    '''    root.innerHTML = shell(`<section class="card">${backButton('back-lessons','Lessons')}<div class="error-box" role="alert">${escapeHtml(friendlyError(error))}</div><p><button id="retry-lesson" class="button button-primary" type="button">Try again</button></p></section>`, {portal:true});''',
    '''    const lessonBackLabel = state.year6Section === 'sats' ? 'SATS' : 'Lessons';
    root.innerHTML = shell(`<section class="card">${backButton('back-lessons',lessonBackLabel)}<div class="error-box" role="alert">${escapeHtml(friendlyError(error))}</div><p><button id="retry-lesson" class="button button-primary" type="button">Try again</button></p></section>`, {portal:true});''',
    'lesson error back label')

replace_once(
    "  state.account=null; state.home=null; state.subject=''; state.view=null; state.lessons=[]; state.lesson=null; renderLogin();",
    "  state.account=null; state.home=null; state.subject=''; state.view=null; state.year6Section=''; state.lessons=[]; state.lesson=null; state.search=''; renderLogin();",
    'logout nested state reset')

path.write_text(source, encoding='utf-8', newline='')
after = hashlib.sha256(source.encode('utf-8')).hexdigest()
print('SOURCE_SHA256_AFTER=', after)
print('YEAR6_NESTED_REPAIR_APPLIED')
