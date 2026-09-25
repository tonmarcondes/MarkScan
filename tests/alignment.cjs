const flow=require('./helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.MARKSCAN_URL || 'http://localhost:8080/');
    await page.waitForFunction(() => !!window.app?.sheetBuilder);
    await page.locator('#open-settings').click();
    await page.locator('#student-mode').selectOption('none');
    await page.locator('#save-settings').click();
    if (process.env.MARKSCAN_CODED) await page.evaluate(() => app.config.update({calibration:{referenceStyle:'coded'}}));
    await page.locator('#new-sheet').click();
    await page.locator('#sheet-name').fill('Prova com referências');
    await page.locator('#sheet-answers').fill('A B');
    await page.locator('#create-sheet').click();
    assert.match(await page.locator('#sheet-error').textContent(), /10 respostas/);
    await page.locator('#sheet-answers').fill('A B C D A B C D A B');
    await page.locator('#create-sheet').click();
    await page.locator('#print-sheet-dialog').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => app.currentTemplate.alignment.markers.length), 4);
    if (process.env.MARKSCAN_SCREENSHOT) await page.locator('#sheet-preview').screenshot({ path: process.env.MARKSCAN_SCREENSHOT });
    await page.locator('#print-sheet-dialog details summary').click();
    const downloaded = page.waitForEvent('download'); await page.locator('#download-student').click();
    assert.match((await downloaded).suggestedFilename(), /em-branco.*\.png$/);
    // Printing is an actual SVG page, not a screenshot of the application.
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#print-student').click(); const popup = await popupPromise;
    await popup.waitForLoadState(); assert.equal(await popup.locator('svg').count(), 1);
    assert.match(await popup.locator('svg').textContent(), /FOLHA DO ALUNO/);
    if (process.env.MARKSCAN_SCREENSHOT) { await popup.emulateMedia({ media: 'print' }); await popup.screenshot({ path: process.env.MARKSCAN_SCREENSHOT.replace('.png', '-print.png'), fullPage: true }); }
    await popup.close(); await page.locator('#close-print-sheet').click();

    // Independent perspective fixture: explicitly invert a fixed 3x3 camera mapping.
    // No production homography/warping helpers are used to create the input photographs.
    await page.evaluate(async () => {
      window.sheets = await import(new URL('js/modules/SheetBuilder.js', location.href));
      window.originalTemplate = JSON.parse(JSON.stringify(app.currentTemplate));
      window.testSheet = (await sheets.svgImage(sheets.sheetSVG(originalTemplate, true))).image;
      window.photo = (image, mode = 'perspective') => {
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
      window.imageFile = image => {
        const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
        c.getContext('2d').putImageData(image,0,0); return c.toDataURL('image/png').split(',')[1];
      };
    });
    const expected = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
    for (const mode of [90, 180, 270, 'perspective', 'tilt']) {
      const result = await page.evaluate(async mode => {
        const start = performance.now(); const result = await app.scanner.processImage(photo(testSheet, mode));
        return { answers: result.answers, alignment: result.alignment, elapsed: Math.round(performance.now()-start) };
      }, mode);
      assert.deepEqual(result.answers, expected, `answers after ${mode}`);
      assert.equal(result.alignment.markerIds.length, 4);
      if (typeof mode === 'number') assert.ok(Math.abs(result.alignment.rotation - mode) < 2);
      console.log(`PASS: ${mode}, reprojection ${result.alignment.reprojectionError}px, ${result.elapsed}ms`);
    }
    // Mark missing/incorrect/duplicated/mirrored pages must not silently fall back to a grid.
    for (const failure of (process.env.MARKSCAN_CODED ? ['missing', 'wrong', 'duplicate', 'mirror'] : ['missing', 'mirror'])) {
      const message = await page.evaluate(async failure => {
        let image = testSheet;
        if (failure === 'wrong') {
          const other = sheets.buildTemplate('Outra prova', app.config.get('calibration'), originalTemplate.answers);
          image = (await sheets.svgImage(sheets.sheetSVG(other, true))).image;
        } else {
          const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
          const ctx = c.getContext('2d'); ctx.putImageData(image, 0, 0);
          if (failure === 'missing') { ctx.fillStyle = 'white'; ctx.fillRect(10,10,90,90); }
          if (failure === 'duplicate') ctx.drawImage(c, 16,16,72,72,370,400,72,72);
          if (failure === 'mirror') { ctx.translate(c.width,0); ctx.scale(-1,1); ctx.drawImage(c,0,0); }
          image = ctx.getImageData(0,0,c.width,c.height);
        }
        try { await app.scanner.processImage(image); return null; } catch (error) { return error.message; }
      }, failure);
      assert.ok(message, `must reject ${failure}`);
    }
    if (!process.env.MARKSCAN_CODED) assert.equal(await page.evaluate(async()=>{
      for(const referenceThickness of [5,8,10]) {
        const t=sheets.buildTemplate('Espessura de referência',{...app.config.get('calibration'),referenceThickness},originalTemplate.answers);
        app.currentTemplate=t;
        const img=(await sheets.svgImage(sheets.sheetSVG(t,true))).image;
        const read=await app.scanner.processImage(photo(img,180));
        if(read.answers.some((a,i)=>a!==originalTemplate.answers[i])) throw new Error(`Leitura com ${referenceThickness}px falhou`);
      }
      app.currentTemplate=originalTemplate;return true;
    }),true);
    // Generated forms support multiple blocks and all response shapes.
    assert.equal(await page.evaluate(async () => {
      for (const shape of ['circle', 'square', 'rectangle']) {
        const settings = { ...app.config.get('calibration'), rows: 100, cols: 8, shape };
        const answers = Array.from({length:100},(_,i)=>i%8);
        const t = sheets.buildTemplate('Cem questões',settings,answers);
        const img = (await sheets.svgImage(sheets.sheetSVG(t,true))).image;
        app.currentTemplate = t;
        const result = await app.scanner.processImage(photo(img,180));
        if (result.answers.some((value,i)=>value!==answers[i])) throw new Error(`Incorrect ${shape}: ${result.answers}`);
      }
      app.currentTemplate = originalTemplate; return true;
    }), true);

    const upload = Buffer.from(await page.evaluate(() => imageFile(photo(testSheet))), 'base64');
    await flow.capture(page);
    await page.locator('#exam-file').setInputFiles({name:'prova-perspectiva.png',mimeType:'image/png',buffer:upload});
    await flow.approveImage(page);
    await page.waitForFunction(() => app.review.pending?.alignment && app.review.pending.grade === 10);
    await page.locator('#accept-exam').click(); await page.waitForFunction(() => !!app.review.saved);
    assert.equal(await page.evaluate(async () => {
      const record = (await app.storage.getHistory())[0];
      const evidence = new Image(); evidence.src = await app.storage.getEvidence(record.id); await evidence.decode();
      return record.alignment.markerIds.length===4 && evidence.naturalHeight>2400;
    }), true);
    await page.locator('#next-exam').click();
    await page.evaluate(() => {
      window.videoPhoto = photo(testSheet);
      window.sourceCanvas = document.createElement('canvas'); sourceCanvas.width=videoPhoto.width; sourceCanvas.height=videoPhoto.height;
      const ctx=sourceCanvas.getContext('2d');ctx.putImageData(videoPhoto,0,0);
      navigator.mediaDevices.getUserMedia=async()=>{
        const stream=sourceCanvas.captureStream(10);
        window.frameTimer=setInterval(()=>ctx.putImageData(videoPhoto,0,0),100);return stream;
      };
    });
    await page.locator('#exam-camera').click();
    assert.equal(await page.locator('#accept-exam').isVisible(),false);
    await page.setViewportSize({width:390,height:844});
    await page.locator('#fit-camera-grid').click();
    await page.waitForFunction(()=>!!app.review.gridMatrix);
    assert.equal(await page.locator('#fit-camera-grid').getAttribute('aria-pressed'),'true');
    const bounds=await page.locator('#camera-stage').boundingBox();
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.y+bounds.height<844);
    await page.screenshot({path:'/tmp/markscan-camera-mobile.png'});
    await page.evaluate(()=>{window.goodPhoto=videoPhoto;videoPhoto=new ImageData(videoPhoto.width,videoPhoto.height);videoPhoto.data.fill(255);});
    await page.waitForFunction(()=>!app.review.gridMatrix);
    await page.evaluate(()=>{videoPhoto=goodPhoto;});
    await page.waitForFunction(()=>!!app.review.gridMatrix);
    await page.locator('#toggle-camera-grid').click();
    assert.equal(await page.locator('#toggle-camera-grid').getAttribute('aria-pressed'),'false');
    await page.setViewportSize({width:1280,height:900});
    await page.locator('#camera-stage').click();
    await page.waitForFunction(()=>app.review.pending?.grade===10);
    assert.equal(await page.locator('#camera-panel').isVisible(),false);
    if(process.env.MARKSCAN_SCREENSHOT) await page.locator('#exam-preview').screenshot({path:process.env.MARKSCAN_SCREENSHOT.replace('.png','-camera.png')});
    await page.locator('#retake-exam').click();
    await page.evaluate(()=>{videoPhoto=new ImageData(videoPhoto.width,videoPhoto.height);videoPhoto.data.fill(255);});
    await page.waitForTimeout(150);await page.locator('#camera-stage').click();
    await page.waitForFunction(()=>!!app.review.failedCapture);
    assert.equal(await page.locator('#alignment-summary').isVisible(),false);
    assert.equal(await page.locator('#original-figure').isVisible(),false);
    assert.equal(await page.locator('#accept-exam').isVisible(),false);
    assert.match(await page.locator('#scan-status').textContent(),/0\/4/);
    await flow.models(page);
    // Editing the answer key keeps the marker IDs and the same template record.
    await page.locator('#edit-template').click();
    await page.locator('#sheet-answers').fill('B B C D A B C D A B');
    await page.locator('#create-sheet').click();await page.locator('#print-sheet-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#template-select option').count(),2);
    assert.deepEqual(await page.evaluate(()=>app.currentTemplate.alignment.markers),await page.evaluate(()=>originalTemplate.alignment.markers));
    await page.locator('#close-print-sheet').click();
    await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();
    await page.waitForFunction(()=>document.querySelector('#template-select')?.options.length===2);
    await page.locator('#template-select').dispatchEvent('change');
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.waitForFunction(()=>!!app.currentTemplate?.alignment);
    await flow.capture(page);
    await page.locator('#exam-file').setInputFiles({name:'offline.png',mimeType:'image/png',buffer:upload});
    await flow.approveImage(page);
    await page.waitForFunction(()=>app.review.pending?.grade===9);
    assert.deepEqual(errors,[]);
    console.log('PASS: creator, downloads/print, 90/180/270, independent perspective + lighting, rejection gates, 100 questions/eight options/all shapes, tap capture, missing references rejected, original + rectified evidence, editing, offline.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
