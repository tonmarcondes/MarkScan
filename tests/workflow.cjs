const flow=require('./helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.MARKSCAN_URL || 'http://localhost:8080/');
  await page.waitForFunction(()=>window.app?.ui && document.getElementById('open-help'));
  assert.equal(await page.locator('.app-version').textContent(),'v1.5.0');
  assert.equal(await page.locator('#btn-apply-template').count(),0);
  await page.locator('#open-help').click();assert.match(await page.locator('#help-dialog').textContent(),/primeira alternativa/);await page.locator('#close-help').click();
  await page.locator('#open-settings').click();await page.locator('#template-rows').fill('4');await page.locator('#score-correct').fill('2');
  await page.locator('#student-mode').selectOption('none');await page.locator('#reference-thickness').selectOption('5');
  await page.locator('#close-settings').click();await page.reload();
  await page.waitForFunction(()=>app.config.get('calibration.rows')===4);
  assert.equal(await page.evaluate(()=>app.config.get('scoring.correct')),2);
  const blank=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=500;c.height=600;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,500,600);
   for(let r=0;r<4;r++)for(let col=0;col<4;col++){x.beginPath();x.arc(100+100*col,140+100*r,12,0,Math.PI*2);x.strokeStyle='black';x.lineWidth=2;x.stroke();}
   return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#template-file').setInputFiles({name:'folha-vazia.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')});await flow.approveImage(page);
  await page.locator('#template-name').fill('Modelo da minha prova');
  async function click(x,y){const b=await page.locator('#template-preview').boundingBox();await page.locator('#template-preview').click({position:{x:b.width*x/500,y:b.height*y/600}});}
  await click(100,140);await click(400,440);
  await page.locator('#import-answers').fill('A B C D');
  await page.locator('#approve-mapping').click();await page.locator('#place-references').click();
  for(const p of [[35,35],[465,35],[465,565],[35,565]])await click(...p);
  await page.locator('#save-template').click();
  await page.waitForFunction(()=>app.currentTemplate?.imported);
  const id=await page.evaluate(()=>app.currentTemplate.id);
  assert.equal(await page.evaluate(()=>app.currentTemplate.alignment.type),'solid-v1');
  await page.locator('#print-sheet-dialog').waitFor({state:'visible'});await page.locator('#print-sheet-dialog details summary').click();assert.equal(await page.locator('#download-key').isVisible(),true);
  const d=page.waitForEvent('download');await page.locator('#download-student').click();assert.match((await d).suggestedFilename(),/em-branco.*\.png$/);
  if(process.env.MARKSCAN_SCREENSHOT)await page.locator('#sheet-preview').screenshot({path:process.env.MARKSCAN_SCREENSHOT});
  await page.locator('#close-print-sheet').click();
  // Fill the exported blank image and rotate it independently of the production warp.
  const photo=await page.evaluate(async()=>{
    const image=new Image();image.src=app.currentTemplate.url;await image.decode();
    const c=document.createElement('canvas');c.width=500;c.height=600;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    for(let r=0;r<4;r++){ctx.fillStyle='black';ctx.beginPath();ctx.arc(100+100*r,140+100*r,9,0,Math.PI*2);ctx.fill();}
    const turned=document.createElement('canvas');turned.width=500;turned.height=600;const t=turned.getContext('2d');t.translate(500,600);t.rotate(Math.PI);t.drawImage(c,0,0);
    window.photoData=t.getImageData(0,0,500,600);
    return turned.toDataURL('image/png').split(',')[1];
  });
  await flow.capture(page);await page.locator('#exam-file').setInputFiles({name:'aluno.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});await flow.approveImage(page);
  await page.waitForFunction(()=>app.review.pending?.grade===10);await page.locator('#accept-exam').click();await page.waitForFunction(()=>!!app.review.saved);
  assert.equal(await page.evaluate(()=>app.review.saved.score.score),8);
  await page.reload();await page.waitForFunction(()=>app.currentTemplate?.imported);
  assert.equal(await page.locator('#template-select').inputValue(),id);
  await page.locator('#edit-template').click();await page.locator('#template-editor').waitFor({state:'visible'});
  assert.equal(await page.locator('#import-answers').inputValue(),'A B C D');
  assert.equal(await page.evaluate(()=>app.ui.referencePoints.length),4);
  await page.locator('#template-name').fill('Modelo revisado');await page.locator('#import-answers').fill('B B C D');await flow.saveModel(page);await page.locator('#close-print-sheet').click();
  await page.waitForFunction(()=>app.currentTemplate?.description==='Modelo revisado');
  assert.equal(await page.evaluate(()=>app.currentTemplate.id),id);
  // New model applies immediately; selecting the prior one switches without another button.
  await page.locator('#new-sheet').click();await page.locator('#sheet-name').fill('Modelo novo');await page.locator('#sheet-answers').fill('D C B A');await page.locator('#create-sheet').click();
  await page.locator('#print-sheet-dialog').waitFor({state:'visible'});await page.locator('#close-print-sheet').click();
  await page.locator('#template-select').selectOption(id);await page.waitForFunction(id=>app.currentTemplate?.id===id,id);
  await page.locator('#template-select').selectOption('');await page.waitForFunction(()=>app.currentTemplate===null);
  assert.equal(await page.evaluate(()=>app.scanner.currentExam),null);
  await page.locator('#template-select').selectOption(id);await page.waitForFunction(id=>app.currentTemplate?.id===id,id);
  await page.locator('#delete-template').click();await page.locator('#cancel-delete').click();assert.equal(await page.locator('#template-select option').count(),3);
  await page.locator('#delete-template').click();await page.locator('#confirm-delete').click();await page.locator('#delete-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#template-select option').count(),2);
  assert.equal(await page.evaluate(async()=> (await app.storage.getHistory()).length),1);
  assert.equal(await page.evaluate(()=>app.currentTemplate),null);
  assert.deepEqual(errors,[]);
  console.log('PASS: version, help, automatic settings persistence, blank import + answer key, reference placement, PNG export, rotated correction, evidence, reload auto-selection, edit, switching, deselect, deletion preserves history.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
