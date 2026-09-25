exports.models = async page => {
 if(await page.locator('#print-sheet-dialog').isVisible())await page.locator('#close-print-sheet').click();
 if(await page.locator('#step3').isVisible())await page.locator('#back-models').click();
};
exports.capture = async page => {
 if(await page.locator('#print-sheet-dialog').isVisible())await page.locator('#approve-sheet').click();
 else if(await page.locator('#step1').isVisible()){
  await page.locator('#approve-model').click();await page.locator('#print-sheet-dialog').waitFor({state:'visible'});await page.locator('#approve-sheet').click();
 }else if(await page.locator('#next-exam').isVisible())await page.locator('#next-exam').click();
 else if(await page.locator('#retake-exam').isVisible())await page.locator('#retake-exam').click();
};
exports.approveImage = async page => {await page.locator('#approve-import').click();await page.locator('#import-dialog').waitFor({state:'hidden'});};
exports.saveModel = async page => {
 if(await page.locator('#approve-mapping').isVisible())await page.locator('#approve-mapping').click();
 await page.locator('#save-template').click();await page.locator('#print-sheet-dialog').waitFor({state:'visible'});
};
