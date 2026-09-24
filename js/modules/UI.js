/**
 * UI Module - Interface do usuário
 * 
 * Responsável por:
 * - Renderizar a interface do sistema
 * - Gerenciar eventos do usuário
 * - Exibir resultados e feedback
 */

export class UI {
  constructor(app, configModule) {
    this.app = app;
    this.config = configModule;
    this.selectedTemplateId = null;
    this.results = null;
  }

  /**
   * Renderiza a interface completa
   */
  render() {
    this._renderHeader();
    this._renderMain();
    this._bindEvents();
  }

  /**
   * Renderiza o cabeçalho
   */
  _renderHeader() {
    const header = document.getElementById('app-header');
    if (header) {
      header.innerHTML = `
        <div class="header-inner">
          <div class="logo">MarkScan</div>
          <div class="header-actions">
            <span class="status-badge">Offline Ready</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Renderiza o conteúdo principal
   */
  _renderMain() {
    const main = document.getElementById('app-main');
    if (!main) return;
    
    main.innerHTML = `
      <div class="workflow">
        <section class="step-card" id="step1">
          <h3>1. Selecionar Gabarito</h3>
          <p>Escolha o modelo de correção que será usado</p>
          <select id="template-select" class="select-field"></select>
          <button id="btn-apply-template" class="btn primary">Aplicar Gabarito</button>
        </section>
        
        <section class="step-card" id="step2">
          <h3>2. Configurar Pontuação</h3>
          <div class="score-grid">
            <div>
              <label for="score-correct">Acerto</label>
              <input type="number" id="score-correct" min="0" step="0.5">
            </div>
            <div>
              <label for="score-incorrect">Erro</label>
              <input type="number" id="score-incorrect" min="0" step="0.5">
            </div>
            <div>
              <label for="score-blank">Em Branco</label>
              <input type="number" id="score-blank" min="0" step="0.5">
            </div>
          </div>
          <button id="btn-save-score" class="btn secondary">Salvar Pontuação</button>
        </section>
        
        <section class="step-card" id="step3">
          <h3>3. Ler Prova</h3>
          <p>Leia a prova do aluno para correção automática</p>
          <button id="btn-scan" class="btn danger">Iniciar Leitura</button>
          <div id="scan-status" class="scan-status"></div>
          <div id="results-panel" class="results-panel"></div>
        </section>
      </div>
    `;
  }

  /**
   * Vincula os eventos da interface
   */
  _bindEvents() {
    document.getElementById('btn-apply-template').addEventListener('click', () => {
      this._applyTemplate();
    });
    
    document.getElementById('btn-save-score').addEventListener('click', () => {
      this._saveScoring();
    });
    
    document.getElementById('btn-scan').addEventListener('click', () => {
      this._startScan();
    });
    
    // Vincula inputs de pontuação
    const scoreInputs = ['score-correct', 'score-incorrect', 'score-blank'];
    scoreInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
          this._validateScoreInput(id);
        });
      }
    });
  }

  /**
   * Aplica o gabarito selecionado
   */
  async _applyTemplate() {
    const select = document.getElementById('template-select');
    const templateId = select.value;
    if (!templateId) {
      this._showMessage('Selecione um gabarito primeiro', 'error');
      return;
    }
    
    try {
      await this.app.scanner.initializeWithTemplate(templateId);
      this._showMessage('Gabarito aplicado com sucesso', 'success');
      this._renderResultsPreview();
    } catch (error) {
      this._showMessage(`Erro ao aplicar gabarito: ${error.message}`, 'error');
    }
  }

  /**
   * Salva as regras de pontuação
   */
  _saveScoring() {
    const rules = {
      correct: parseFloat(document.getElementById('score-correct').value) || 0,
      incorrect: parseFloat(document.getElementById('score-incorrect').value) || 0,
      blank: parseFloat(document.getElementById('score-blank').value) || 0
    };
    
    this.config.setScoringRules(rules);
    this._showMessage('Regras de pontuação salvas', 'success');
  }

  /**
   * Valida o valor de cada input de pontuação
   * @param {string} id - ID do input
   */
  _validateScoreInput(id) {
    const input = document.getElementById(id);
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
      input.value = '0';
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
  }

  /**
   * Inicia o processo de leitura da prova
   */
  async _startScan() {
    if (!this.app.scanner.currentExam) {
      this._showMessage('Nenhum gabarito aplicado', 'error');
      return;
    }
    
    const status = document.getElementById('scan-status');
    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.innerHTML = '';
    status.innerHTML = '<div class="scan-spinner"></div><p>Processando imagem...</p>';
    
    try {
      const { answers } = await this.app.scanner.captureAndProcess();
      const score = this.app.scanner.calculateScore();
      this.app.scanner.saveResult();
      
      this._renderResults(score, answers);
      status.innerHTML = '<p class="scan-complete">Leitura concluída com sucesso!</p>';
    } catch (error) {
      status.innerHTML = `<p class="scan-error">Erro na leitura: ${error.message}</p>`;
    }
  }

  /**
   * Renderiza os resultados da correção
   * @param {Object} score - Resultado da pontuação
   * @param {Array} answers - Respostas detectadas
   */
  _renderResults(score, answers) {
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    
    const correct = score.details.filter(d => d.status === 'correct').length;
    const incorrect = score.details.filter(d => d.status === 'incorrect').length;
    const blank = score.details.filter(d => d.status === 'blank').length;
    
    panel.innerHTML = `
      <div class="score-summary">
        <div class="score-circle">
          <span class="score-number">${score.percentage}</span>
          <span class="score-percent">%</span>
        </div>
        <div class="score-breakdown">
          <div><span class="dot correct"></span>Acertos: ${correct}</div>
          <div><span class="dot incorrect"></span>Erros: ${incorrect}</div>
          <div><span class="dot blank"></span>Em Branco: ${blank}</div>
          <div>Nota: ${score.score} / ${score.total}</div>
        </div>
      </div>
      <div class="answer-details">
        ${score.details.map(d => `
          <div class="answer-row ${d.status}">
            <span class="q-num">Q${d.question}</span>
            <span class="student-ans">${d.studentAnswer || '-'}</span>
            <span class="correct-ans">${d.correctAnswer || '-'}</span>
            <span class="points">${d.points}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Renderiza preview do gabarito aplicado
   */
  _renderResultsPreview() {
    const preview = document.getElementById('preview-panel');
    if (!preview) return;
    
    preview.innerHTML = '<p>Gabarito aplicado. Pronto para ler provas.</p>';
  }

  /**
   * Exibe mensagem de feedback
   * @param {string} message - Mensagem a exibir
   * @param {string} type - Tipo da mensagem (success, error, info)
   */
  _showMessage(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

export default UI;