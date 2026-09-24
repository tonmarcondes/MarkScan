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
    const aligned = this.app.currentTemplate.alignment ? this.app.alignment.align(image, this.app.currentTemplate.alignment) : null;
    const normalized = aligned ? aligned.image : image;
    this.app.currentImageData = normalized;
    this.app.studentAnswers = await this.app.processOMR(normalized);
    return { answers: this.app.studentAnswers, image: normalized, alignment: aligned?.metadata || null };
  }
  calculateScore() { return this.app.calculateScore(); }
}
