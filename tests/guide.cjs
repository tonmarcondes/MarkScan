const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1120,height:860}});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const output=process.env.MARKSCAN_DOC_SHOTS?path.resolve('docs/images'):null;
  const shot=async name=>{if(output)await page.screenshot({path:path.join(output,name+'.png')});};
  await page.goto(process.env.MARKSCAN_URL||'http://localhost:8080/');await page.waitForFunction(()=>window.app?.review);
  await page.locator('#new-sheet').click();await page.locator('#sheet-name').fill('Matemática · Turma A');
  await page.locator('#sheet-answers').fill('A B C D A B C D A B');await page.locator('#create-sheet').click();
  await page.locator('#print-sheet-dialog').waitFor({state:'visible'});await page.locator('#view-blank').click();await shot('modelo');
  await page.locator('#approve-sheet').click();
  await page.evaluate(async()=>{
    const sheets=await import(new URL('js/modules/SheetBuilder.js',location.href));
    const demo=structuredClone(app.currentTemplate);demo.answers[0]=1;demo.answers[5]=2;
    const image=(await sheets.svgImage(sheets.sheetSVG(demo,true))).image;
      const photo = (image, mode = 'perspective') => {
        const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
        source.getContext('2d').putImageData(image, 0, 0);
        if ([90, 180, 270].includes(mode)) {
          const c = document.createElement('canvas'); c.width = mode === 180 ? image.width : image.height; c.height = mode === 180 ? image.height : image.width;
          const ctx = c.getContext('2d'); ctx.translate(c.width / 2, c.height / 2); ctx.rotate(mode * Math.PI / 180); ctx.drawImage(source, -image.width / 2, -image.height / 2);
          return ctx.getImageData(0, 0, c.width, c.height);
        }
        const h = mode === 'tilt' ? [.7, .16, .02, .05, .86, .05, .26, .05, 1] : [.65, .04, .1, .06, .75, .08, .08, -.05, 1];
        const [a,b,c,d,e,f,g,j,k] = h;
        const inverse = [e*k-f*j,c*j-b*k,b*f-c*e,f*g-d*k,a*k-c*g,c*d-a*f,d*j-e*g,b*g-a*j,a*e-b*d];
        const output = new ImageData(1100, 1400);
        for (let y = 0; y < output.height; y++) for (let x = 0; x < output.width; x++) {
          const u = x/output.width, v = y/output.height, div = inverse[6]*u + inverse[7]*v + inverse[8];
          const sx = Math.round((inverse[0]*u + inverse[1]*v + inverse[2])/div * image.width);
          const sy = Math.round((inverse[3]*u + inverse[4]*v + inverse[5])/div * image.height);
          const i = (y*output.width+x)*4, sourceIndex = (sy*image.width+sx)*4;
          const valid = sx>=0 && sx<image.width && sy>=0 && sy<image.height;
          for (let channel = 0; channel < 3; channel++) output.data[i+channel] = valid ? image.data[sourceIndex+channel] * (.72 + .24*u) + 8 : 60;
          output.data[i+3] = 255;
        }
        return output;
      };
    window.demoPhoto=photo(image);
    const canvas=document.createElement('canvas');canvas.width=demoPhoto.width;canvas.height=demoPhoto.height;
    const ctx=canvas.getContext('2d');ctx.putImageData(demoPhoto,0,0);
    navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);window.demoTimer=setInterval(()=>ctx.putImageData(demoPhoto,0,0),100);return stream;};
  });
  await page.setViewportSize({width:390,height:844});await page.locator('#exam-camera').click();await page.locator('#fit-camera-grid').click();
  await page.waitForFunction(()=>!!app.review.gridMatrix).catch(async e=>{console.error(await page.locator('#live-state').textContent());throw e;});await page.waitForTimeout(1800);await shot('camera');
  await page.locator('#camera-stage').click();await page.waitForFunction(()=>app.review.pending?.grade===8);
  assert.equal(await page.locator('#alignment-summary').isVisible(),true);
  assert.equal(await page.locator('#original-figure').isVisible(),true);
  assert.equal(await page.locator('#original-preview').evaluate(e=>Math.round(e.getBoundingClientRect().height)),await page.locator('#exam-preview').evaluate(e=>Math.round(e.getBoundingClientRect().height)));
  assert.match(await page.locator('#review-grade').textContent(),/Nota 8/);
  assert.equal(await page.evaluate(()=>{const c=document.getElementById('exam-preview');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.every((v,i)=>v===app.review.pending.image.data[i]);}),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:1120,height:1150});await page.locator('#student-name').fill('Ana · demonstração');await page.evaluate(()=>document.getElementById('step3').scrollIntoView({block:'start'}));await shot('conferencia');
  // Known geometries verify what the displayed metric actually measures.
  const metrics=await page.evaluate(async()=>{
    const {alignmentMetrics}=await import(new URL('js/modules/AlignmentReview.js',location.href));
    const a=alignmentMetrics({quad:[[0,0],[1,0],[1,1],[0,1]],rotation:270,sourceSize:{width:800,height:1200}});
    const b=alignmentMetrics({quad:[[.25,0],[.75,0],[1,1],[0,1]],rotation:0,sourceSize:{width:800,height:1200}});
    return {a,b};
  });assert.equal(metrics.a.rotation,-90);assert.equal(metrics.a.edgeDifference,0);assert.equal(metrics.a.angleDeviation,0);assert.ok(metrics.b.angleDeviation>0);assert.equal(metrics.b.edgeDifference,50);
  await page.locator('#accept-exam').click();await page.waitForFunction(()=>!!app.review.saved);
  await page.locator('#download-current-evidence').click();await page.locator('#open-history').click();await page.setViewportSize({width:1120,height:700});await page.waitForTimeout(4000);await shot('historico');
  await page.locator('#close-history').click();await page.locator('#open-help').click();
  assert.equal(await page.locator('.icon-guide svg').count(),8);
  if(output){
   const icons=await page.evaluate(async()=>{const {iconSVG}=await import(new URL('js/modules/Icons.js',location.href));return Object.fromEntries(['grid','fit','close','check','retry','next','finish','download'].map(k=>[k,iconSVG(k).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('currentColor','#172b46')]));});
   fs.mkdirSync(path.join(output,'icons'),{recursive:true});for(const [k,v] of Object.entries(icons))fs.writeFileSync(path.join(output,'icons',k+'.svg'),v);
  }
  for(const img of await page.locator('.help-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.naturalWidth>0));}
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#help-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.locator('#close-help').click();
  if(output){assert.deepEqual(errors,[]);console.log('Documentation screenshots generated.');return;}
  await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.app?.review);await page.locator('#open-help').click();
  for(const img of await page.locator('.help-shot img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());}
  assert.deepEqual(errors,[]);console.log('PASS: automatic framing, clean corrected pixels, grade 8, geometric metrics, mobile layout, shared icons, illustrated help and offline images.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
