export default class Scanner {
  constructor(app) { this.app = app; this.currentExam = null; }
  async initializeWithTemplate(id) {
    const template = await this.app.initializeWithTemplate(id);
    this.currentExam = { templateId: id, templateDescription: template.description };
    return template;
  }
  async captureAndProcess() {
    if (!this.app.camera.isActive) throw new Error('Abra a câmera primeiro');
    return this.processImage(this.app.camera.captureFrame());
  }
  async processImage(image) {
    if (!this.currentExam) throw new Error('Aplique um gabarito primeiro');
    this.app.currentImageData = image;
    this.app.studentAnswers = await this.app.processOMR(image);
    return { answers: this.app.studentAnswers };
  }
  calculateScore() { return this.app.calculateScore(); }
}
