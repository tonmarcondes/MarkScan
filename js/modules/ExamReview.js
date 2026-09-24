import { project } from './Alignment.js';
import { parseRoster } from './Roster.js';
import { createEvidence } from './Evidence.js';

const copy = value => JSON.parse(JSON.stringify(value));
const format = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export default class ExamReview {
  constructor(app, ui) {
    this.app = app; this.ui = ui;
    this.generation = 0; this.candidate = null; this.pending = null;
    this.live = false; this.saving = false; this.saved = null;
    this.stableCount = 0; this.signature = ''; this.historyLimit = 30;
  }

  markup() {
    return `<div id="camera-panel" hidden>
      <div id="camera-stage">
        <video id="camera-preview" autoplay muted playsinline></video>
        <canvas id="camera-guide" aria-hidden="true"></canvas>
        <div id="live-hud" hidden><span class="live-badge">LEITURA AO VIVO · PRÉVIA</span>
          <strong id="live-grade">Enquadre a prova</strong><span id="live-points"></span>
        </div>
      </div>
      <p id="live-state">Alinhe as marcas aos contornos.</p>
      <div class="review-actions">
        <button id="btn-scan" class="btn danger">Capturar imagem</button>
        <button id="freeze-exam" class="btn secondary" hidden>Congelar para conferir</button>
        <button id="stop-camera" class="btn secondary">Fechar câmera</button>
      </div>
    </div>
    <div id="student-panel" class="student-panel" hidden>
      <label id="student-name-field" hidden>Nome do aluno<input id="student-name" type="text" maxlength="120" autocomplete="off" placeholder="Digite o nome antes de aceitar"></label>
      <label id="student-list-field" hidden>Aluno da lista<select id="student-select"><option value="">Selecione um aluno</option></select></label>
      <p id="student-help"></p>
    </div>
    <div class="canvas-viewport"><canvas id="exam-preview" hidden></canvas></div>
    <div id="scan-status" class="scan-status" role="status"></div>
    <div id="review-actions" class="review-actions" hidden>
      <button id="accept-exam" class="btn primary" disabled>Aceitar e salvar evidência</button>
      <button id="retake-exam" class="btn secondary" hidden>Voltar à leitura ao vivo</button>
      <button id="next-exam" class="btn primary" hidden>Próxima prova</button>
      <button id="download-current-evidence" class="btn secondary" hidden>Baixar evidência</button>
    </div>
    <div id="results-panel" class="results-panel"></div>
    <section class="history-section" aria-labelledby="history-title">
      <div class="history-heading"><h3 id="history-title">Correções aceitas</h3><button id="refresh-history" class="btn secondary">Atualizar histórico</button></div>
      <p>Notas e imagens ficam neste navegador. Baixe a evidência para guardá-la fora do dispositivo.</p>
      <div id="history-list"></div>
      <button id="more-history" class="btn secondary" hidden>Mostrar mais</button>
    </section>
    <dialog id="evidence-dialog" aria-labelledby="evidence-title"><div class="settings-heading"><h2 id="evidence-title">Evidência salva</h2><button id="close-evidence" class="btn secondary" aria-label="Fechar evidência">✕</button></div>
      <img id="evidence-image" alt="Imagem da prova aceita com aluno, nota, data e respostas">
      <button id="download-evidence" class="btn primary">Baixar imagem</button>
    </dialog>`;
  }

  bind() {
    document.getElementById('accept-exam').addEventListener('click', () => this.accept());
    document.getElementById('freeze-exam').addEventListener('click', () => this.freeze());
    document.getElementById('retake-exam').addEventListener('click', () => this.resume());
    document.getElementById('next-exam').addEventListener('click', () => this.next());
    document.getElementById('download-current-evidence').addEventListener('click', () => this.download(this.saved));
    document.getElementById('refresh-history').addEventListener('click', () => this.refreshHistory());
    document.getElementById('more-history').addEventListener('click', () => { this.historyLimit += 30; this.refreshHistory(); });
    document.getElementById('close-evidence').addEventListener('click', () => document.getElementById('evidence-dialog').close());
    document.getElementById('download-evidence').addEventListener('click', () => this.download(this.viewed));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.live && !this.pending && !this.saved) {
        this.candidate = null; this.stableCount = 0; this.signature = ''; this.updateActions(); this.hud(null, 'Leitura pausada enquanto a aba está oculta.');
      }
    });
    this.refreshIdentity();
    this.refreshHistory();
  }

  refreshIdentity() {
    const mode = this.app.config.get('students.mode');
    document.getElementById('student-panel').hidden = mode === 'none';
    document.getElementById('student-name-field').hidden = mode !== 'name';
    document.getElementById('student-list-field').hidden = mode !== 'list';
    const select = document.getElementById('student-select'), previous = select.value;
    select.replaceChildren(new Option('Selecione um aluno', ''));
    for (const student of parseRoster(this.app.config.get('students.rosterText') || '')) {
      select.add(new Option(`${student.enrollment ? student.enrollment + ' · ' : ''}${student.name}`, student.id));
    }
    select.value = previous;
    document.getElementById('student-help').textContent = mode === 'list' ? 'A lista é carregada na engrenagem. Confira o aluno antes de aceitar.' : 'A nota será atribuída a este nome quando você aceitar.';
  }

  identity() {
    const mode = this.app.config.get('students.mode');
    if (mode === 'none') return null;
    if (mode === 'name') {
      const name = document.getElementById('student-name').value.trim();
      if (!name) { document.getElementById('student-name').focus(); throw new Error('Informe o nome do aluno antes de aceitar.'); }
      return { name, id: null, enrollment: '' };
    }
    const selected = parseRoster(this.app.config.get('students.rosterText')).find(student => student.id === document.getElementById('student-select').value);
    if (!selected) { document.getElementById('student-select').focus(); throw new Error('Selecione o aluno antes de aceitar.'); }
    return selected;
  }

  invalidate() {
    if (this.saving) return;
    this.generation++; clearTimeout(this.timer);
    this.candidate = null; this.pending = null; this.saved = null;
    this.signature = ''; this.stableCount = 0;
    this.updateActions();
  }

  cameraStarted() {
    this.invalidate(); this.live = true;
    const dimensions = this.app.currentTemplate.alignment ? this.app.camera.dimensions : (this.app.currentTemplate.imageSize || this.app.camera.dimensions);
    this.aspectRatio = dimensions.width / dimensions.height;
    document.getElementById('camera-stage').style.aspectRatio = String(this.aspectRatio);
    document.getElementById('camera-stage').style.setProperty('--camera-aspect', this.aspectRatio);
    document.getElementById('camera-panel').classList.add('exam-live');
    document.getElementById('btn-scan').hidden = true;
    document.getElementById('freeze-exam').hidden = false;
    document.getElementById('live-hud').hidden = false;
    document.getElementById('exam-preview').hidden = true;
    document.getElementById('results-panel').replaceChildren();
    document.getElementById('scan-status').textContent = this.app.currentTemplate.alignment ? 'Mostre os quatro cantos. A folha será alinhada automaticamente antes da leitura.' : 'Alinhe a folha aos contornos. A nota só será registrada ao aceitar.';
    this.drawGuide(); this.updateActions(); this.tick(this.generation);
  }

  stop() {
    this.live = false; this.generation++; clearTimeout(this.timer);
    if (!this.pending && !this.saved) this.candidate = null;
    document.getElementById('camera-panel').classList.remove('exam-live');
    document.getElementById('camera-stage').style.aspectRatio = '';
    document.getElementById('live-hud').hidden = true;
    document.getElementById('btn-scan').hidden = false;
    document.getElementById('freeze-exam').hidden = true;
    this.updateActions();
  }

  async analyze(image, source) {
    const capturedAt = new Date().toISOString();
    const { answers, image: normalized, alignment } = await this.app.scanner.processImage(image);
    const score = this.app.calculateScore();
    const { url, ...template } = this.app.currentTemplate;
    const gradeScale = this.app.config.get('review.gradeScale');
    return { image: normalized, original: alignment ? image : null, alignment, source, capturedAt, answers: [...answers], score: copy(score),
      grade: Math.round(score.percentage * gradeScale) / 100, gradeScale,
      template: copy(template), scoringRules: copy(this.app.config.get('scoring')) };
  }

  async tick(generation) {
    if (!this.live || generation !== this.generation || this.pending || this.saved || this.saving) return;
    try {
      if (!document.hidden && !document.getElementById('settings-dialog').open && !document.getElementById('sheet-dialog').open && !document.getElementById('print-sheet-dialog').open) {
        if (!this.app.camera.isActive) throw new Error('Câmera desconectada. Feche e abra a câmera novamente.');
        const image = this.app.camera.captureFrame({ aspectRatio: this.aspectRatio, maxDimension: 1280 });
        const candidate = await this.analyze(image, 'camera');
        if (!this.live || generation !== this.generation || this.pending || this.saved || this.saving) return;
        const signature = candidate.answers.join(',');
        this.stableCount = signature === this.signature ? this.stableCount + 1 : 1;
        this.signature = signature;
        candidate.ready = this.stableCount >= 3;
        candidate.observedAt = performance.now();
        this.candidate = candidate;
        this.drawGuide();
        const blank = candidate.answers.every(answer => answer === -1);
        const ambiguous = candidate.answers.includes(-2);
        this.hud(candidate, !candidate.ready ? 'Estabilizando leitura…' : blank ? 'Nenhuma marca detectada. Confira o enquadramento ou a prova em branco.' : ambiguous ? 'Há marcações múltiplas. Confira antes de aceitar.' : 'Leitura estável · confira e aceite.');
        this.updateActions();
      }
    } catch (error) {
      this.candidate = null; this.stableCount = 0; this.signature = '';
      this.hud(null, error.message); this.drawGuide(); this.updateActions();
    }
    if (this.live && generation === this.generation && !this.pending && !this.saved) this.timer = setTimeout(() => this.tick(generation), 300);
  }

  hud(candidate, message) {
    document.getElementById('live-grade').textContent = candidate ? `Nota ${format(candidate.grade)} / ${format(candidate.gradeScale)}` : 'Enquadre a prova';
    document.getElementById('live-points').textContent = candidate ? `${format(candidate.score.score)} / ${format(candidate.score.total)} pontos` : '';
    document.getElementById('live-state').textContent = candidate?.alignment ? `Folha alinhada (${candidate.alignment.rotation}°) · ${message}` : message;
  }

  drawGuide() {
    const canvas = document.getElementById('camera-guide'), template = this.app.currentTemplate;
    const stage = document.getElementById('camera-stage');
    if (!template || !this.live) return;
    canvas.width = Math.max(1, stage.clientWidth); canvas.height = Math.max(1, stage.clientHeight);
    const region = template.region || { shape: 'circle', width: template.radius * 2, height: template.radius * 2 * canvas.width / canvas.height };
    if (!template.alignment) { this.ui._drawPositions(canvas, template.layout, region); return; }
    const metadata = this.candidate?.alignment;
    if (!metadata) return;
    const ctx = canvas.getContext('2d');
    const map = (x, y) => { const point = project(metadata.matrix, x, y); return [point[0] * canvas.width, point[1] * canvas.height]; };
    ctx.strokeStyle = '#00e59b'; ctx.lineWidth = 2;
    ctx.beginPath(); metadata.quad.forEach(([x, y], index) => index ? ctx.lineTo(x * canvas.width, y * canvas.height) : ctx.moveTo(x * canvas.width, y * canvas.height)); ctx.closePath(); ctx.stroke();
    const size = template.imageSize;
    const points = this.app.omr.detectBubbles(size, template.layout);
    for (const [px, py] of points) {
      const nx = px / size.width, ny = py / size.height;
      const count = region.shape === 'circle' ? 16 : 4;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const offset = count === 4 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]][i] : [Math.cos(i * Math.PI * 2 / count), Math.sin(i * Math.PI * 2 / count)];
        const point = map(nx + offset[0] * region.width / 2, ny + offset[1] * region.height / 2);
        if (!i) ctx.moveTo(...point); else ctx.lineTo(...point);
      }
      ctx.closePath(); ctx.stroke();
    }
  }

  async readUpload(image) {
    if (this.saving) return;
    this.ui._closeCamera(); this.invalidate();
    document.getElementById('exam-preview').hidden = true;
    document.getElementById('results-panel').replaceChildren();
    const generation = this.generation;
    try {
      document.getElementById('scan-status').textContent = 'Processando imagem…';
      const candidate = await this.analyze(image, 'upload');
      if (generation !== this.generation) return;
      candidate.ready = true; this.candidate = candidate; this.pending = candidate;
      this.showFrozen(candidate);
      document.getElementById('scan-status').textContent = 'Leitura concluída. Confira o aluno e aceite para salvar a nota e a evidência.';
      this.updateActions();
    } catch (error) { document.getElementById('scan-status').textContent = error.message; }
  }

  showFrozen(candidate) {
    const canvas = document.getElementById('exam-preview');
    canvas.width = candidate.image.width; canvas.height = candidate.image.height; canvas.hidden = false;
    this.ui._sizeCanvas(canvas); canvas.getContext('2d').putImageData(candidate.image, 0, 0);
    const template = candidate.template;
    this.ui._drawPositions(canvas, template.layout, template.region || { shape: 'circle', width: template.radius * 2, height: template.radius * 2 * canvas.width / canvas.height });
    this.ui._renderResults(candidate.score, candidate.answers);
  }

  freeze() {
    if (this.saving || this.saved || !this.candidate?.ready) return;
    this.pending = this.candidate; this.generation++; clearTimeout(this.timer);
    this.showFrozen(this.pending); this.hud(this.pending, 'Imagem congelada · confirme o aluno antes de aceitar.');
    this.updateActions();
  }

  resume() {
    if (this.saving || !this.app.camera.isActive) return;
    this.invalidate(); this.live = true;
    document.getElementById('exam-preview').hidden = true;
    document.getElementById('results-panel').replaceChildren();
    this.tick(this.generation);
  }

  async accept() {
    if (this.saving || this.saved) return;
    const candidate = this.pending || this.candidate;
    if (!candidate?.ready) return;
    if (!this.pending && performance.now() - candidate.observedAt > 1500) {
      this.ui._showMessage('Aguarde uma leitura atual da câmera.', 'info'); return;
    }
    let student;
    try { student = this.identity(); } catch (error) { this.ui._showMessage(error.message, 'error'); return; }
    // Freeze before asynchronous storage: pixels, answers and identity form one immutable record.
    this.pending = candidate; this.generation++; clearTimeout(this.timer); this.saving = true;
    this.lockControls(true); this.updateActions();
    const record = { id: candidate.id || crypto.randomUUID(), templateId: candidate.template.id,
      templateDescription: candidate.template.description, student: copy(student), capturedAt: candidate.capturedAt,
      acceptedAt: new Date().toISOString(), timestamp: new Date().toISOString(), source: candidate.source,
      answers: [...candidate.answers], score: copy(candidate.score), grade: candidate.grade, gradeScale: candidate.gradeScale,
      alignment: candidate.alignment, scoringRules: candidate.scoringRules, templateSnapshot: candidate.template, hasEvidence: true };
    candidate.id = record.id;
    try {
      const evidence = createEvidence(candidate.image, record, candidate.original);
      await this.app.storage.saveAcceptedResult(record, evidence);
      this.saved = record;
      this.hud(candidate, 'Nota e evidência salvas. Toque em Próxima prova.');
      document.getElementById('scan-status').textContent = `Salvo${student ? ' para ' + student.name : ''}: nota ${format(record.grade)} · ${format(record.score.score)} pontos. Evidência disponível no histórico.`;
      this.ui._showMessage('Nota e evidência salvas', 'success');
    } catch (error) {
      this.showFrozen(candidate);
      document.getElementById('scan-status').textContent = `Não foi possível salvar: ${error.message}. A imagem está preservada nesta tela; tente novamente.`;
      this.hud(candidate, 'Falha ao salvar. Confira o armazenamento e tente novamente.');
    } finally { this.saving = false; this.lockControls(false); this.updateActions(); }
    if (this.saved) await this.refreshHistory();
  }

  lockControls(locked) {
    const ids = ['student-name', 'student-select', 'open-settings', 'btn-apply-template', 'edit-template', 'save-template', 'exam-file', 'template-file', 'exam-camera', 'template-camera', 'stop-camera', 'new-sheet', 'show-sheets'];
    if (locked) this.disabledControls = new Map(ids.map(id => [id, document.getElementById(id).disabled]));
    for (const id of ids) document.getElementById(id).disabled = locked || (this.disabledControls?.get(id) ?? false);
  }

  next() {
    if (this.saving) return;
    const previousStudent = this.saved?.student?.id;
    this.invalidate();
    document.getElementById('student-name').value = '';
    if (previousStudent && this.app.config.get('students.mode') === 'list') {
      const select = document.getElementById('student-select');
      const index = Array.from(select.options).findIndex(option => option.value === previousStudent);
      select.selectedIndex = index >= 0 && index + 1 < select.options.length ? index + 1 : 0;
    }
    document.getElementById('exam-preview').hidden = true;
    document.getElementById('results-panel').replaceChildren();
    document.getElementById('scan-status').textContent = 'Próxima prova: confira o aluno e posicione a folha.';
    if (this.app.camera.isActive) { this.live = true; this.tick(this.generation); }
    this.updateActions();
  }

  settingsChanged() {
    this.refreshIdentity();
    if (this.saving || this.saved) return;
    if (this.pending) {
      const candidate = this.pending;
      candidate.scoringRules = copy(this.app.config.get('scoring'));
      candidate.score = this.app.omr.calculateScore(candidate.answers, candidate.template.answers, candidate.scoringRules);
      candidate.gradeScale = this.app.config.get('review.gradeScale');
      candidate.grade = Math.round(candidate.score.percentage * candidate.gradeScale) / 100;
      this.showFrozen(candidate);
    } else { this.candidate = null; this.stableCount = 0; this.signature = ''; }
    this.drawGuide(); this.updateActions();
  }

  updateActions() {
    const active = !!(this.live || this.candidate || this.pending || this.saved);
    document.getElementById('review-actions').hidden = !active;
    const accept = document.getElementById('accept-exam');
    accept.hidden = !!this.saved; accept.disabled = this.saving || !(this.pending || this.candidate)?.ready;
    accept.textContent = this.saving ? 'Salvando nota e evidência…' : 'Aceitar e salvar evidência';
    document.getElementById('freeze-exam').disabled = this.saving || !!this.pending || !!this.saved || !this.candidate?.ready;
    document.getElementById('retake-exam').hidden = !this.pending || !this.app.camera.isActive || !!this.saved;
    document.getElementById('retake-exam').disabled = this.saving;
    document.getElementById('next-exam').hidden = !this.saved;
    document.getElementById('download-current-evidence').hidden = !this.saved;
  }

  async refreshHistory() {
    const list = document.getElementById('history-list');
    try {
      const records = await this.app.storage.getHistory(this.historyLimit + 1);
      list.replaceChildren();
      if (!records.length) { list.textContent = 'Nenhuma correção aceita ainda.'; return; }
      const table = document.createElement('table'); table.className = 'history-table';
      const header = table.createTHead().insertRow();
      for (const title of ['Aluno / gabarito', 'Nota e pontos', 'Data', 'Evidência']) { const th = document.createElement('th'); th.textContent = title; header.appendChild(th); }
      const body = table.createTBody();
      for (const record of records.slice(0, this.historyLimit)) {
        const row = body.insertRow();
        row.insertCell().textContent = `${record.student?.name || 'Sem identificação'}${record.student?.enrollment ? ' · ' + record.student.enrollment : ''} · ${record.templateDescription || ''}`;
        const score = record.score || record.result;
        row.insertCell().textContent = `${record.grade !== undefined ? format(record.grade) + ' / ' + record.gradeScale + ' · ' : ''}${format(score?.score || 0)} pontos`;
        row.insertCell().textContent = new Date(record.acceptedAt || record.timestamp).toLocaleString('pt-BR');
        const cell = row.insertCell();
        if (record.hasEvidence) {
          const button = document.createElement('button'); button.className = 'btn secondary'; button.textContent = 'Ver imagem';
          button.addEventListener('click', () => this.openEvidence(record)); cell.appendChild(button);
        } else cell.textContent = 'Registro antigo sem imagem';
      }
      list.appendChild(table); document.getElementById('more-history').hidden = records.length <= this.historyLimit;
    } catch (error) { list.textContent = `Não foi possível carregar o histórico: ${error.message}`; }
  }

  async openEvidence(record) {
    try {
      const evidence = await this.app.storage.getEvidence(record.id);
      if (!evidence) throw new Error('Imagem não encontrada');
      this.viewed = record; document.getElementById('evidence-image').src = evidence;
      document.getElementById('evidence-dialog').showModal();
    } catch (error) { this.ui._showMessage(error.message, 'error'); }
  }

  async download(record) {
    if (!record) return;
    try {
      const evidence = await this.app.storage.getEvidence(record.id);
      if (!evidence) throw new Error('Imagem não encontrada');
      const link = document.createElement('a'); link.href = evidence;
      const student = (record.student?.name || 'sem-nome').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70);
      link.download = `MarkScan-${student}-${record.id}.jpg`; link.click();
    } catch (error) { this.ui._showMessage(error.message, 'error'); }
  }
}
