/**
 * Application Main - Ponto de entrada do MarkScan
 * 
 * Inicializa e integra todos os módulos:
 * - Camera: Para captura de imagens
 * - Template: Para gerenciamento de gabaritos
 * - OMR: Para processamento de marcações
 * - Storage: Para persistência de dados
 * - Config: Para regras e preferências
 * - UI: Para interface do usuário
 * - Scanner: Para orquestração do fluxo de escaneamento
 */

import Camera from './modules/Camera.js';
import Template from './modules/Template.js';
import OMR from './modules/OMREngine.js';
import Storage from './modules/Storage.js';
import Config from './modules/Config.js';
import UI from './modules/UI.js';
import Scanner from './modules/Scanner.js';

class App {
  constructor() {
    this.storage = new Storage();
    this.config = new Config(this.storage);
    this.template = new Template(this.storage);
    this.omr = new OMR();
    this.camera = new Camera();
    this.scanner = new Scanner(this);
    this.ui = new UI(this, this.config);
    
    this.currentTemplate = null;
    this.examInProgress = false;
    this.currentImageData = null;
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    try {
      // Renderiza a UI
      this.ui.render();
      
      // Carrega templates salvos
      await this._loadTemplates();
      
      // Configura a câmera
      await this._setupCamera();
      
      // Atualiza interface com estado salvo
      this._restoreState();
      
      // Inicializa service worker para PWA
      await this._registerServiceWorker();
      
      console.log('MarkScan inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar aplicação:', error);
      this.ui._showMessage('Erro ao inicializar aplicação', 'error');
    }
  }

  /**
   * Carrega os templates salvos
   */
  async _loadTemplates() {
    try {
      const templates = await this.template.getAllTemplates();
      const select = document.getElementById('template-select');
      if (select) {
        select.innerHTML = '<option value="">-- Selecione um gabarito --</option>';
        templates.forEach(t => {
          const option = document.createElement('option');
          option.value = t.id;
          option.textContent = t.description || t.id;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }

  /**
   * Configura a câmera
   */
  async _setupCamera() {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = 'none';
    
    document.body.appendChild(video);
    
    try {
      await this.camera.initialize(video);
    } catch (error) {
      console.error('Erro ao configurar câmera:', error);
      // Não é crítico - o usuário pode fazer upload de arquivos
    }
  }

  /**
   * Registra o service worker para PWA
   */
  async _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registrado:', registration.scope);
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    }
  }

  /**
   * Restaura o estado salvo
   */
  _restoreState() {
    // Carrega regras de pontuação salvas
    const scoringRules = this.config.get('scoring');
    if (scoringRules) {
      document.getElementById('score-correct').value = scoringRules.correct;
      document.getElementById('score-incorrect').value = scoringRules.incorrect;
      document.getElementById('score-blank').value = scoringRules.blank;
    }
    
    // Carrega último template usado
    const lastTemplate = this.config.get('exam.lastTemplate');
    if (lastTemplate) {
      const select = document.getElementById('template-select');
      if (select) {
        select.value = lastTemplate;
      }
    }
  }

  /**
   * Inicializa o escaneamento com um template específico
   * @param {string} templateId - ID do template a ser usado
   */
  async initializeWithTemplate(templateId) {
    this.currentTemplate = await this.template.getTemplate(templateId);
    if (!this.currentTemplate) {
      throw new Error('Template não encontrado');
    }
    
    // Salva último template usado
    this.config.update({ exam: { lastTemplate: templateId } });
    
    return this.currentTemplate;
  }

  /**
   * Captura imagem da câmera e processa
   * @returns {Promise<Object>} Resultado do processamento
   */
  async captureAndProcess() {
    if (!this.camera.isActive) {
      throw new Error('Câmera não disponível');
    }
    
    // Captura frame da câmera
    const imageData = this.camera.captureFrame();
    this.currentImageData = imageData;
    
    // Processa com OMR
    const answers = await this.processOMR(imageData);
    return { answers };
  }

  /**
   * Processa imagem com OMR engine
   * @param {ImageData} imageData - Dados da imagem a processar
   * @returns {Array} Respostas detectadas
   */
  async processOMR(imageData) {
    if (!this.currentTemplate) {
      throw new Error('Nenhum template aplicado');
    }
    
    // Em uma implementação real, o template conteria as posições das bolhas
    // Por enquanto, usamos detecção automática
    const bubblePositions = this.omr.detectBubbles(imageData);
    const questionCount = this.config.get('exam.questionsCount') || 10;
    
    return this.omr.processOMR(imageData, bubblePositions, questionCount);
  }

  /**
   * Calcula a pontuação com base nas respostas detectadas
   * @returns {Object} Resultado da correção
   */
  calculateScore() {
    if (!this.currentTemplate || !this.currentImageData) {
      throw new Error('Dados insuficientes para correção');
    }
    
    // Obtém as respostas detectadas
    const bubblePositions = this.omr.detectBubbles(this.currentImageData);
    const questionCount = this.config.get('exam.questionsCount') || 10;
    const studentAnswers = this.omr.processOMR(this.currentImageData, bubblePositions, questionCount);
    
    // Usa o gabarito como respostas corretas
    const templateAnswers = this._extractTemplateAnswers();
    
    // Calcula pontuação
    const scoringRules = this.config.get('scoring');
    return this.omr.calculateScore(studentAnswers, templateAnswers, scoringRules);
  }

  /**
   * Extrai as respostas corretas do template
   * Em uma implementação real, isso viria do template salvo
   * @returns {Array} Respostas corretas do gabarito
   */
  _extractTemplateAnswers() {
    // Por enquanto, retorna respostas de exemplo
    // Em uma implementação real, o template seria analisado para obter o gabarito
    // Este método seria chamado após análise do próprio gabarito
    return [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]; // A, B, C, D, A, B, C, D, A, B
  }

  /**
   * Salva o resultado da correção
   */
  saveResult() {
    if (!this.currentTemplate || !this.currentImageData) return;
    
    const result = {
      templateId: this.currentTemplate.id,
      templateDescription: this.currentTemplate.description,
      timestamp: new Date().toISOString(),
      score: this.calculateScore()
    };
    
    // Salva no histórico
    this.storage.addToHistory(result);
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app; // Para debug
  app.init();
});

export default App;