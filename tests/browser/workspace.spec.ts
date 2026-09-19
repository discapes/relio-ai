import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('workspace, memory, source viewer and simulator form one navigable product', async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Good morning, Ana.'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your morning brief'})).toBeVisible();
 await page.getByRole('link',{name:'Project memory'}).click();
 await expect(page.getByRole('heading',{name:'Project memory',exact:true})).toBeVisible();
 const source=page.locator('a[href^="/source/"]').first();await expect(source).toBeVisible();await source.click();
 await expect(page.locator('.source-text')).toBeVisible();
 await page.goto('/?view=email',{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Acme, in your inbox.'})).toBeVisible();
 await page.getByRole('button',{name:'New message',exact:true}).click();
 await page.locator('[name=to]').fill('lena.fischer@acme-org.example');
 await page.locator('[name=subject]').fill('Private mailbox test');
 await page.locator('[name=body]').fill('Only the employee mailbox receives this unique scheduling detail: ALPHA-9941.');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(page.getByText('Private mailbox test').first()).toBeVisible();
 await page.goto('/?view=memory');
 const search=page.getByPlaceholder(/Search/).first();await search.fill('ALPHA-9941');
 await expect(page.getByText('Only the employee mailbox receives this unique scheduling detail: ALPHA-9941.')).toHaveCount(0);
});

test('private preferences persist and demo identities isolate them',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const memory=page.getByRole('button',{name:/What.*remember|Personal memory|Remembered/i}).first();
 if(await memory.count())await memory.click();
 await page.locator('[name=text]').first().fill('Follow bakery decisions under PRIVATE-9822.');
 await page.getByRole('button',{name:/Remember|Save preference|Save goal/i}).first().click();
 await expect(page.getByText('Follow bakery decisions under PRIVATE-9822.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('Follow bakery decisions under PRIVATE-9822.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Switch view',exact:true}).click();
 await page.locator('[name=personaId]').selectOption('marco');
 await page.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Good morning, Marco.'})).toBeVisible();
 await expect(page.getByText('Follow bakery decisions under PRIVATE-9822.',{exact:true})).toHaveCount(0);
});

test('foreign-project persona receives no Acme sources and source routes enforce clearance',async({page})=>{
 await page.goto('/?view=memory');
 const sourcePath=await page.locator('a[href^="/source/"]').first().getAttribute('href');
 await page.request.post('/session',{form:{personaId:'other',level:'3'}});
 await page.goto('/?view=memory');
 await expect(page.locator('a[href^="/source/"]')).toHaveCount(0);
 const response=await page.request.get(sourcePath!);expect(response.status()).toBe(404);
});

test('desktop and mobile core controls have no serious accessibility failures',async({page})=>{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('/',{waitUntil:'networkidle'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const result=await new AxeBuilder({page}).analyze();
  expect(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
 }
});
