import { test, expect } from '@playwright/test';

function homePayload() {
  return {
    ok: true,
    account: { firstName: 'Ava', status: 'active', expiresOn: null },
    accountLocked: false,
    modelVersion: 'a-1',
    views: [
      { viewId:'maths-year6', subject:'maths', label:'Year 6', current:true, group:'current', lockedPreview:false, openLessonCount:2, lockedLessonCount:1 },
      { viewId:'maths-level3', subject:'maths', label:'L3', current:true, group:'current', lockedPreview:false, openLessonCount:1, lockedLessonCount:0 },
      { viewId:'maths-level2', subject:'maths', label:'L2', current:true, group:'current', lockedPreview:true, openLessonCount:0, lockedLessonCount:1 },
      { viewId:'english-year6', subject:'english', label:'Year 6', current:true, group:'current', lockedPreview:false, openLessonCount:1, lockedLessonCount:0 },
      { viewId:'english-year5', subject:'english', label:'Year 5', current:false, group:'previous', lockedPreview:false, openLessonCount:1, lockedLessonCount:2 }
    ]
  };
}

const lessons = {
  'maths-year6': [
    { lessonId:'M1', displayLessonId:'Y6M01', title:'Ratio and Proportion', order:1, open:true, locked:false, accessMode:'full' },
    { lessonId:'LOCK', displayLessonId:'Y6M02', title:'Future Lesson', order:2, open:false, locked:true, accessMode:'locked' }
  ],
  'maths-level3': [{ lessonId:'L3A', displayLessonId:'L3T1M01', title:'11+ Number', order:1, open:true, locked:false, accessMode:'full' }],
  'maths-level2': [{ lessonId:'L2LOCK', displayLessonId:'L2T1M01', title:'Preview Lesson', order:1, open:false, locked:true, accessMode:'locked' }],
  'english-year6': [{ lessonId:'E1', displayLessonId:'Y6E01', title:'Grammar', order:1, open:true, locked:false, accessMode:'full' }],
  'english-year5': [{ lessonId:'E5', displayLessonId:'Y5E01', title:'Comprehension', order:1, open:true, locked:false, accessMode:'full' }]
};

const lessonDetail = {
  ok:true,
  resourcesIncluded:true,
  view:{viewId:'maths-year6',label:'Year 6',lockedPreview:false},
  lesson:{lessonId:'M1',displayLessonId:'Y6M01',title:'Ratio and Proportion',description:'Understand ratio in context.',open:true,locked:false,accessMode:'full'},
  resources:[
    {resourceId:'r-video',type:'video',displayName:'Lesson Video',protected:false},
    {resourceId:'r-pre',type:'prelesson',displayName:'PreLesson Sheet',protected:false},
    {resourceId:'r-home',type:'homework',displayName:'Homework',protected:false},
    {resourceId:'r-answer',type:'answer-pack',displayName:'Answer Pack',protected:true}
  ]
};

async function installApi(page, options = {}) {
  let loggedIn = false;
  const calls = [];
  await page.addInitScript(timeout => { window.FPT_V2_CONFIG = { workerBaseUrl:'', networkTimeoutMs:timeout }; }, options.timeoutMs || 8000);
  await page.route('**/api/v2/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}${url.search}`);
    const json = (body, status=200) => route.fulfill({status, contentType:'application/json', body:JSON.stringify(body)});

    if (url.pathname === '/api/v2/student/home') return loggedIn ? json(homePayload()) : json({error:'AUTH_REQUIRED'},401);
    if (url.pathname === '/api/v2/auth/login' && request.method() === 'POST') {
      const body = request.postDataJSON();
      if (body.username === 'ava0101' && body.password === 'L9in') { loggedIn = true; return json({ok:true,account:{firstName:'Ava'},accountLocked:false}); }
      return json({error:'LOGIN_INVALID'},401);
    }
    if (url.pathname === '/api/v2/auth/logout') { loggedIn=false; return json({ok:true}); }
    const viewMatch = url.pathname.match(/^\/api\/v2\/student\/views\/([^/]+)\/lessons$/);
    if (viewMatch) {
      const id = decodeURIComponent(viewMatch[1]);
      if (options.slowView === id) {
        await new Promise(resolve => setTimeout(resolve, options.slowMs || 800));
        if (route.request().isNavigationRequest()) return;
      }
      return json({ok:true,view:{viewId:id,label:id},lessons:lessons[id]||[]});
    }
    if (url.pathname === '/api/v2/student/lessons/M1') return json(lessonDetail);
    if (url.pathname === '/api/v2/student/lessons/LOCK') return json({ok:true,resourcesIncluded:false,view:{viewId:'maths-year6',label:'Year 6',lockedPreview:false},lesson:{lessonId:'LOCK',displayLessonId:'Y6M02',title:'Future Lesson',description:'',open:false,locked:true,accessMode:'locked'},resources:[]});
    if (url.pathname.endsWith('/resources/r-answer/open') && request.method()==='POST') {
      const body = request.postDataJSON();
      if (body.password !== 'P9ck') return json({error:'ANSWER_PASSWORD_INVALID'},401);
      return json({ok:true,kind:'answer-view',viewerUrl:'/api/v2/student/resource?cap=test&viewId=maths-year6&lessonId=M1&resourceId=r-answer'});
    }
    if (url.pathname.endsWith('/resources/r-video/open')) return route.fulfill({status:204,body:''});
    if (url.pathname === '/api/v2/student/resource') return route.fulfill({status:500,contentType:'text/plain',body:'fixture intentionally unavailable'});
    return json({error:'NOT_FOUND'},404);
  });
  return calls;
}

async function login(page) {
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Student Login'})).toBeVisible();
  await page.getByLabel('Username').fill('ava0101');
  await page.getByRole('textbox',{name:'Password',exact:true}).fill('L9in');
  await page.getByRole('button',{name:'Log in'}).click();
  await expect(page.getByRole('heading',{name:/Welcome/})).toBeVisible();
}

test('clean desktop journey keeps subject local and video lazy', async ({page}, testInfo) => {
  const calls = await installApi(page);
  const protectedAssets = [];
  page.on('request', request => { if (/protected-viewer|pdf\.worker|pdfjs/i.test(request.url())) protectedAssets.push(request.url()); });
  await login(page);
  const beforeSubject = calls.length;
  await page.getByRole('button',{name:/Maths/}).click();
  await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
  expect(calls.slice(beforeSubject)).toEqual(['GET /api/v2/student/quiz/eligibility']);
  expect(calls.some(call => call.includes('/subjects/'))).toBeFalsy();

  await page.getByRole('button',{name:/Year 6/}).click();
  await expect(page.getByText('Ratio and Proportion')).toBeVisible();
  const actions = page.locator('.lesson-action');
  const a = await actions.nth(0).boundingBox();
  const b = await actions.nth(1).boundingBox();
  expect(Math.abs(a.x-b.x)).toBeLessThan(2);

  await page.getByRole('button',{name:'Open'}).first().click();
  await expect(page.getByRole('heading',{name:'Ratio and Proportion'})).toBeVisible();
  expect(protectedAssets.length).toBe(0);
  const iframe = page.locator('#lesson-player');
  const videoToggle = page.locator('#video-toggle');
  expect(await iframe.getAttribute('src')).toBeNull();
  await videoToggle.click();
  await expect.poll(() => iframe.getAttribute('src')).toContain('/resources/r-video/open');
  await videoToggle.click();
  expect(await iframe.getAttribute('src')).toContain('/resources/r-video/open');

  const ordinary = page.locator('[data-direct-resource="r-home"]');
  expect(await ordinary.getAttribute('href')).toContain('/resources/r-home/open');

  await page.locator('[data-answer="r-answer"]').click();
  await page.getByLabel('Answer Pack password').fill('P9ck');
  await page.getByRole('button',{name:'Open Answer Pack'}).click();
  await expect(page.getByText('Protected viewer')).toBeVisible();
  await expect.poll(() => protectedAssets.length).toBeGreaterThan(0);

  await testInfo.attach('desktop-screenshot', { body: await page.screenshot({fullPage:true}), contentType:'image/png' });
});

test('mobile layout has no horizontal overflow and subject cards stack', async ({page}, testInfo) => {
  await installApi(page);
  await login(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const maths = await page.getByRole('button',{name:/Maths/}).boundingBox();
  const english = await page.getByRole('button',{name:/English/}).boundingBox();
  if ((await page.viewportSize()).width <= 720) expect(english.y).toBeGreaterThan(maths.y + maths.height - 2);
  await testInfo.attach('mobile-screenshot', { body: await page.screenshot({fullPage:true}), contentType:'image/png' });
});

test('locked preview exposes no resource controls', async ({page}) => {
  await installApi(page);
  await login(page);
  await page.getByRole('button',{name:/Maths/}).click();
  await page.getByRole('button',{name:/Year 6/}).click();
  await page.getByRole('button',{name:'Preview'}).click();
  await expect(page.getByText(/visible as a preview/)).toBeVisible();
  await expect(page.locator('[data-direct-resource]')).toHaveCount(0);
  await expect(page.locator('[data-answer]')).toHaveCount(0);
  await expect(page.locator('#lesson-player')).toHaveCount(0);
});

test('stale slow navigation is cancelled and does not overwrite the latest screen', async ({page}) => {
  await installApi(page,{slowView:'maths-year6',slowMs:700,timeoutMs:1500});
  await login(page);
  await page.getByRole('button',{name:/Maths/}).click();
  await page.getByRole('button',{name:/Year 6/}).click();
  await expect(page.getByText(/Loading your knowledge bank/)).toBeVisible();
  await page.getByRole('button',{name:/Maths/}).click();
  await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
  await page.waitForTimeout(850);
  await expect(page.getByRole('heading',{name:'Maths'})).toBeVisible();
  await expect(page.getByText('Ratio and Proportion')).toHaveCount(0);
});

test('bounded timeout becomes an explicit retry state', async ({page}) => {
  await installApi(page,{slowView:'english-year6',slowMs:900,timeoutMs:120});
  await login(page);
  await page.getByRole('button',{name:/English/}).click();
  await page.getByRole('button',{name:/Year 6/}).click();
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible({timeout:1500});
  await expect(page.getByText(/taking longer than expected|could not be loaded/)).toBeVisible();
});
