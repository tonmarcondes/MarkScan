import { solidDefinition } from './SolidReferences.js';
import { VERSION } from '../version.js';
import { parseRoster } from './Roster.js';

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
          <div class="logo">MarkScan <small class="app-version">v${VERSION}</small></div>
          <div class="header-actions">
            <button id="open-history" class="btn secondary" aria-haspopup="dialog">Histórico</button><span class="status-badge">Processamento local</span><button id="open-help" class="btn settings-button" aria-label="Ajuda e manual prático" title="Manual prático" aria-haspopup="dialog">?</button>
            <button id="open-settings" class="btn settings-button" aria-label="Configurações" title="Configurações" aria-haspopup="dialog"><span aria-hidden="true" class="gear-symbol">⚙</span></button>
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
      <nav class="workflow-progress" aria-label="Etapas"><span id="workflow-label">1. Preparar modelo</span></nav><div class="workflow">
        <section class="step-card" id="step1">
          <h3>1. Cadastrar e selecionar gabarito</h3>
          <div class="model-selection"><div class="review-actions"><button id="new-sheet" class="btn primary">Criar folha com referências</button><button id="show-sheets" class="btn secondary">Imprimir / baixar folhas</button></div>
          <p>Novas folhas com quatro referências são alinhadas automaticamente. Modelos antigos sem referências continuam disponíveis com calibração manual.</p>
          <label>Selecionar imagem ou PDF do gabarito <input id="template-file" type="file" accept="image/*,.pdf,application/pdf"></label>
          <button id="template-camera" class="btn secondary">Fotografar gabarito</button>
          </div><div id="template-editor" hidden><button id="cancel-editor" class="btn secondary">Voltar aos modelos</button>
            <label>Nome <input id="template-name" type="text" maxlength="100"></label>
            <p id="calibration-summary"></p>
            <div class="calibration-guide" aria-live="polite">
              <strong id="calibration-instruction"></strong>
              <p>O primeiro clique aparece imediatamente. Os números identificam as áreas de leitura e não alteram a imagem original.</p>
            </div>
            <div class="calibration-actions">
              <button id="move-first" class="btn secondary">Reposicionar primeira</button>
              <button id="move-last" class="btn secondary">Reposicionar última</button>
              <button id="undo-position" class="btn secondary">Desfazer</button>
              <button id="reset-grid" class="btn secondary">Refazer grade</button>
            </div>
            <div class="canvas-viewport"><canvas id="template-preview" tabindex="0" aria-label="Imagem do gabarito: clique para posicionar as áreas de leitura"></canvas></div>
            <p>Para corrigir uma área, clique no seu número na imagem ou na lista abaixo, depois clique no novo centro. Use as setas do teclado para ajustes finos (Shift: 10 pixels); Esc cancela a seleção.</p>
            <div id="position-list" class="position-list" aria-label="Áreas de leitura"></div>
            <p id="template-answers" role="status"></p>
            <label class="roster-label">Respostas corretas (opcional se já preenchidas na imagem)<input id="import-answers" placeholder="A B C D…"></label>
            <p>Você pode importar uma folha em branco e informar as respostas acima, ou usar as respostas detectadas em uma imagem preenchida. As versões para compartilhar serão recriadas apenas com as respostas mapeadas; os enunciados da imagem original não serão incluídos.</p>
            <button id="approve-mapping" class="btn primary">Aprovar mapeamento e continuar</button><div id="reference-step" hidden><button id="back-mapping" class="btn secondary">Voltar ao mapeamento</button><div class="review-actions"><button id="place-references" class="btn secondary">Posicionar referências</button><button id="clear-references" class="btn secondary">Remover referências</button></div>
            <p id="reference-instruction" role="status"></p>
            <button id="save-template" class="btn primary">Aprovar e salvar modelo</button></div>
          </div>
          <div class="model-selection"><p>Escolha o modelo de correção que será usado</p>
          <select id="template-select" class="select-field"></select>
          <p id="active-template" role="status">Selecione um modelo para começar.</p>
          <button id="edit-template" class="btn secondary">✎ Editar modelo</button><button id="delete-template" class="btn secondary">Excluir modelo</button><button id="approve-model" class="btn primary" disabled>Conferir modelo e continuar</button></div>
        </section>
        
        <section class="step-card" id="step3" hidden><button id="back-models" class="btn secondary">Voltar ao modelo</button><div id="exam-inputs">
          <h3>2. Ler Prova</h3>
          <p>Leia a prova do aluno para correção automática</p>
          <p>Folhas com referências: inclua os quatro cantos na câmera. O app corrige posição, rotação e perspectiva. Modelos antigos exigem o mesmo enquadramento do gabarito.</p>
          <label>Selecionar imagem ou PDF da prova <input id="exam-file" type="file" accept="image/*,.pdf,application/pdf"></label>
          <button id="exam-camera" class="btn secondary">Abrir câmera para prova</button>
          </div>${this.app.review.markup()}
        </section>
      </div>
      <dialog id="history-dialog"><div class="settings-heading"><h2>Correções aceitas</h2><button id="close-history" class="btn secondary" aria-label="Fechar histórico">✕</button></div><div id="history-content"></div></dialog>${this.app.documentImport.markup()}${this._settingsMarkup()}
      <dialog id="help-dialog" aria-labelledby="help-title"><div class="settings-heading"><h2 id="help-title">Manual prático · v${VERSION}</h2><button id="close-help" class="btn secondary" aria-label="Fechar ajuda">✕</button></div>
      <h3>1. Prepare o modelo</h3><p>Abra ⚙ para definir questões, alternativas, formato, pontuação e alunos. Os ajustes válidos são salvos automaticamente neste navegador.</p>
      <p><strong>Folha nova:</strong> use Criar folha com referências, informe o nome e as respostas. Baixe ou imprima a folha do aluno em branco e guarde o gabarito preenchido separado.</p>
      <p><strong>Sua própria imagem:</strong> carregue uma foto ou imagem. Marque o centro da primeira alternativa da primeira questão e da última alternativa da última questão. Confira a grade; clique nos números para corrigir cada posição.</p>
      <p>Use Posicionar referências e clique nos quatro cantos, em ordem: superior esquerdo, superior direito, inferior direito e inferior esquerdo. Escolha espaços brancos, longe das respostas. Aprove o mapeamento, posicione os blocos, salve e confira as versões preenchida e em branco antes de seguir para a correção. As cópias dos alunos precisam ter esses mesmos blocos nas mesmas posições.</p>
      <h3>2. Selecione e corrija</h3><p>Selecionar um modelo já o ativa. Use Editar modelo para ajustar ou Excluir modelo para removê-lo; o histórico permanece.</p>
      <p>Abra a câmera, mostre todas as referências e toque na imagem para fotografar. A fotografia será alinhada e exibida sem números de calibração. Confira a nota e o aluno e toque em Aceitar e salvar evidência; depois, Próxima prova. Você também pode carregar uma foto da prova.</p>
      <h3>3. Confira e guarde</h3><p>Toque na câmera para fotografar. Confira a imagem corrigida, sem números sobrepostos, antes de aceitar. No histórico, Ver imagem e Baixar imagem mostram a evidência. A nota só é registrada ao aceitar.</p>
      <h3>Se a leitura falhar</h3><p>Aproxime a câmera, melhore a luz, alise o papel e mantenha os quatro blocos visíveis. Marcas pequenas precisam estar nítidas. Os blocos sólidos indicam orientação, mas não identificam o modelo: confira o modelo selecionado. Modelos antigos codificados continuam funcionando.</p>
      <p>Dados e configurações ficam neste navegador. Limpar os dados do site os remove. PDFs podem ser importados: escolha a página, recorte se necessário e aprove a imagem. Mudanças de geometria exigem novas cópias impressas.</p></dialog>
      <dialog id="delete-dialog" aria-labelledby="delete-title"><h2 id="delete-title">Excluir modelo?</h2><p id="delete-name"></p><p>As notas e evidências já salvas serão mantidas.</p><button id="confirm-delete" class="btn danger">Excluir modelo</button><button id="cancel-delete" class="btn secondary">Cancelar</button></dialog>
      ${this.app.sheetBuilder.markup()}
    `;
  }

  /**
   * Vincula os eventos da interface
   */
  _bindEvents() {
    document.getElementById('app-main').appendChild(document.getElementById('evidence-dialog'));
    document.getElementById('history-content').appendChild(document.querySelector('.history-section'));
    document.querySelector('.history-section').open=true;
    document.getElementById('open-history').onclick=()=>document.getElementById('history-dialog').showModal();
    document.getElementById('close-history').onclick=()=>document.getElementById('history-dialog').close();
    document.getElementById('template-select').addEventListener('change', () => {
      this._applyTemplate();
    });
    
    document.getElementById('open-settings').addEventListener('click', () => {
      this._fillSettings();
      document.getElementById('settings-dialog').showModal();
    });
    document.getElementById('settings-dialog').addEventListener('cancel', () => { try { this._saveSettings(true); } catch (error) { this._showMessage(error.message, 'error'); } });
    document.getElementById('settings-form').addEventListener('change', () => { try { this._saveSettings(true); } catch (error) { document.getElementById('settings-error').textContent = error.message; } });
    document.getElementById('close-settings').addEventListener('click', () => document.getElementById('settings-dialog').close());
    document.getElementById('settings-form').addEventListener('submit', event => {
      event.preventDefault(); try { this._saveSettings(); } catch (error) { document.getElementById('settings-error').textContent=error.message; }
    });
    document.getElementById('mark-shape').addEventListener('change', () => {
      document.getElementById('mark-height').disabled = document.getElementById('mark-shape').value !== 'rectangle';
    });
    document.getElementById('edit-template').addEventListener('click', () => this._editSavedTemplate());
    
    document.getElementById('camera-stage').addEventListener('click', () => this._startScan());
    document.getElementById('camera-stage').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._startScan(); } });
    
    for (const kind of ['template', 'exam']) {
      document.getElementById(`${kind}-file`).addEventListener('change', async event => {
        const file = event.target.files[0];
        if (!file) return;
        try {
          this._closeCamera();
          const image = await this.app.documentImport.open(file);
          if (!image) return;
          if (kind === 'template') this._editTemplate(image);
          else await this._startScan(image);
        } catch (error) { this._showMessage(error.message, 'error'); }
        finally { event.target.value = ''; }
      });
      document.getElementById(`${kind}-camera`).addEventListener('click', () => this._openCamera(kind));
    }
    document.getElementById('stop-camera').addEventListener('click', () => this._closeCamera());
    document.getElementById('save-template').addEventListener('click', () => this._saveTemplate());
    document.getElementById('template-preview').addEventListener('click', event => this._positionClick(event));
    document.getElementById('template-preview').addEventListener('keydown', event => this._positionKey(event));
    document.getElementById('move-first').addEventListener('click', () => { this.moveTarget = 'first'; this._drawTemplate(); });
    document.getElementById('move-last').addEventListener('click', () => { this.moveTarget = 'last'; this._drawTemplate(); });
    document.getElementById('reset-grid').addEventListener('click', () => {
      this._rememberPositions(); this.corners = []; this.positions = null; this.moveTarget = null; this._drawTemplate();
    });
    document.getElementById('undo-position').addEventListener('click', () => {
      const state = this.positionHistory.pop();
      if (state) { Object.assign(this, state); this.moveTarget = null; this._drawTemplate(); }
    });
    window.addEventListener('resize', () => { this._drawTemplate(); this._redrawExam(); this.app.review.drawGuide(); });
    window.addEventListener('pagehide', () => this._closeCamera());
    document.getElementById('roster-file').addEventListener('change', async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error('Use uma lista de texto menor que 1 MB');
        const text = await file.text(); parseRoster(text);
        document.getElementById('roster-text').value = text;
        document.getElementById('student-mode').value = 'list';
        this._saveSettings(true);
      } catch (error) { document.getElementById('settings-error').textContent = error.message; }
      event.target.value = '';
    });
    document.getElementById('open-help').onclick = () => document.getElementById('help-dialog').showModal();
    document.getElementById('close-help').onclick = () => document.getElementById('help-dialog').close();
    document.getElementById('delete-template').onclick = () => {
      const select = document.getElementById('template-select');
      if (!select.value) return this._showMessage('Selecione um modelo para excluir', 'info');
      document.getElementById('delete-name').textContent = select.selectedOptions[0].textContent;
      document.getElementById('delete-dialog').showModal();
    };
    document.getElementById('cancel-delete').onclick = () => document.getElementById('delete-dialog').close();
    document.getElementById('confirm-delete').onclick = async () => {
      const button=document.getElementById('confirm-delete'); if(button.disabled) return; button.disabled=true;
      try {
        await this.app.template.removeTemplate(document.getElementById('template-select').value);
        this._closeCamera(); this.app.review.invalidate(); this.app.currentTemplate = null;
        this.app.scanner.currentExam = null;
        this.editingTemplateId = null; this.templateImage = null;
        document.getElementById('template-editor').hidden = true;
        await this.app._loadTemplates(); await this._applyTemplate();
        document.getElementById('delete-dialog').close();
        this._showMessage('Modelo excluído. As correções e evidências foram preservadas.', 'success');
      } catch (error) { this._showMessage(error.message, 'error'); } finally { button.disabled=false; }
    };
    document.getElementById('import-answers').oninput = () => this._drawTemplate();
    document.getElementById('place-references').onclick = () => {
      if (!this.templateImage) return;
      this.referencePoints = []; this.placingReferences = true; this._drawTemplate();
    };
    document.getElementById('clear-references').onclick = () => {
      this.referencePoints = []; this.placingReferences = false; this._drawTemplate();
    };
    document.getElementById('approve-model').onclick = () => this.app.sheetBuilder.show();
    document.getElementById('back-models').onclick = () => { this._closeCamera(); this.app.review.invalidate(); this.setPhase('model'); };
    document.getElementById('cancel-editor').onclick = () => { this.templateImage=null; this.setPhase('model'); };
    document.getElementById('approve-mapping').onclick = () => { if(this.templateAnalysis) { this.mappingApproved=true;this.moveTarget=null;this._mappingStage();this._drawTemplate(); } };
    document.getElementById('back-mapping').onclick=()=>{this.mappingApproved=false;this.placingReferences=false;this._mappingStage();this._drawTemplate();};
    this.app.documentImport.bind();
    this.app.review.bind();
    this.app.sheetBuilder.bind();
  }

  _mappingStage() {
    const approved=!!this.mappingApproved;
    document.getElementById('reference-step').hidden=!approved;document.getElementById('approve-mapping').hidden=approved;
    for(const selector of ['.calibration-guide','.calibration-actions','#position-list','#template-answers'])document.querySelector(selector).hidden=approved;
    document.getElementById('import-answers').closest('label').hidden=approved;
  }

  setPhase(phase) {
    this.phase=phase;
    document.getElementById('step1').hidden=!['model','edit'].includes(phase);
    document.getElementById('step3').hidden=!['capture','review','saved'].includes(phase);
    document.getElementById('template-editor').hidden=phase!=='edit';
    document.querySelectorAll('.model-selection').forEach(el=>el.hidden=phase==='edit');
    document.getElementById('exam-inputs').hidden=phase!=='capture';
    document.getElementById('workflow-label').textContent=({model:'1. Preparar e aprovar modelo',edit:'1. Mapear respostas e referências',capture:'2. Fotografar ou importar prova',review:'3. Conferir e aprovar correção',saved:'4. Nota e evidência salvas'})[phase];
  }

  _settingsMarkup() {
    return `<dialog id="settings-dialog" aria-labelledby="settings-title">
      <form id="settings-form">
        <div class="settings-heading"><h2 id="settings-title">Configurações</h2><button type="button" id="close-settings" class="btn secondary" aria-label="Fechar configurações">✕</button></div>
        <p>Os ajustes válidos são salvos automaticamente ao alterar os campos. Os ajustes de leitura valem para o gabarito em edição. Gabaritos salvos mantêm sua calibração até você editá-los e salvar.</p>
        <fieldset><legend>Grade e área de leitura</legend><div class="settings-grid">
          <label>Questões<input id="template-rows" type="number" min="1" max="100" step="1" required></label>
          <label>Alternativas<input id="template-cols" type="number" min="2" max="8" step="1" required></label>
          <label>Formato<select id="mark-shape"><option value="circle">Bolha (círculo)</option><option value="square">Quadrado</option><option value="rectangle">Retângulo</option></select></label>
          <label>Diâmetro / largura (pixels)<input id="mark-width" type="number" min="2" max="200" step="1" required></label>
          <label>Altura do retângulo (pixels)<input id="mark-height" type="number" min="2" max="200" step="1" required></label>
          <label>Limiar de leitura (0–255)<input id="mark-threshold" type="number" min="0" max="255" step="1" required></label>
        </div><p>A área deve ficar dentro da marca impressa. Alterar a quantidade de questões ou alternativas refaz a grade e remove ajustes individuais.</p></fieldset>
        <fieldset><legend>Referências impressas</legend><div class="settings-grid"><label>Espessura dos blocos (pixels na imagem)<select id="reference-thickness"><option value="5">5 px (mínimo)</option><option value="8">8 px (recomendado)</option><option value="10">10 px</option></select></label></div><p>Quatro blocos sólidos com comprimentos diferentes indicam a orientação. Use espaços brancos ao redor e teste a impressão; use pelo menos 5 px; 8 px facilita a captura.</p></fieldset>
        <fieldset><legend>Números e contornos sobre a imagem</legend><div class="settings-grid">
          <label>Cor do contorno<input id="annotation-color" type="color"></label>
          <label>Cor dos números<input id="annotation-textColor" type="color"></label>
          <label>Fundo dos números<input id="annotation-background" type="color"></label>
          <label>Tamanho dos números (px na tela)<input id="annotation-fontSize" type="number" min="10" max="48" step="1" required></label>
          <label>Fonte<select id="annotation-font"><option value="Arial">Arial</option><option value="Verdana">Verdana</option><option value="Georgia">Georgia</option><option value="monospace">Monoespaçada</option></select></label>
          <label>Tipo de texto<select id="annotation-fontStyle"><option value="bold">Negrito</option><option value="normal">Normal</option><option value="italic">Itálico</option><option value="italic bold">Negrito e itálico</option></select></label>
          <label>Tipo de contorno<select id="annotation-lineStyle"><option value="solid">Contínuo</option><option value="dashed">Tracejado</option></select></label>
          <label>Espessura do contorno (px)<input id="annotation-lineWidth" type="number" min="1" max="6" step="1" required></label>
          <label>Ampliação da imagem<select id="annotation-zoom"><option value="100">Ajustar à largura</option><option value="150">150%</option><option value="200">200%</option><option value="300">300%</option></select></label>
        </div><p>Os números têm fundo sólido para contrastar com a impressão. A ampliação permite posicionar áreas pequenas com mais precisão.</p></fieldset>
        <fieldset><legend>Alunos e confirmação da nota</legend><div class="settings-grid">
          <label>Identificação do aluno<select id="student-mode"><option value="none">Sem identificação</option><option value="name">Digitar nome</option><option value="list">Selecionar de uma lista</option></select></label>
          <label>Nota máxima<input id="grade-scale" type="number" min="1" max="100" step="1" required></label>
        </div>
        <label class="roster-label">Lista de alunos (um por linha)<textarea id="roster-text" rows="6" placeholder="Ana Silva&#10;2026002;Bruno Souza"></textarea></label>
        <label>Carregar lista de texto (.txt)<input id="roster-file" type="file" accept=".txt,text/plain"></label>
        <p>Use um nome por linha, ou matrícula;nome. Para alunos com o mesmo nome, informe matrículas distintas. A nota e a imagem só são salvas ao clicar em Aceitar.</p>
        </fieldset>
        <fieldset><legend>Pontuação</legend><div class="settings-grid">
          <label>Pontos por acerto<input id="score-correct" type="number" min="0" step="0.5" required></label>
          <label>Desconto por erro<input id="score-incorrect" type="number" min="0" step="0.5" required></label>
          <label>Pontos em branco<input id="score-blank" type="number" min="0" step="0.5" required></label>
        </div></fieldset>
        <p id="settings-error" role="alert"></p>
        <div class="settings-footer"><button type="submit" id="save-settings" class="btn primary">Salvar configurações</button></div>
      </form>
    </dialog>`;
  }

  _fillSettings() {
    const c = this.config.get('calibration'), a = this.config.get('annotation'), scoring = this.config.get('scoring');
    document.getElementById('student-mode').value = this.config.get('students.mode');
    document.getElementById('roster-text').value = this.config.get('students.rosterText');
    document.getElementById('reference-thickness').value = this.config.get('calibration.referenceThickness') || 5;
    document.getElementById('grade-scale').value = this.config.get('review.gradeScale');
    for (const [id, value] of Object.entries({ 'template-rows': c.rows, 'template-cols': c.cols, 'mark-shape': c.shape,
      'mark-width': c.width, 'mark-height': c.height, 'mark-threshold': c.threshold,
      'score-correct': scoring.correct, 'score-incorrect': scoring.incorrect, 'score-blank': scoring.blank })) {
      document.getElementById(id).value = value;
    }
    for (const [key, value] of Object.entries(a)) document.getElementById(`annotation-${key}`).value = value;
    document.getElementById('mark-height').disabled = c.shape !== 'rectangle';
    document.getElementById('settings-error').textContent = '';
  }

  _saveSettings(automatic = false) {
    const form = document.getElementById('settings-form');
    if (!(automatic ? form.checkValidity() : form.reportValidity())) { document.getElementById('settings-error').textContent = 'Há campos inválidos. Corrija-os para salvar as alterações.'; return false; }
    const number = id => Number(document.getElementById(id).value);
    const value = id => document.getElementById(id).value;
    const calibration = { referenceThickness: number('reference-thickness'), rows: number('template-rows'), cols: number('template-cols'), shape: value('mark-shape'),
      width: number('mark-width'), height: number('mark-height'), threshold: number('mark-threshold') };
    const annotation = Object.fromEntries(Object.keys(this.config.get('annotation')).map(key =>
      [key, ['fontSize', 'lineWidth', 'zoom'].includes(key) ? number(`annotation-${key}`) : value(`annotation-${key}`)]));
    // Keep numeric labels legible against their solid background.
    const luminance = hex => {
      const rgb = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255)
        .map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const foreground = luminance(annotation.textColor), background = luminance(annotation.background);
    if ((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) < 4.5) {
      document.getElementById('settings-error').textContent = 'Escolha cores com mais contraste entre números e fundo (por exemplo, branco sobre roxo escuro).';
      return;
    }
    const students = { mode: value('student-mode'), rosterText: value('roster-text') };
    try {
      const roster = parseRoster(students.rosterText);
      if (students.mode === 'list' && !roster.length) throw new Error('Cadastre pelo menos um aluno para usar a lista.');
    } catch (error) { document.getElementById('settings-error').textContent = error.message; return; }
    const previous = this.config.get('calibration');
    this.config.update({ calibration, annotation, students, review: { gradeScale: number('grade-scale') }, scoring: { correct: number('score-correct'), incorrect: number('score-incorrect'), blank: number('score-blank') } });
    if (calibration.rows !== previous.rows || calibration.cols !== previous.cols) {
      this.positions = null; this.positionHistory = []; this.moveTarget = null;
    }
    if(this.templateImage && ['rows','cols','shape','width','height','threshold'].some(key=>calibration[key]!==previous[key])) {this.mappingApproved=false;this._mappingStage();}
    if (!automatic) document.getElementById('settings-dialog').close();
    this._drawTemplate(); this._redrawExam(); this.app.review.settingsChanged();
    document.getElementById('settings-error').textContent = 'Configurações salvas neste navegador.';
    if (!automatic) this._showMessage('Configurações salvas', 'success');
    return true;
  }

  async _loadImage(file) {
    if (file.type && !file.type.startsWith('image/')) throw new Error('Selecione uma imagem PNG, JPEG ou WebP');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Não foi possível abrir a imagem. Converta para PNG ou JPEG.'));
        image.src = url;
      });
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  }

  async _openCamera(kind) {
    if (this.app.review.saving) return;
    if (kind === 'exam' && !this.app.currentTemplate) { this._showMessage('Aplique um gabarito primeiro', 'error'); return; }
    const button = document.getElementById(`${kind}-camera`);
    if (this.openingCamera) return;
    this._closeCamera();
    this.openingCamera = true;
    button.disabled = true;
    this.cameraTarget = kind;
    const panel = document.getElementById('camera-panel');
    (kind === 'template' ? document.getElementById('step1') : document.getElementById('step3')).appendChild(panel);
    panel.hidden = false;
    document.getElementById('camera-stage').hidden=true;
    document.getElementById('live-state').textContent='Abrindo câmera…';
    try {
      await this.app.camera.initialize(document.getElementById('camera-preview'));
      if (kind === 'exam') this.app.review.cameraStarted();
      else { document.getElementById('live-state').textContent='Toque na imagem para fotografar o modelo.'; document.getElementById('camera-stage').hidden=false; }
      panel.scrollIntoView({ block: 'start' });
    } catch (error) { this._closeCamera(); this._showMessage(error.message, 'error'); }
    finally { button.disabled = false; this.openingCamera = false; }
  }

  _closeCamera() {
    this.app.camera.stop();
    this.app.review.stop();
    document.getElementById('camera-panel').hidden = true;
  }

  _editTemplate(image, template = null) {
    this.referencePoints = template?.alignment?.type === 'solid-v1' ? template.alignment.markers.map(m=>[m.x,m.y]) : [];
    this.placingReferences = false;
    document.getElementById('import-answers').value = template?.answerOverride || template?.imported?.answerOverride || '';
    this.setPhase('edit');
    this.mappingApproved=false;this._mappingStage();
    this.templateImage = image;
    this.editingTemplateId = template ? template.id : null;
    this.corners = template ? [[template.layout.left, template.layout.top], [template.layout.right, template.layout.bottom]] : [];
    this.positions = template?.layout.positions ? template.layout.positions.map(point => [...point]) : null;
    this.positionHistory = [];
    this.moveTarget = null;
    document.getElementById('template-editor').hidden = false;
    if (template) document.getElementById('template-name').value = template.description;
    this._drawTemplate();
  }

  _layout() {
    const { rows, cols } = this.config.get('calibration');
    if (this.corners.length !== 2) throw new Error('Marque a primeira e a última área de resposta');
    const [[left, top], [right, bottom]] = this.corners;
    if (right <= left || (rows > 1 && bottom <= top)) throw new Error('Reposicione a última área à direita e abaixo da primeira');
    return { rows, cols, left, top, right, bottom, ...(this.positions ? { positions: this.positions } : {}) };
  }

  _rememberPositions() {
    this.positionHistory.push(JSON.parse(JSON.stringify({ corners: this.corners, positions: this.positions })));
    if (this.positionHistory.length > 50) this.positionHistory.shift();
  }

  _positionClick(event) {
    if (!this.templateImage) return;
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left) * event.target.width / rect.width;
    const y = (event.clientY - rect.top) * event.target.height / rect.height;
    const point = [Math.max(0, Math.min(1, x / event.target.width)), Math.max(0, Math.min(1, y / event.target.height))];
    if (this.placingReferences) {
      this.referencePoints.push([x,y]);
      if (this.referencePoints.length === 4) this.placingReferences = false;
      this._drawTemplate(); return;
    }
    if(this.mappingApproved)return;
    if (this.moveTarget !== null && this.moveTarget !== undefined) {
      this._rememberPositions();
      if (this.moveTarget === 'first' || this.moveTarget === 'last') {
        const index = this.moveTarget === 'first' ? 0 : 1;
        if (index === 1 && !this.corners.length) { this._showMessage('Marque a primeira área antes da última', 'info'); return; }
        this.corners[index] = point; this.positions = null;
      } else {
        this._ensurePositions(); this.positions[this.moveTarget] = point;
      }
      this.moveTarget = null;
    } else if (this.corners.length < 2) {
      this._rememberPositions(); this.corners.push(point);
    } else {
      const hit = this.hitAreas?.find(area => x >= area.left && x <= area.right && y >= area.top && y <= area.bottom);
      if (hit) this.moveTarget = hit.index;
    }
    this._drawTemplate();
  }

  _ensurePositions() {
    if (!this.positions) this.positions = this.app.omr.detectBubbles(this.templateImage, this._layout())
      .map(([x, y]) => [x / this.templateImage.width, y / this.templateImage.height]);
  }

  _positionKey(event) {
    if(this.mappingApproved)return;
    if (event.key === 'Escape') { this.moveTarget = null; this._drawTemplate(); return; }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta || !Number.isInteger(this.moveTarget)) return;
    event.preventDefault(); this._rememberPositions(); this._ensurePositions();
    const point = this.positions[this.moveTarget];
    const step = event.shiftKey ? 10 : 1;
    point[0] = Math.max(0, Math.min(1, point[0] + delta[0] * step / this.templateImage.width));
    point[1] = Math.max(0, Math.min(1, point[1] + delta[1] * step / this.templateImage.height));
    this._drawTemplate();
  }

  _region(image = this.templateImage) {
    const c = this.config.get('calibration');
    return { shape: c.shape, width: c.width / image.width, height: (c.shape === 'rectangle' ? c.height : c.width) / image.height };
  }

  _drawPositions(canvas, layout, region, positionsOverride = null) {
    const ctx = canvas.getContext('2d');
    const positions = positionsOverride || this.app.omr.detectBubbles(canvas, layout);
    const style = this.config.get('annotation');
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const fontSize = style.fontSize * scale;
    const w = region.width * canvas.width, h = region.height * canvas.height;
    ctx.font = `${style.fontStyle} ${fontSize}px ${style.font}`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const hits = [];
    positions.forEach(([x, y], index) => {
      const number = index + 1;
      const selected = canvas.id === 'template-preview' && this.moveTarget === index;
      ctx.setLineDash(style.lineStyle === 'dashed' ? [6 * scale, 4 * scale] : []);
      ctx.lineWidth = (style.lineWidth + (selected ? 2 : 0)) * scale;
      ctx.strokeStyle = style.color;
      ctx.beginPath();
      if (region.shape === 'circle') ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      else ctx.rect(x - w / 2, y - h / 2, w, h);
      ctx.stroke(); ctx.setLineDash([]);
      const labelWidth = ctx.measureText(String(number)).width + 10 * scale;
      const labelHeight = fontSize + 6 * scale;
      const left = Math.max(0, Math.min(canvas.width - labelWidth, x - labelWidth / 2));
      const top = Math.max(0, Math.min(canvas.height - labelHeight, y - h / 2 - labelHeight - 4 * scale));
      ctx.fillStyle = style.background; ctx.fillRect(left, top, labelWidth, labelHeight);
      ctx.strokeStyle = selected ? '#ffd600' : '#ffffff'; ctx.lineWidth = 2 * scale;
      ctx.strokeRect(left, top, labelWidth, labelHeight);
      ctx.fillStyle = style.textColor; ctx.fillText(String(number), left + labelWidth / 2, top + labelHeight / 2);
      // The number and a generous target around the shape are clickable, including on touch screens.
      hits.push({ index, left, top, right: left + labelWidth, bottom: top + labelHeight });
      hits.push({ index, left: x - Math.max(w / 2, 14 * scale), right: x + Math.max(w / 2, 14 * scale),
        top: y - Math.max(h / 2, 14 * scale), bottom: y + Math.max(h / 2, 14 * scale) });
    });
    if (canvas.id === 'template-preview') this.hitAreas = hits;
  }

  _sizeCanvas(canvas) {
    const available = canvas.parentElement.clientWidth;
    canvas.style.width = `${Math.max(1, available) * this.config.get('annotation.zoom') / 100}px`;
  }

  _drawTemplate() {
    if (!this.templateImage) return;
    const canvas = document.getElementById('template-preview');
    canvas.width = this.templateImage.width; canvas.height = this.templateImage.height;
    this._sizeCanvas(canvas);
    canvas.getContext('2d').putImageData(this.templateImage, 0, 0);
    const c = this.config.get('calibration');
    const shapeName = { circle: 'círculo', square: 'quadrado', rectangle: 'retângulo' }[c.shape];
    document.getElementById('calibration-summary').textContent = `${c.rows} questões × ${c.cols} alternativas · ${shapeName} · Ajustes na engrenagem`;
    const instruction = document.getElementById('calibration-instruction');
    instruction.textContent = this.moveTarget === 'first' ? 'Clique no novo centro da primeira área. A grade será recalculada.' :
      this.moveTarget === 'last' ? 'Clique no novo centro da última área. A grade será recalculada.' :
      Number.isInteger(this.moveTarget) ? `Área ${this.moveTarget + 1} selecionada: clique no novo centro ou use as setas.` :
      this.corners.length === 0 ? 'Passo 1 de 2 — Clique no centro da PRIMEIRA área (questão 1, alternativa A).' :
      this.corners.length === 1 ? `Primeira área marcada com o número 1. Passo 2 de 2 — Clique na ÚLTIMA área (questão ${c.rows}, alternativa ${String.fromCharCode(64 + c.cols)}).` :
      'Grade pronta — Confira os números. Clique em um número para corrigir sua posição.';
    const text = document.getElementById('template-answers'); text.textContent = '';
    this.templateAnalysis = null; this.hitAreas = [];
    const region = this._region();
    if (!this.mappingApproved && this.corners.length === 1) this._drawPositions(canvas, null, region,
      [[this.corners[0][0] * canvas.width, this.corners[0][1] * canvas.height]]);
    const list = document.getElementById('position-list'); list.replaceChildren();
    try {
      const layout = this._layout();
      Object.assign(this.app.omr.options, { optionsPerQuestion: layout.cols, threshold: c.threshold,
        sampleShape: region.shape, sampleWidth: region.width * canvas.width, sampleHeight: region.height * canvas.height });
      const positions = this.app.omr.detectBubbles(this.templateImage, layout);
      let answers = this.app.omr.processOMR(this.templateImage, positions, layout.rows);
      const override = document.getElementById('import-answers').value.trim();
      if (override) {
        answers = override.toUpperCase().replace(/[\s,;|]+/g, '').split('').map(c=>c.charCodeAt(0)-65);
        if (answers.length !== layout.rows || answers.some(a=>a<0 || a>=layout.cols)) throw new Error(`Informe ${layout.rows} respostas entre A e ${String.fromCharCode(64+layout.cols)}.`);
      }
      if(!this.mappingApproved)this._drawPositions(canvas, layout, region);
      positions.forEach((_, index) => {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'position-chip'; button.textContent = `${index + 1} · Q${Math.floor(index / layout.cols) + 1}${String.fromCharCode(65 + index % layout.cols)}`;
        button.setAttribute('aria-pressed', String(this.moveTarget === index));
        button.addEventListener('click', () => { this.moveTarget = index; this._drawTemplate(); canvas.focus({ preventScroll: true }); });
        list.appendChild(button);
      });
      text.textContent = answers.map((a, i) => `${i + 1}: ${a >= 0 ? String.fromCharCode(65 + a) : a === -2 ? 'múltipla' : 'em branco'}`).join(' · ');
      if (answers.some(a => a < 0)) throw new Error('Há questões em branco ou ambíguas. Corrija as posições ou ajuste a área de leitura na engrenagem.');
      this.templateAnalysis = { layout, answers, region, imageSize: { width: canvas.width, height: canvas.height }, threshold: c.threshold, radius: region.width / 2 };
    } catch (error) { if (this.corners.length === 2) text.textContent += ` — ${error.message}`; }
    const referenceNames = ['superior esquerdo', 'superior direito', 'inferior direito', 'inferior esquerdo'];
    const referenceInstruction = document.getElementById('reference-instruction');
    referenceInstruction.textContent = this.placingReferences ? `Referência ${this.referencePoints.length+1}/4: clique no canto ${referenceNames[this.referencePoints.length]}, em um espaço branco.` : this.referencePoints?.length === 4 ? 'Quatro referências posicionadas. Para alterar, use Posicionar referências novamente.' : 'Sem referências: leitura com alinhamento manual.';
    if (this.referencePoints?.length) {
      const ctx=canvas.getContext('2d'), thickness=c.referenceThickness || 5;
      this.referencePoints.forEach(([x,y],i)=>{
        const width=thickness*(3+i*2); ctx.fillStyle='black';ctx.fillRect(x-width/2,y-thickness/2,width,thickness);
        ctx.strokeStyle='#00a878';ctx.lineWidth=2;ctx.strokeRect(x-width/2-3,y-thickness/2-3,width+6,thickness+6);
      });
    }
    document.getElementById('approve-mapping').disabled = !this.templateAnalysis;
    document.getElementById('save-template').disabled = !this.templateAnalysis || !!this.placingReferences;
    document.getElementById('save-template').textContent = this.editingTemplateId ? 'Salvar alterações do gabarito' : 'Salvar Gabarito';
    document.getElementById('undo-position').disabled = !this.positionHistory.length;
    document.getElementById('move-last').disabled = !this.corners.length;
  }

  _redrawExam() {
    const image = this.app.currentImageData, template = this.app.currentTemplate;
    const canvas = document.getElementById('exam-preview');
    if (!image || !template || canvas.hidden) return;
    this._sizeCanvas(canvas);
    canvas.getContext('2d').putImageData(image, 0, 0);
    // Review images remain free of calibration labels.
  }

  async _editSavedTemplate() {
    const id = document.getElementById('template-select').value;
    if (!id) { this._showMessage('Selecione um gabarito para editar', 'info'); return; }
    try {
      const template = await this.app.template.getTemplate(id);
      if (template.generated) { this.app.sheetBuilder.edit(template); return; }
      if (!template.url) throw new Error('Este gabarito antigo não guardou a imagem. Selecione a imagem original para cadastrá-lo novamente.');
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Não foi possível abrir a imagem salva')); image.src = template.imported?.sourceURL || template.url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const region = template.region || { shape: 'circle', width: template.radius * 2, height: template.radius * 2 * canvas.width / canvas.height };
      this.config.update({ calibration: { referenceThickness: Math.max(5, template.alignment?.markerSize || this.config.get('calibration.referenceThickness') || 8), rows: template.layout.rows, cols: template.layout.cols, shape: region.shape,
        width: Math.round(region.width * canvas.width), height: Math.round(region.height * canvas.height), threshold: template.threshold ?? 128 } });
      this._editTemplate(ctx.getImageData(0, 0, canvas.width, canvas.height), template);
      document.getElementById('template-editor').scrollIntoView({ block: 'start' });
    } catch (error) { this._showMessage(error.message, 'error'); }
  }

  async _saveTemplate() {
    if (!this.templateAnalysis || this.savingTemplate) return;
    const name = document.getElementById('template-name').value.trim();
    if (!name) { this._showMessage('Dê um nome ao gabarito', 'error'); return; }
    try {
      this.savingTemplate=true; document.getElementById('save-template').disabled=true;
      const id = this.editingTemplateId || `template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const original = document.createElement('canvas'); original.width = this.templateImage.width; original.height = this.templateImage.height;
      original.getContext('2d').putImageData(this.templateImage, 0, 0);
      const sourceURL = original.toDataURL('image/png');
      const analysis = { ...this.templateAnalysis, answerOverride: document.getElementById('import-answers').value.trim() };
      if (this.referencePoints?.length === 4) {
        const definition = solidDefinition(original.width, original.height, this.config.get('calibration.referenceThickness') || 5, this.referencePoints);
        const ctx=original.getContext('2d');
        // Preserve the imported form: references must occupy unused white space.
        for (const m of definition.markers) {
          const left=Math.floor(m.x-m.width/2-4),top=Math.floor(m.y-m.height/2-4),w=Math.ceil(m.width+8),h=Math.ceil(m.height+8);
          if(left<0 || top<0 || left+w>original.width || top+h>original.height) throw new Error('Deixe os blocos e uma margem branca dentro da imagem.');
          const pixels=ctx.getImageData(left,top,w,h).data;
          for(let i=0;i<pixels.length;i+=4) if((pixels[i]+pixels[i+1]+pixels[i+2])/3<180) throw new Error('Uma referência cobre conteúdo. Reposicione os blocos em espaços brancos.');
          ctx.fillStyle='black';ctx.fillRect(m.x-m.width/2,m.y-m.height/2,m.width,m.height);
        }
        const rendered=ctx.getImageData(0,0,original.width,original.height);
        this.app.alignment.align(rendered,definition);
        analysis.alignment=definition;
        analysis.imported={sourceURL,answerOverride:document.getElementById('import-answers').value.trim()};
      }
      await this.app.template.registerTemplate(id, original.toDataURL('image/png'), name, analysis);
      this.editingTemplateId = id;
      this._drawTemplate();
      await this.app._loadTemplates();
      document.getElementById('template-select').value = id;
      await this._applyTemplate();
      await this.app.sheetBuilder.show();
    } catch (error) { this._showMessage(`Erro ao salvar: ${error.message}`, 'error'); }
    finally { this.savingTemplate=false; this._drawTemplate(); }
  }

  /**
   * Aplica o gabarito selecionado
   */
  async _applyTemplate() {
    const select = document.getElementById('template-select');
    const templateId = select.value;
    if (!templateId) {
      this._closeCamera(); this.app.review.invalidate(); this.app.currentTemplate = null; this.app.scanner.currentExam = null;
      this.config.update({ exam: { lastTemplate: '' } });
      document.getElementById('approve-model').disabled=true;
      document.getElementById('active-template').textContent = 'Selecione um modelo para começar.';
      document.getElementById('scan-status').textContent = '';
      document.getElementById('exam-preview').hidden = true;
      document.getElementById('results-panel').replaceChildren();
      return;
    }
    
    try {
      select.disabled = true; this.app.currentTemplate = null;
      this._closeCamera(); this.app.review.invalidate();
      await this.app.scanner.initializeWithTemplate(templateId);
      document.getElementById('exam-preview').hidden = true;
      document.getElementById('results-panel').replaceChildren();
      document.getElementById('scan-status').textContent = this.app.currentTemplate.alignment ? 'Alinhamento automático ativo: mostre as quatro marcas da folha.' : 'Gabarito manual aplicado: mantenha o mesmo enquadramento.';
      this.setPhase('model'); document.getElementById('approve-model').disabled=false;
      document.getElementById('active-template').textContent = `Modelo ativo: ${this.app.currentTemplate.description}`;
      this._renderResultsPreview();
    } catch (error) {
      this.app.currentTemplate = null; this.app.scanner.currentExam = null;
      document.getElementById('approve-model').disabled=true;
      document.getElementById('active-template').textContent = 'Não foi possível ativar este modelo.';
      this._showMessage(`Erro ao aplicar gabarito: ${error.message}`, 'error');
    } finally { select.disabled = false; }
  }

  /**
   * Inicia o processo de leitura da prova
   */
  async _startScan(image = null) {
    if (!image && this.cameraTarget === 'template') {
      try { const captured=this.app.camera.captureFrame({maxDimension:2400}); this._closeCamera(); const image=await this.app.documentImport.open(captured); if(image)this._editTemplate(image); }
      catch (error) { this._showMessage(error.message, 'error'); }
      return;
    }
    if (image) await this.app.review.readUpload(image);
    else await this.app.review.capture();
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
    
    panel.innerHTML = `<details><summary>Conferir detalhamento por questão</summary>
      <div class="score-summary">
        <div class="score-circle">
          <span class="score-number">${score.percentage}</span>
          <span class="score-percent">%</span>
        </div>
        <div class="score-breakdown">
          <div><span class="dot correct"></span>Acertos: ${correct}</div>
          <div><span class="dot incorrect"></span>Erros: ${incorrect}</div>
          <div><span class="dot blank"></span>Em Branco: ${blank}</div>
          <div>Pontos: ${score.score} / ${score.total}</div>
          <div>Nota: ${(Math.round(score.percentage * this.config.get('review.gradeScale')) / 100).toLocaleString('pt-BR')} / ${this.config.get('review.gradeScale')}</div>
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
      </div></details>
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
    toast.className = `toast ${type} show`;
    clearTimeout(this.toastTimer);
    
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');

    }, 3000);
  }
}

export default UI;