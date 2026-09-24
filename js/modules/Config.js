/**
 * Config Module - Gerenciamento de configurações do sistema
 * 
 * Permite:
 * - Definir regras de pontuação
 * - Configurar parâmetros de detecção de bolhas
 * - Salvar/recuperar preferências do usuário
 */

export class Config {
  constructor(storageModule) {
    this.storage = storageModule;
    this.defaults = {
      scoring: {
        correct: 1,    // Pontos por acerto
        incorrect: 0,  // Pontos por erro
        blank: 0       // Pontos por em branco
      },
      omr: {
        threshold: 128,        // Limiar de binarização
        minBubbleSize: 10,     // Tamanho mínimo da bolha
        maxBubbleSize: 40,     // Tamanho máximo da bolha
        bubbleSpacing: 45,     // Espaçamento entre opções
        optionsPerQuestion: 4  // Opções por questão
      },
      exam: {
        questionsCount: 10,    // Número de questões
        showFeedback: true     // Exibir feedback detalhado
      },
      students: { mode: 'name', rosterText: '' },
      review: { gradeScale: 10 },
      calibration: { rows: 10, cols: 4, shape: 'circle', width: 10, height: 10, threshold: 128 },
      annotation: { color: '#e6007e', textColor: '#ffffff', background: '#65104a', fontSize: 16,
        font: 'Arial', fontStyle: 'bold', lineStyle: 'solid', lineWidth: 2, zoom: 100 },
      ui: {
        theme: 'light',        // Tema visual
        language: 'pt-BR'      // Idioma
      }
    };
    this.config = this._loadConfig();
  }

  /**
   * Carrega configurações salvas ou usa padrões
   * @returns {Object} Configurações carregadas
   */
  _loadConfig() {
    try {
      const saved = localStorage.getItem('omr-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.fromEntries(Object.entries(this.defaults).map(([key, value]) =>
          [key, { ...value, ...(parsed[key] || {}) }]));
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
    return JSON.parse(JSON.stringify(this.defaults));
  }

  /**
   * Salva configurações no storage
   * @returns {void}
   */
  _saveConfig() {
    try {
      localStorage.setItem('omr-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  }

  /**
   * Atualiza configurações parcialmente
   * @param {Object} updates - Atualizações a aplicar
   */
  update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.config[key] = value && typeof value === 'object'
        ? { ...this.config[key], ...value } : value;
    }
    this._saveConfig();
  }

  /**
   * Define regras de pontuação
   * @param {Object} rules - Regras de pontuação
   */
  setScoringRules(rules) {
    this.config.scoring = { ...this.config.scoring, ...rules };
    this._saveConfig();
  }

  /**
   * Define configurações do OMR
   * @param {Object} settings - Configurações do OMR
   */
  setOMRSettings(settings) {
    this.config.omr = { ...this.config.omr, ...settings };
    this._saveConfig();
  }

  /**
   * Define configurações da prova
   * @param {Object} settings - Configurações da prova
   */
  setExamSettings(settings) {
    this.config.exam = { ...this.config.exam, ...settings };
    this._saveConfig();
  }

  /**
   * Obtém uma configuração específica
   * @param {string} key - Chave da configuração (ponto para aninhados)
   * @returns {*} Valor da configuração
   */
  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Reseta configurações para os valores padrão
   */
  reset() {
    this.config = JSON.parse(JSON.stringify(this.defaults));
    this._saveConfig();
  }

  /**
   * Obtém as configurações atuais
   * @returns {Object} Configurações atuais
   */
  getAll() {
    return { ...this.config };
  }
}

export default Config;