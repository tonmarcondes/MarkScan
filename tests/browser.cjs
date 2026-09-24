// Run with Node 18+ and Playwright on NODE_PATH, while the server runs on port 8080.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.MARKSCAN_URL || 'http://localhost:8080/');
    await page.waitForFunction(() => window.app && document.querySelector('#template-file'));
    assert.equal(await page.evaluate(() => !!app.camera.isActive), false);
    async function image(answers) {
      const base64 = await page.evaluate(answers => {
        const c = document.createElement('canvas'); c.width = 400; c.height = 400;
        const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 400);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          ctx.beginPath(); ctx.arc(80 + 80 * col, 80 + 80 * row, 12, 0, Math.PI * 2);
          ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
          if (answers[row] === col || (Array.isArray(answers[row]) && answers[row].includes(col))) {
            ctx.fillStyle = 'black'; ctx.fill();
          }
        }
        return c.toDataURL('image/png').split(',')[1];
      }, answers);
      return { name: 'prova.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
    }
    await page.locator('#template-file').setInputFiles(await image([0, 1, 2, 3]));
    await page.locator('#open-settings').click();
    await page.locator('#template-rows').fill('4');
    await page.locator('#student-mode').selectOption('none');
    await page.locator('#save-settings').click();
    await page.locator('#template-name').fill('Gabarito de teste');
    async function clickPoint(nx, ny) {
      const box = await page.locator('#template-preview').boundingBox();
      await page.locator('#template-preview').click({ position: { x: box.width * nx, y: box.height * ny } });
    }
    await clickPoint(.2, .2);
    assert.match(await page.locator('#calibration-instruction').textContent(), /Primeira área marcada/);
    assert.equal(await page.evaluate(() => app.ui.hitAreas[0].index), 0);
    await clickPoint(.8, .8);
    assert.match(await page.locator('#template-answers').textContent(), /1: A.*2: B.*3: C.*4: D/);
    // Individual correction, keyboard movement and undo preserve the other positions.
    await page.locator('#position-list button').first().click();
    await clickPoint(.22, .2);
    assert.ok(Math.abs(await page.evaluate(() => app.ui.positions[0][0]) - .22) < .002);
    await page.locator('#undo-position').click();
    assert.equal(await page.evaluate(() => app.ui.positions), null);
    await page.locator('#position-list button').first().click();
    await page.locator('#template-preview').press('ArrowRight');
    assert.equal(await page.evaluate(() => app.ui.positions[0][0]), .2025);
    await page.locator('#template-preview').press('Escape');
    await page.locator('#undo-position').click();
    await page.locator('#save-template').click();
    await page.waitForFunction(() => app.currentTemplate?.answers?.length === 4);
    await page.locator('#exam-file').setInputFiles(await image([0, 2, -1, 3]));
    await page.waitForFunction(() => document.querySelector('#scan-status').textContent.includes('concluída'));
    assert.deepEqual(await page.evaluate(() => app.studentAnswers), [0, 2, -1, 3]);
    assert.equal(await page.evaluate(() => app.calculateScore().score), 2);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 0);
    await page.locator('#accept-exam').click();
    await page.waitForFunction(() => !!app.review.saved);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 1);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#template-select')?.options.length === 2);
    await page.locator('#template-select').dispatchEvent('change');
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.waitForFunction(() => app.currentTemplate?.answers?.length === 4);
    // Saved images, independent positions and reading shapes remain editable.
    await page.locator('#edit-template').click();
    await page.waitForFunction(() => !!app.ui.templateImage);
    await page.locator('#open-settings').click();
    await page.locator('#mark-shape').selectOption('rectangle');
    await page.locator('#mark-width').fill('12');
    await page.locator('#mark-height').fill('8');
    await page.locator('#annotation-font').selectOption('Georgia');
    await page.locator('#annotation-fontSize').fill('20');
    await page.locator('#annotation-lineStyle').selectOption('dashed');
    await page.locator('#save-settings').click();
    await page.locator('#position-list button').first().click();
    await page.locator('#template-preview').press('ArrowRight');
    await page.locator('#template-preview').press('Escape');
    await page.locator('#save-template').click();
    await page.waitForFunction(() => app.currentTemplate?.region?.shape === 'rectangle');
    assert.equal(await page.evaluate(() => app.currentTemplate.layout.positions[0][0]), .2025);
    assert.equal(await page.locator('#template-select option').count(), 2);
    await page.locator('#exam-file').setInputFiles(await image([0, 1, [1, 2], 3]));
    await page.waitForFunction(() => app.studentAnswers?.[2] === -2);
    await page.locator('#exam-camera').click();
    await page.waitForFunction(() => app.camera.isActive);
    await page.waitForFunction(() => app.review.candidate?.ready);
    assert.match(await page.locator('#live-grade').textContent(), /Nota/);
    await page.locator('#stop-camera').click();
    await page.waitForFunction(() => !app.camera.isActive);
    assert.equal(await page.locator('#camera-panel').isVisible(), false);
    await page.locator('#exam-file').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Não foi possível abrir'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#template-select')?.options.length === 2);
    await context.setOffline(false);
    assert.equal(await page.evaluate(() => app.config.get('annotation.font')), 'Georgia');
    assert.equal(await page.evaluate(() => app.config.get('annotation.fontSize')), 20);
    assert.equal(await page.evaluate(() => app.config.get('calibration.shape')), 'rectangle');
    assert.deepEqual(errors, []);
    // Permission denial must leave file upload operational.
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permissão negada', 'NotAllowedError'); }; });
    await page.locator('#template-select').dispatchEvent('change');
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.locator('#exam-camera').click();
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('Permissão negada'));
    await page.locator('#template-select').dispatchEvent('change');
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.waitForFunction(() => !!app.currentTemplate);
    await page.locator('#exam-file').setInputFiles(await image([0, 1, 2, 3]));
    await page.waitForFunction(() => app.studentAnswers?.join() === '0,1,2,3');
    assert.equal(await page.evaluate(() => app.calculateScore().score), 4);
    // Exercise localStorage fallback and persistence across registry instances.
    assert.equal(await page.evaluate(async () => {
      const { default: Storage } = await import(new URL('js/modules/Storage.js', location.href));
      const { default: Template } = await import(new URL('js/modules/Template.js', location.href));
      const storage = new Storage(); await storage.ready; storage.useIndexedDB = false;
      await new Template(storage).registerTemplate('fallback-test', null, 'Teste', { answers: [0] });
      const templates = await new Template(storage).getAllTemplates();
      await storage.delete('fallback-test');
      return templates.some(t => t.id === 'fallback-test' && t.answers[0] === 0);
    }), true);
    // Low-contrast labels are rejected; circle, square and rectangle sample different pixels.
    await page.locator('#open-settings').click();
    await page.locator('#annotation-textColor').fill('#ffffff');
    await page.locator('#annotation-background').fill('#ffffff');
    await page.locator('#save-settings').click();
    assert.equal(await page.locator('#settings-dialog').isVisible(), true);
    assert.match(await page.locator('#settings-error').textContent(), /contraste/);
    await page.locator('#close-settings').click();
    const samples = await page.evaluate(() => {
      const data = new ImageData(21, 21); data.data.fill(255);
      // Dark corner of a square, outside the inscribed circle and a short rectangle.
      for (let y = 5; y < 8; y++) for (let x = 5; x < 8; x++) {
        const i = (y * 21 + x) * 4; data.data[i] = data.data[i + 1] = data.data[i + 2] = 0;
      }
      const omr = app.omr;
      Object.assign(omr.options, { sampleWidth: 10, sampleHeight: 10, sampleShape: 'circle' });
      const circle = omr._calculateDarkness(data, 10, 10, 5);
      omr.options.sampleShape = 'square';
      const square = omr._calculateDarkness(data, 10, 10, 5);
      omr.options.sampleShape = 'rectangle'; omr.options.sampleHeight = 4;
      return [circle, square, omr._calculateDarkness(data, 10, 10, 5)];
    });
    assert.ok(samples[1] > samples[0]); assert.equal(samples[2], 0);
    // Touch-sized viewport and zoom: mapping from displayed coordinates must remain accurate.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#template-file').setInputFiles(await image([0, 1, 2, 3]));
    await clickPoint(.2, .2);
    assert.match(await page.locator('#calibration-instruction').textContent(), /Primeira área marcada/);
    assert.ok(Math.abs(await page.evaluate(() => app.ui.corners[0][0]) - .2) < .005);
    await clickPoint(.8, .8);
    await page.locator('#open-settings').click();
    await page.locator('#annotation-zoom').selectOption('200');
    await page.locator('#mark-shape').selectOption('square');
    await page.locator('#save-settings').click();
    assert.equal(await page.evaluate(() => app.ui.templateAnalysis.region.shape), 'square');
    assert.equal(await page.evaluate(() => app.ui.templateAnalysis.region.width), .03);
    const label = await page.evaluate(() => app.ui.hitAreas[0]);
    await clickPoint((label.left + label.right) / 800, (label.top + label.bottom) / 800);
    assert.equal(await page.evaluate(() => app.ui.moveTarget), 0);
    await clickPoint(.25, .25);
    assert.ok(Math.abs(await page.evaluate(() => app.ui.positions[0][0]) - .25) < .005);
    await page.locator('#undo-position').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.MARKSCAN_SCREENSHOT) await page.screenshot({ path: process.env.MARKSCAN_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('#open-settings').click();
    if (process.env.MARKSCAN_SCREENSHOT) await page.screenshot({ path: process.env.MARKSCAN_SCREENSHOT.replace('.png', '-settings.png') });
    console.log('PASS: settings dialog, first marker, correction, undo, keyboard, saved editing, shapes, contrast, mobile/zoom; uploads, calibration, actual scoring (A/blank/multiple), history, reload, camera capture/release, invalid image, denied camera, offline, localStorage fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
