import { test, expect } from '@playwright/test';

function homePayload() {
  return {
    ok: true,
    account: { firstName: 'Ava', status: 'active', expiresOn: null },
    accountLocked: false,
    views: [
      { viewId:'maths-level3', subject:'maths', label:'L3', current:true, group:'current', lockedPreview:false, openLessonCount:4, lockedLessonCount:39 },
      { viewId:'maths-level2', subject:'maths', label:'L2', current:true, group:'current', lockedPreview:false, openLessonCount:38, lockedLessonCount:0 },
      { viewId:'english-year5', subject:'english', label:'Year 5', current:true, group:'current', lockedPreview:false, openLessonCount:3, lockedLessonCount:0 }
    ]
  };
}

async function installApi(page, { eligibility = { status:200, body:{ eligible:true } }, launch = { status:200, body:{ launchUrl:'https://quiz.futureperfect.education/launch?code=fixture' } } } = {}) {
  let loggedIn = false;
  const calls = [];
  await page.addInitScript(() => { window.FPT_V2_CONFIG = { workerBaseUrl:'', networkTimeoutMs:500 }; });
  await page.route('**/api/v2/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}`);
    const json = (body, status=200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });

    if (url.pathname === '/api/v2/student/home') return loggedIn ? json(homePayload()) : json({error:'AUTH_REQUIRED'},401);
    if (url.pathname === '/api/v2/auth/login' && request.method() === 'POST') {
      loggedIn = true;
      return json({ok:true,account:{firstName:'Ava'},accountLocked:false});
    }
    if (url.pathname === '/api/v2/auth/logout') { loggedIn=false; return json({ok:true}); }
    if (url.pathname === '/api/v2/student/quiz/eligibility') {
      if (eligibility.abort) return route.abort('failed');
      return json(eligibility.body || {}, eligibility.status || 200);
    }
    if (url.pathname === '/api/v2/student/quiz/launch' && request.method() === 'POST') {
      return json(launch.body || {}, launch.status || 200);
    }
    if (/^\/api\/v2\/student\/views\//.test(url.pathname)) return json({ok:true,view:{},lessons:[]});
    return json({error:'NOT_FOUND'},404);
  });
  return calls;
}

async function login(page) {
  await page.goto('/');
  await page.getByLabel('Username').fill('ava0101');
  await page.getByRole('textbox',{name:'Password',exact:true}).fill('L9in');
  await page.getByRole('button',{name:'Log in'}).click();
  await expect(page.getByRole('heading',{name:/Welcome/})).toBeVisible();
}

async function openMaths(page) {
  await page.getByRole('button',{name:/Maths/}).click();
  await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
  await expect(page.getByRole('button',{name:/L3/})).toBeVisible();
}

test.describe('Step 10 Maths practice card', () => {
  test('Portal remains usable and practice stays hidden when Quiz eligibility is unavailable', async ({page}) => {
    const calls = await installApi(page,{eligibility:{abort:true}});
    await login(page);
    await openMaths(page);
    await page.waitForTimeout(150);
    await expect(page.getByText('11+ Practice')).toHaveCount(0);
    await expect(page.getByRole('button',{name:/L3/})).toBeVisible();
    await expect(page.getByRole('button',{name:/L2/})).toBeVisible();
    expect(calls).toContain('GET /api/v2/student/quiz/eligibility');
  });

  test('server ineligibility fails closed while normal Maths remains usable', async ({page}) => {
    await installApi(page,{eligibility:{status:200,body:{eligible:false,reason:'NOT_ELIGIBLE'}}});
    await login(page);
    await openMaths(page);
    await page.waitForTimeout(100);
    await expect(page.getByText('11+ Practice')).toHaveCount(0);
    await expect(page.getByRole('button',{name:/L3/})).toBeVisible();
  });

  test('eligible student sees approved card only on Maths', async ({page}) => {
    await installApi(page);
    await login(page);
    await openMaths(page);
    const card = page.locator('[data-quiz-practice]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('11+ Practice');
    await expect(card).toContainText('Take a real exam style GL quiz');

    await page.getByRole('button',{name:'Back to Subjects'}).click();
    await page.getByRole('button',{name:/English/}).click();
    await expect(page.getByRole('heading',{name:'English'})).toBeVisible();
    await expect(page.locator('[data-quiz-practice]')).toHaveCount(0);
  });

  test('Quiz launch outage does not break the Maths page', async ({page}) => {
    await installApi(page,{launch:{status:503,body:{error:'QUIZ_UNAVAILABLE'}}});
    await login(page);
    await openMaths(page);
    const card = page.locator('[data-quiz-practice]');
    await expect(card).toHaveCount(1);
    await card.click();
    await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
    await expect(page.getByRole('button',{name:/L3/})).toBeVisible();
    await expect(card).toContainText('Quiz unavailable · Try again');
    await expect(card).toBeEnabled();
  });

  test('launch authorization failure removes only the practice card', async ({page}) => {
    await installApi(page,{launch:{status:403,body:{error:'QUIZ_NOT_ELIGIBLE'}}});
    await login(page);
    await openMaths(page);
    const card = page.locator('[data-quiz-practice]');
    await expect(card).toHaveCount(1);
    await card.click();
    await expect(card).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
    await expect(page.getByRole('button',{name:/L3/})).toBeVisible();
  });
});
