const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const flow=require('./helpers.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // A two-page PDF fixture with a cover and a blank answer form, created independently of the importer.
  const fixture=await context.newPage();let circles='';
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)circles+=`<circle cx="${100+c*100}" cy="${140+r*100}" r="12" fill="white" stroke="black" stroke-width="2"/>`;
  await fixture.setContent(`<style>@page{size:500px 600px;margin:0}body{margin:0}.page{width:500px;height:600px;break-after:page}svg{display:block}</style><div class="page"><h1>Capa da prova</h1></div><div class="page"><svg width="500" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="500" height="600" fill="white"/>${circles}</svg></div>`);
  const pdf=await fixture.pdf({preferCSSPageSize:true,printBackground:true});await fixture.close();
  await page.goto(process.env.MARKSCAN_URL||'http://localhost:8080');await page.waitForFunction(()=>window.app?.documentImport);
  assert.equal(await page.locator('.app-version').textContent(),'v1.5.0');
  assert.equal(await page.locator('#step3').isVisible(),false);
  await page.locator('#open-settings').click();assert.equal(await page.locator('#reference-thickness option[value="3"]').count(),0);
  await page.locator('#template-rows').fill('4');await page.locator('#mark-width').fill('30');await page.locator('#student-mode').selectOption('none');await page.locator('#save-settings').click();
  await page.locator('#template-file').setInputFiles({name:'prova.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.waitForFunction(()=>app.documentImport.image && document.querySelector('#pdf-page').options.length===2);
  await page.locator('#pdf-page').selectOption('2');await page.waitForFunction(()=>!!app.documentImport.image);
  if(process.env.MARKSCAN_SCREENSHOT)await page.locator('#import-preview').screenshot({path:process.env.MARKSCAN_SCREENSHOT.replace('.png','-pdf.png')});
  async function point(selector,nx,ny){const b=await page.locator(selector).boundingBox();await page.locator(selector).click({position:{x:b.width*nx,y:b.height*ny}});}
  await point('#import-preview',.1,80/600);assert.equal(await page.locator('#approve-import').isDisabled(),true);
  await point('#import-preview',.9,520/600);await flow.approveImage(page);
  assert.equal(await page.locator('#reference-step').isVisible(),false);
  const size=await page.evaluate(()=>[app.ui.templateImage.width,app.ui.templateImage.height]);assert.ok(Math.abs(size[0]-1600)<10 && Math.abs(size[1]-1760)<10);
  await page.locator('#template-name').fill('PDF recortado');await point('#template-preview',.125,60/440);await point('#template-preview',.875,360/440);
  await page.locator('#import-answers').fill('A B C D');await page.locator('#approve-mapping').click();
  await page.locator('#place-references').click();for(const [x,y]of[[.05,.04],[.95,.04],[.95,.96],[.05,.96]])await point('#template-preview',x,y);
  await page.locator('#save-template').click();await page.locator('#print-sheet-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#step3').isVisible(),false);
  await page.locator('#view-blank').click();assert.match(await page.locator('#sheet-kind').textContent(),/em branco/);
  // Both exported files must represent their labels, including imported PDFs.
  const results=await page.evaluate(async()=>{
    const out=[];for(const key of[false,true]){
      const file=app.sheetBuilder.files[key],url=URL.createObjectURL(file),img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);
      const read=await app.scanner.processImage(c.getContext('2d').getImageData(0,0,c.width,c.height));out.push(read.answers);URL.revokeObjectURL(url);
    }return out;
  });assert.deepEqual(results,[[-1,-1,-1,-1],[0,1,2,3]]);
  // Native sharing receives a pre-rendered PNG during the user's click gesture.
  await page.evaluate(()=>{navigator.canShare=()=>true;navigator.share=async data=>{window.sharedNames=data.files.map(f=>f.name);};});
  await page.locator('#share-blank').click();assert.match(await page.evaluate(()=>sharedNames[0]),/em-branco.*\.png$/);
  await page.locator('#share-key').click();assert.match(await page.evaluate(()=>sharedNames[0]),/gabarito.*\.png$/);
  await page.evaluate(()=>{navigator.canShare=()=>false;});const download=page.waitForEvent('download');await page.locator('#share-blank').click();assert.match((await download).suggestedFilename(),/em-branco/);
  const key=await page.evaluate(async()=>Array.from(new Uint8Array(await app.sheetBuilder.files[true].arrayBuffer())));
  await page.locator('#approve-sheet').click();assert.equal(await page.locator('#step1').isVisible(),false);assert.equal(await page.locator('#step3').isVisible(),true);
  await page.locator('#exam-file').setInputFiles({name:'respostas.png',mimeType:'image/png',buffer:Buffer.from(key)});await flow.approveImage(page);await page.waitForFunction(()=>app.review.pending?.grade===10);
  // Frozen pixels must exactly match the normalized photo, with no annotation rectangles/numbers.
  assert.equal(await page.evaluate(()=>{const c=document.getElementById('exam-preview'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data,src=app.review.pending.image.data;return pixels.every((v,i)=>v===src[i]);}),true);
  assert.equal(await page.locator('#exam-inputs').isVisible(),false);
  await page.locator('#accept-exam').click();await page.waitForFunction(()=>!!app.review.saved);
  await flow.models(page);
  // Template photography also uses screen touch, then requires image approval.
  await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,800,1000);navigator.mediaDevices.getUserMedia=async()=>{window.fixtureStream=c.captureStream(10);window.fixtureTimer=setInterval(()=>x.fillRect(0,0,1,1),100);return fixtureStream;};});
  await page.locator('#template-camera').click();await page.locator('#camera-stage').click();await page.locator('#import-dialog').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>!!app.camera.isActive),false);
  assert.equal(await page.locator('#btn-scan').count(),0);assert.equal(await page.locator('#freeze-exam').count(),0);
  await page.locator('#cancel-import').click();
  // Invalid PDF keeps approval disabled; cancellation leaves the prior model untouched.
  await page.locator('#template-file').setInputFiles({name:'ruim.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-invalid')});
  await page.waitForFunction(()=>document.getElementById('import-status').textContent.includes('Não foi possível abrir'));
  assert.equal(await page.locator('#approve-import').isDisabled(),true);await page.locator('#cancel-import').click();
  await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!app.currentTemplate);
  await page.locator('#template-file').setInputFiles({name:'offline.pdf',mimeType:'application/pdf',buffer:pdf});await page.waitForFunction(()=>!!app.documentImport.image);await page.locator('#cancel-import').click();
  assert.deepEqual(errors,[]);
  console.log('PASS: staged approval, minimum 5px, multipage PDF and crop, separate clean/key exports, native sharing + fallback, unannotated review, evidence, tap template camera, invalid PDF and offline PDF.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
