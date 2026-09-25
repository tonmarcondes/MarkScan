const flow=require('./helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.MARKSCAN_URL || 'http://localhost:8080/');
    await page.waitForFunction(() => !!window.app?.review);
    assert.equal(await page.locator('input[type=number]').evaluateAll(inputs=>inputs.every(i=>['numeric','decimal'].includes(i.inputMode))),true);
    await page.evaluate(async () => {
      window.sheet = document.createElement('canvas'); sheet.width = 400; sheet.height = 400;
      window.drawSheet = answers => {
        window.latestAnswers = answers;
        const ctx = sheet.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 400);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          ctx.beginPath(); ctx.arc(80 + col * 80, 80 + row * 80, 12, 0, Math.PI * 2);
          ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
          if (answers[row] === col) { ctx.fillStyle = '#000'; ctx.fill(); }
        }
      };
      drawSheet([0, 1, 2, 3]);
      await app.template.registerTemplate('known', sheet.toDataURL(), 'Prova conhecida', {
        answers: [0, 1, 2, 3], layout: { rows: 4, cols: 4, left: .2, top: .2, right: .8, bottom: .8 },
        imageSize: { width: 400, height: 400 }, region: { shape: 'circle', width: .025, height: .025 }, threshold: 128
      });
      await app._loadTemplates(); document.getElementById('template-select').value = 'known';
      navigator.mediaDevices.getUserMedia = async () => { const stream = sheet.captureStream(15); window.sheetTimer = setInterval(() => drawSheet(window.latestAnswers), 100); return stream; };
    });
    await page.locator('#template-select').dispatchEvent('change');
    await page.waitForFunction(() => !!app.currentTemplate);
    await flow.capture(page);
    await page.locator('#exam-camera').click();
    await page.locator('#camera-stage').click();
    await page.waitForFunction(() => app.review.candidate?.ready && app.review.candidate.grade === 10).catch(async error => { console.error(await page.evaluate(() => ({ toast: document.getElementById('toast')?.textContent, state: document.getElementById('live-state')?.textContent, camera: app.camera.isActive, grade: app.review.candidate?.grade, answers: app.review.candidate?.answers, live: app.review.live, opening: app.ui.openingCamera }))); throw error; });
    assert.equal(await page.evaluate(()=>app.review.pending.grade),10);
    assert.equal(await page.locator('#alignment-summary').isVisible(),false);
    if (process.env.MARKSCAN_SCREENSHOT) await page.locator('#exam-preview').screenshot({ path: process.env.MARKSCAN_SCREENSHOT });
    assert.equal(await page.evaluate(()=>app.review.pending.score.score),4);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 0);
    await page.locator('#accept-exam').click();
    assert.match(await page.locator('#toast').textContent(), /nome do aluno/);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 0);
    await page.locator('#student-name').fill('Aluno de teste');
    // Change the live pixels immediately after the displayed frame; the accepted grade and
    // evidence must still use the same frozen candidate. Double-click must create one record.
    await page.evaluate(async () => {
      drawSheet([-1, -1, -1, -1]);
      await Promise.all([app.review.accept(), app.review.accept()]);
    });
    assert.equal(await page.evaluate(() => !!app.camera.isActive), true);
    const record = await page.evaluate(async () => (await app.storage.getHistory())[0]);
    assert.equal(record.student.name, 'Aluno de teste'); assert.equal(record.grade, 10);
    assert.deepEqual(record.answers, [0, 1, 2, 3]);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 1);
    const pixel = await page.evaluate(async id => {
      const source = await app.storage.getEvidence(id);
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: image.width, black: ctx.getImageData(180, 390, 1, 1).data[0], white: ctx.getImageData(360, 390, 1, 1).data[0] };
    }, record.id);
    assert.equal(pixel.width, 900); assert.ok(pixel.black < 40); assert.ok(pixel.white > 220);
    await page.locator('#open-history').click();
    await page.locator('#history-list button').first().click();
    await page.locator('#evidence-dialog').waitFor({ state: 'visible' });
    if (process.env.MARKSCAN_SCREENSHOT) await page.locator('#evidence-dialog').screenshot({ path: process.env.MARKSCAN_SCREENSHOT.replace('.png', '-evidence.png') });
    const downloaded = page.waitForEvent('download'); await page.locator('#download-evidence').click();
    const download = await downloaded; assert.match(download.suggestedFilename(), /Aluno-de-teste/);
    assert.equal(await download.failure(), null);
    await page.locator('#close-evidence').click(); await page.locator('#close-history').click();
    await page.locator('#next-exam').click();
    assert.equal(await page.locator('#student-name').inputValue(), '');
    await page.evaluate(() => drawSheet([0, 2, -1, 3]));
    await page.waitForTimeout(150); await page.locator('#camera-stage').click();
    await page.waitForFunction(() => app.review.candidate?.ready && app.review.candidate.grade === 5);
    // Settings import, mandatory roster selection, different students and next-student advance.
    await page.locator('#open-settings').click();
    await page.locator('#roster-file').setInputFiles({ name: 'turma.txt', mimeType: 'text/plain', buffer: Buffer.from('101;Ana de teste\n102;Bruno de teste') });
    await page.locator('#save-settings').click();
    await page.waitForFunction(() => app.review.candidate?.ready && app.review.candidate.grade === 5);
    await page.locator('#accept-exam').click();
    assert.match(await page.locator('#toast').textContent(), /Selecione o aluno/);
    await page.locator('#student-select').selectOption('101');
    assert.equal(await page.locator('#freeze-exam').count(),0);
    assert.equal(await page.locator('#exam-preview').isVisible(), true);
    await page.evaluate(() => drawSheet([3, 3, 3, 3]));
    await page.locator('#accept-exam').click();
    await page.waitForFunction(() => app.review.saved?.student?.id === '101');
    assert.equal(await page.evaluate(() => app.review.saved.grade), 5);
    await page.locator('#next-exam').click();
    assert.equal(await page.locator('#student-select').inputValue(), '102');
    await page.waitForTimeout(150); await page.locator('#camera-stage').click();
    // A storage failure must not clear the candidate or claim it was saved. Retrying uses
    // the retained image, even after the live picture changes.
    await page.waitForFunction(() => app.review.candidate?.ready && app.review.candidate.grade === 2.5);
    await page.evaluate(() => {
      window.originalSave = app.storage.saveAcceptedResult.bind(app.storage);
      app.storage.saveAcceptedResult = async () => { throw new DOMException('Sem espaço', 'QuotaExceededError'); };
    });
    await page.locator('#accept-exam').click();
    await page.waitForFunction(() => document.getElementById('scan-status').textContent.includes('Sem espaço'));
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 2);
    assert.equal(await page.evaluate(() => app.review.saved), null);
    assert.equal(await page.evaluate(() => app.review.pending.grade), 2.5);
    await page.evaluate(() => { app.storage.saveAcceptedResult = originalSave; drawSheet([0, 1, 2, 3]); });
    await page.locator('#accept-exam').click();
    await page.waitForFunction(() => app.review.saved?.student?.id === '102');
    assert.equal(await page.evaluate(() => app.review.saved.grade), 2.5);
    assert.equal(await page.evaluate(async () => (await app.storage.getHistory()).length), 3);
    // Validate the real IndexedDB transaction rollback, not just the UI's error branch.
    assert.equal(await page.evaluate(async () => {
      const nativeTransaction = app.storage.db.transaction.bind(app.storage.db);
      app.storage.db.transaction = (...args) => {
        const transaction = nativeTransaction(...args);
        queueMicrotask(() => transaction.abort()); return transaction;
      };
      try { await app.storage.saveAcceptedResult({ id: 'aborted', timestamp: new Date().toISOString() }, 'data:image/jpeg;base64,invalid'); }
      catch {} finally { app.storage.db.transaction = nativeTransaction; }
      return !(await app.storage.getHistory()).some(record => record.id === 'aborted') && !(await app.storage.getEvidence('aborted'));
    }), true);
    await page.locator('#download-current-evidence').click();
    assert.equal(await page.evaluate(()=>!!app.camera.isActive),false);
    assert.equal(await page.locator('#step1').isVisible(),true);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#history-list tbody tr').length === 3);
    assert.equal(await page.evaluate(() => app.config.get('students.mode')), 'list');
    await page.locator('#open-history').click();
    await page.locator('#history-list button').first().click();
    await page.waitForFunction(() => document.getElementById('evidence-image').complete && document.getElementById('evidence-image').naturalWidth > 0);
    await page.locator('#close-evidence').click(); await page.locator('#close-history').click();
    // Offline receipts and roster remain available after a reload.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true); await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#history-list tbody tr').length === 3);
    await page.locator('#open-history').click();
    await page.locator('#history-list button').first().click();
    await page.waitForFunction(() => document.getElementById('evidence-image').naturalWidth > 0);
    await page.locator('#close-evidence').click(); await page.locator('#close-history').click(); await context.setOffline(false);
    assert.deepEqual(errors, []);
    console.log('PASS: tap capture, grade and points, clean frozen preview, required identity, exact-frame evidence, double accept, camera stays open, next student, roster import, freeze, save failure/retry, atomic rollback, history/evidence reload and offline, image download.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
