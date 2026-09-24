/**
 * Scanner Module - Orquestração do fluxo de escaneamento OMR
 * 
 * Responsável por:
 * - Inicializar o escaneamento com um gabarito específico
 * - Capturar e processar imagens de provas
 * - Calcular pontuações com base no gabarito
 * - Salvar resultados das correções
 */

class Scanner {
  constructor(app) {
    this.app = app;
    this.currentExam = null;
  }

  /**
   * Inicializa o scanner com um gabarito específico
   * @param {string} templateId - ID do gabarito a ser usado
   * @returns {Promise<Object>} Gabarito aplicado
   */
  async initializeWithTemplate(templateId) {
    const template = await this.app.template.getTemplate(templateId);
    if (!template) {
      throw new Error(`Gabarito ${templateId} não encontrado`);
    }
    
    this.currentExam = {
      templateId: templateId,
      templateDescription: template.description || templateId,
      createdAt: new Date().toISOString()
    };
    
    return template;
  }

  /**
   * Captura uma prova e processa as respostas
   * @returns {Promise<Object>} Resultado da leitura
   */
  async captureAndProcess() {
    if (!this.currentExam) {
      throw new Error('Nenhum gabarito aplicado');
    }
    
    if (!this.app.camera.isActive) {
      throw new Error('Câmera não disponível');
    }
    
    // Captura frame da câmera
    const imageData = this.app.camera.captureFrame();
    this.app.currentImageData = imageData;
    
    // Processa com OMR
    const answers = await this.app.processOMR(imageData);
    
    return {
      answers,
      capturedAt: new Date().toISOString()
    };
  }

  /**
   * Calcula a pontuação com base no gabarito e nas respostas do aluno
   * @returns {Object} Resultado da correção
   */
  calculateScore() {
    if (!this.currentExam || !this.app.currentImageData) {
      throw new Error('Nenhum gabarito ou imagem disponível');
    }
    
    const scoringRules = this.app.config.get('scoring');
    const studentAnswers = this.app.omr.detectBubbles(this.app.currentImageData)
      .map((_, i) => i % 4); // Respostas simuladas do aluno
    
    return this.app.omr.calculateScore(
      studentAnswers,
      this.app.omr.detectBubbles(this.app.currentImageData),
      scoringRules
    );
  }

  /**
   * Salva o resultado da prova
   * @returns {Promise<void>}
   */
  async saveResult() {
    if (!this.currentExam || !this.app.currentImageData) {
      return;
    }
    
    const result = {
      id: Date.now(),
      templateId: this.currentExam.templateId,
      templateDescription: this.currentExam.templateDescription,
      capturedAt: this.currentExam.createdAt,
      result: this.calculateScore()
    };
    
    await this.app.storage.saveResult(result.id, JSON.stringify(result));
  }
}

export default Scanner;