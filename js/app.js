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
import ExamReview from './modules/ExamReview.js';
import Alignment from './modules/Alignment.js';
import SheetBuilder from './modules/SheetBuilder.js';

class App {
  constructor() {
    this.storage = new Storage();
    this.config = new Config(this.storage);
    this.template = new Template(this.storage);
    this.omr = new OMR();
    this.camera = new Camera();
    this.scanner = new Scanner(this);
    this.ui = new UI(this, this.config);
    this.review = new ExamReview(this, this.ui);
    this.alignment = new Alignment();
    this.sheetBuilder = new SheetBuilder(this, this.ui);
    
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
      // A câmera é aberta pelo usuário, sem bloquear uploads.
      
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
   * Registra o service worker para PWA
   */
  async _registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
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
    
    if (!this.currentTemplate.imageSize && this.currentTemplate.url) {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Imagem do gabarito inválida')); image.src = this.currentTemplate.url; });
      this.currentTemplate.imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    }
    this.currentImageData = null;
    this.studentAnswers = null;
    // Salva último template usado
    this.config.update({ exam: { lastTemplate: templateId } });
    
    return this.currentTemplate;
  }

  /**
   * Captura imagem da câmera e processa
   * @returns {Promise<Object>} Resultado do processamento
   */
  async captureAndProcess() {
    return this.scanner.captureAndProcess();
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
    
    const template = this.currentTemplate;
    if (!template.layout || !Array.isArray(template.answers)) {
      throw new Error('Este gabarito antigo não possui calibração. Cadastre novamente.');
    }
    this.omr.options.optionsPerQuestion = template.layout.cols;
    const region = template.region || { shape: 'circle', width: template.radius * 2, height: template.radius * 2 * imageData.width / imageData.height };
    Object.assign(this.omr.options, { sampleShape: region.shape, sampleWidth: region.width * imageData.width,
      sampleHeight: region.height * imageData.height, threshold: template.threshold ?? 128 });
    const positions = this.omr.detectBubbles(imageData, template.layout);
    return this.omr.processOMR(imageData, positions, template.layout.rows);
  }

  calculateScore() {
    if (!this.currentTemplate || !this.studentAnswers) throw new Error('Leia uma prova primeiro');
    return this.omr.calculateScore(this.studentAnswers, this.currentTemplate.answers, this.config.get('scoring'));
  }


}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app; // Para debug
  app.init();
});

export default App;