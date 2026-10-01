import { test, expect } from '@playwright/test';

const ordinary = { lessonId:'Y6M40', displayLessonId:'Y6T2M20', title:'Ratio and Proportion 5', description:'Ordinary Year 6 teaching lesson', locked:false };
const sats1 = { lessonId:'Y6M51', displayLessonId:'Y6SM1', title:'SATs Arithmetic Practice 1', description:'SATs paper', locked:false };
const elevenPlusMean = { lessonId:'MATHS_L3_11P_T2M25_2026', displayLessonId:'L3T2M25', title:'Mean Median Mode', description:'11+ only', locked:false };
const elevenPlusStats = { lessonId:'MATHS_L3_11P_T3M43_2026', displayLessonId:'L3T3M43', title:'Advanced Statistics', description:'11+ only', locked:false };

function homePayload({ includeL3 = false } = {}) {
  const views = [
    { viewId:'maths-year5', subject:'maths', label:'Year 5', current:true, group:'current', lockedPreview:false, openLessonCount:30, lockedLessonCount:0 },
    { viewId:'maths-year6', subject:'maths', label:'Year 6', current:true, group:'current', lockedPreview:false, openLessonCount:49, lockedLessonCount:0 }
  ];
  if (includeL3) views.push({ viewId:'maths-level3', subject:'maths', label:'L3', current:true, group:'current', lockedPreview:false, openLessonCount:2, lockedLessonCount:0 });
  return {
    ok:true,
    account:{ firstName:'Admin', status:'active', expiresOn:null },
    accountLocked:false,
    views
  };
}

async function installApi(page, { includeL3 = false } = {}) {
  let loggedIn = false;
  const calls = [];
  await page.addInitScript(() => { window.FPT_V2_CONFIG = { workerBaseUrl:'', networkTimeoutMs:1000 }; });
  await page.route('**/api/v2/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}`);
    const json = (body, status=200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });

    if (url.pathname === '/api/v2/student/home') return loggedIn ? json(homePayload({ includeL3 })) : json({error:'AUTH_REQUIRED'},401);
    if (url.pathname === '/api/v2/auth/login' && request.method() === 'POST') {
      loggedIn = true;
      return json({ok:true,account:{firstName:'Admin'},accountLocked:false});
    }
    if (url.pathname === '/api/v2/auth/logout') { loggedIn=false; return json({ok:true}); }
    if (url.pathname === '/api/v2/student/quiz/eligibility') return json({eligible:false,reason:'NOT_ELIGIBLE'});
    if (url.pathname === '/api/v2/student/views/maths-year6/lessons') {
      return json({ok:true,view:{viewId:'maths-year6'},lessons:[ordinary,sats1,elevenPlusMean,elevenPlusStats]});
    }
    if (url.pathname === '/api/v2/student/views/maths-level3/lessons') {
      return json({ok:true,view:{viewId:'maths-level3'},lessons:[elevenPlusMean,elevenPlusStats]});
    }
    if (url.pathname === '/api/v2/student/views/maths-year5/lessons') return json({ok:true,view:{viewId:'maths-year5'},lessons:[ordinary]});
    return json({error:'NOT_FOUND'},404);
  });
  return calls;
}

async function loginAndOpenMaths(page) {
  await page.goto('/');
  await page.getByLabel('Username').fill('admin0206');
  await page.getByRole('textbox',{name:'Password',exact:true}).fill('L9in');
  await page.getByRole('button',{name:'Log in'}).click();
  await expect(page.getByRole('heading',{name:/Welcome/})).toBeVisible();
  await page.getByRole('button',{name:/Maths/}).click();
  await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
}

test.describe('Live V2 Year 6 nested Lessons / SATS contract', () => {
  test('Year 6 opens a two-card hub and ordinary Lessons exclude SATS and 11+-only rows', async ({page}) => {
    const calls = await installApi(page);
    await loginAndOpenMaths(page);

    await expect(page.getByRole('button',{name:/Year 6/})).toBeVisible();
    await expect(page.getByRole('button',{name:/SATS/i})).toHaveCount(0);

    const before = calls.filter(call => call === 'GET /api/v2/student/views/maths-year6/lessons').length;
    await page.getByRole('button',{name:/Year 6/}).click();
    await expect(page.getByRole('heading',{name:'Year 6'})).toBeVisible();
    await expect(page.getByRole('button',{name:/^Lessons/})).toBeVisible();
    await expect(page.getByRole('button',{name:/^SATS/})).toBeVisible();
    expect(calls.filter(call => call === 'GET /api/v2/student/views/maths-year6/lessons').length).toBe(before);

    await page.getByRole('button',{name:/^Lessons/}).click();
    await expect(page.getByRole('heading',{name:'Lessons'})).toBeVisible();
    await expect(page.getByText('Ratio and Proportion 5')).toBeVisible();
    await expect(page.getByText('SATs Arithmetic Practice 1')).toHaveCount(0);
    await expect(page.getByText('Mean Median Mode')).toHaveCount(0);
    await expect(page.getByText('Advanced Statistics')).toHaveCount(0);

    await page.getByRole('button',{name:'Back to Year 6'}).click();
    await expect(page.getByRole('heading',{name:'Year 6'})).toBeVisible();
    await page.getByRole('button',{name:/^SATS/}).click();
    await expect(page.getByRole('heading',{name:'SATS'})).toBeVisible();
    await expect(page.getByText('SATs Arithmetic Practice 1')).toBeVisible();
    await expect(page.getByText('Ratio and Proportion 5')).toHaveCount(0);
    await expect(page.getByText('Mean Median Mode')).toHaveCount(0);
    await expect(page.getByText('Advanced Statistics')).toHaveCount(0);
  });

  test('11+-only rows remain available in L3 and are not globally hidden', async ({page}) => {
    await installApi(page,{includeL3:true});
    await loginAndOpenMaths(page);
    await page.getByRole('button',{name:/^L3/}).click();
    await expect(page.getByRole('heading',{name:'L3'})).toBeVisible();
    await expect(page.getByText('Mean Median Mode')).toBeVisible();
    await expect(page.getByText('Advanced Statistics')).toBeVisible();
  });

  test('Year 5 remains a direct lesson-list navigation', async ({page}) => {
    await installApi(page);
    await loginAndOpenMaths(page);
    await page.getByRole('button',{name:/Year 5/}).click();
    await expect(page.getByRole('heading',{name:'Year 5'})).toBeVisible();
    await expect(page.getByText('Ratio and Proportion 5')).toBeVisible();
    await expect(page.getByRole('button',{name:/^Lessons/})).toHaveCount(0);
  });
});
