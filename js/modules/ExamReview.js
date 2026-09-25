import { iconButton } from './Icons.js';
import { alignmentReviewMarkup, showAlignmentReview, clearAlignmentReview } from './AlignmentReview.js';
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
      <div id="live-hud" hidden><span class="live-badge">LEITURA AO VIVO · PRÉVIA</span>
          <strong id="live-grade">Enquadre a prova</strong><span id="live-points"></span>
        </div>
      <div id="camera-stage" role="button" tabindex="0" aria-label="Toque na imagem para fotografar">
        <video id="camera-preview" autoplay muted playsinline></video>
        <canvas id="camera-guide" aria-hidden="true"></canvas>
      </div>
      <p id="live-state">Alinhe as marcas aos contornos.</p>
      <div class="review-actions camera-tools">
        <button id="toggle-camera-grid" class="btn secondary icon-button" aria-label="Mostrar grade" title="Mostrar ou ocultar grade" aria-pressed="false">▦</button>
        <button id="fit-camera-grid" class="btn secondary icon-button" aria-label="Alinhar grade automaticamente" title="Acompanhar referências automaticamente" aria-pressed="false">⌖</button>
        <button id="stop-camera" class="btn secondary icon-button" aria-label="Fechar câmera" title="Fechar câmera">✕</button>
      </div>
    </div>
    <div id="student-panel" class="student-panel" hidden>
      <label id="student-name-field" hidden>Nome do aluno<input id="student-name" type="text" maxlength="120" autocomplete="off" placeholder="Digite o nome antes de aceitar"></label>
      <label id="student-list-field" hidden>Aluno da lista<select id="student-select"><option value="">Selecione um aluno</option></select></label>
      <p id="student-help"></p>
    </div>
    <p id="review-grade" class="review-grade" role="status" hidden></p>${alignmentReviewMarkup()}
    <div id="scan-status" class="scan-status" role="status"></div>
    <div id="review-actions" class="review-actions" hidden>
      <button id="accept-exam" class="btn primary" disabled>Aceitar e salvar evidência</button>
      <button id="retake-exam" class="btn secondary" hidden>Fotografar novamente</button>
      <button id="next-exam" class="btn primary" hidden>Próxima prova</button>
      <button id="download-current-evidence" class="btn secondary" hidden>Finalizar</button>
    </div>
    <div id="results-panel" class="results-panel"></div>
    <details class="history-section"><summary>Ver correções aceitas</summary>
      <div class="history-heading"><h3 id="history-title">Correções aceitas</h3><button id="refresh-history" class="btn secondary">Atualizar histórico</button></div>
      <p>Notas e imagens ficam neste navegador. Baixe a evidência para guardá-la fora do dispositivo.</p>
      <div id="history-list"></div>
      <button id="more-history" class="btn secondary" hidden>Mostrar mais</button>
    </details>
    <dialog id="evidence-dialog" aria-labelledby="evidence-title"><div class="settings-heading"><h2 id="evidence-title">Evidência salva</h2><button id="close-evidence" class="btn secondary" aria-label="Fechar evidência">✕</button></div>
      <img id="evidence-image" alt="Imagem da prova aceita com aluno, nota, data e respostas">
      <button id="download-evidence" class="btn primary">Baixar imagem</button>
    </dialog>`;
  }

  bind() {
    for(const [id,icon,label] of [['toggle-camera-grid','grid','Mostrar ou ocultar grade'],['fit-camera-grid','fit','Ativar ou desativar alinhamento automático'],['stop-camera','close','Fechar câmera'],['download-evidence','download','Baixar imagem'],['download-current-evidence','finish','Finalizar'],['next-exam','next','Próxima prova']])iconButton(id,icon,label);
    document.getElementById('accept-exam').addEventListener('click', () => this.accept());
    document.getElementById('retake-exam').addEventListener('click', () => this.resume());
    document.getElementById('next-exam').addEventListener('click', () => this.next());
    document.getElementById('download-current-evidence').addEventListener('click', () => { this.ui._closeCamera(); this.next(); this.ui.setPhase('model'); this.ui._showMessage('Correção finalizada. A evidência está no histórico.', 'success'); });
    document.getElementById('refresh-history').addEventListener('click', () => this.refreshHistory());
    document.getElementById('more-history').addEventListener('click', () => { this.historyLimit += 30; this.refreshHistory(); });
    document.getElementById('close-evidence').addEventListener('click', () => document.getElementById('evidence-dialog').close());
    document.getElementById('download-evidence').addEventListener('click', () => this.download(this.viewed));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.live && !this.pending && !this.saved) {
        this.candidate = null; this.stableCount = 0; this.signature = ''; this.updateActions(); this.hud(null, 'Leitura pausada enquanto a aba está oculta.');
      }
    });
    document.getElementById('toggle-camera-grid').addEventListener('click', () => {
      this.gridVisible = !this.gridVisible; this.app.config.update({review:{showGrid:this.gridVisible}}); this.autoGrid=!!(this.gridVisible && this.app.currentTemplate?.alignment); this.trackGuide();
    });
    document.getElementById('fit-camera-grid').addEventListener('click', () => {
      this.autoGrid = !this.autoGrid; this.gridMatrix=null; this.gridVisible=true; this.app.config.update({review:{showGrid:true}}); this.trackGuide();
    });
    this.gridVisible=!!this.app.config.get('review.showGrid');
    this.refreshIdentity();
    this.refreshHistory();
  }

  refreshIdentity() {
    const mode = this.app.config.get('students.mode');
    document.getElementById('student-panel').hidden = mode === 'none' || !this.pending || !!this.saved;
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
    this.generation++; clearTimeout(this.timer); clearAlignmentReview();
    this.candidate = null; this.pending = null; this.saved = null; this.failedCapture=null;
    this.signature = ''; this.stableCount = 0;
    this.updateActions();
  }

  cameraStarted() {
    this.invalidate(); this.live = true; this.gridMatrix=null; this.autoGrid=false;
    const dimensions = this.app.currentTemplate.alignment ? this.app.camera.dimensions : (this.app.currentTemplate.imageSize || this.app.camera.dimensions);
    this.aspectRatio = dimensions.width / dimensions.height;
    document.getElementById('camera-stage').style.aspectRatio = String(this.aspectRatio);
    document.getElementById('camera-stage').style.setProperty('--camera-aspect', this.aspectRatio);
    document.getElementById('camera-panel').classList.add('exam-live');
    document.getElementById('live-hud').hidden = true;
    document.getElementById('camera-stage').hidden = false;
    document.getElementById('camera-panel').hidden = false;
    document.getElementById('live-state').textContent=this.app.currentTemplate.alignment?'Inclua as quatro referências e toque na imagem para fotografar.':'Mantenha o mesmo enquadramento do modelo e toque na imagem para fotografar.';
    document.getElementById('exam-preview').hidden = true;
    document.getElementById('results-panel').replaceChildren();
    document.getElementById('scan-status').textContent = this.app.currentTemplate.alignment ? 'Mostre os quatro blocos, toque para fotografar e confira a correção.' : 'Modelo sem referências: mantenha a mesma posição da imagem cadastrada e toque para fotografar.';
    document.getElementById('toggle-camera-grid').hidden=false; document.getElementById('fit-camera-grid').hidden=false;
    document.getElementById('fit-camera-grid').disabled=!this.app.currentTemplate.alignment;
    this.autoGrid=!!(this.gridVisible && this.app.currentTemplate.alignment); this.trackGuide(); this.updateActions();
  }

  stop() {
    this.live = false; this.autoGrid=false; clearTimeout(this.guideTimer); this.generation++; clearTimeout(this.timer);
    if (!this.pending && !this.saved) this.candidate = null;
    document.getElementById('camera-panel').classList.remove('exam-live');
    document.getElementById('camera-stage').style.aspectRatio = '';
    document.getElementById('live-hud').hidden = true;
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

  hud(candidate, message) {
    document.getElementById('live-grade').textContent = candidate ? `Nota ${format(candidate.grade)} / ${format(candidate.gradeScale)}` : 'Enquadre a prova';
    document.getElementById('live-points').textContent = candidate ? `${format(candidate.score.score)} / ${format(candidate.score.total)} pontos` : '';
    document.getElementById('live-state').textContent = candidate?.alignment ? `Folha alinhada (${candidate.alignment.rotation}°) · ${message}` : message;
  }

  trackGuide() {
    clearTimeout(this.guideTimer);
    if (!this.live || this.pending || this.saved || !this.app.camera.isActive) return;
    this.gridMatrix=null;
    if (this.autoGrid && !document.hidden) {
      try {
        const image=this.app.camera.captureFrame({aspectRatio:this.aspectRatio,maxDimension:1600});
        this.gridMatrix=this.app.alignment.align(image,this.app.currentTemplate.alignment,{preview:true}).metadata.matrix;
        document.getElementById('live-state').textContent='Grade alinhada às referências. Toque na imagem para fotografar.';
      } catch(error) { document.getElementById('live-state').textContent=error.message; }
    }
    this.drawGuide();
    if(this.autoGrid)this.guideTimer=setTimeout(()=>this.trackGuide(),500);
  }

  drawGuide() {
    const canvas=document.getElementById('camera-guide'), t=this.app.currentTemplate;
    canvas.width=1200; canvas.height=Math.round(1200/(this.aspectRatio||1));
    const ctx=canvas.getContext('2d');
    document.getElementById('toggle-camera-grid').setAttribute('aria-pressed',String(!!this.gridVisible));
    document.getElementById('fit-camera-grid').setAttribute('aria-pressed',String(!!this.autoGrid));
    if(!this.gridVisible || !t || (t.alignment && !this.gridMatrix))return;
    const positions=this.app.omr.detectBubbles({width:100000,height:100000},t.layout);
    const region=t.region||{shape:'circle',width:t.radius*2,height:t.radius*2};
    const point=(x,y)=>{const p=this.gridMatrix?project(this.gridMatrix,x,y):[x,y];return [p[0]*canvas.width,p[1]*canvas.height];};
    ctx.strokeStyle='#00efcd';ctx.lineWidth=2;ctx.shadowColor='#000';ctx.shadowBlur=2;
    for(const [px,py] of positions){
      const x=px/100000,y=py/100000;ctx.beginPath();
      const circle=region.shape==='circle', count=circle?32:4;
      for(let i=0;i<count;i++){
        const dx=circle?Math.cos(i*2*Math.PI/count):[-1,1,1,-1][i];
        const dy=circle?Math.sin(i*2*Math.PI/count):[-1,-1,1,1][i];
        const p=point(x+dx*region.width/2,y+dy*region.height/2);
        if(i)ctx.lineTo(...p);else ctx.moveTo(...p);
      }ctx.closePath();ctx.stroke();
    }
  }

  async capture() {
    if(this.capturing || this.saving || this.pending || this.saved) return;
    if(!this.app.camera.isActive){document.getElementById('live-state').textContent='Câmera desconectada. Feche e abra a câmera novamente.';return;}
    clearTimeout(this.guideTimer); this.capturing=true; this.generation++; const generation=this.generation;
    let image;
    try {
      image=this.app.camera.captureFrame({aspectRatio:this.aspectRatio,maxDimension:2400});
      document.getElementById('live-state').textContent='Fotografia capturada. Alinhando e lendo…';
      const candidate=await this.analyze(image,'camera');
      if(generation!==this.generation)return;
      candidate.ready=true;this.pending=candidate;this.candidate=candidate;this.showFrozen(candidate);
      document.getElementById('scan-status').textContent='Confira o enquadramento, a nota e o aluno. ✓ aceita e salva a evidência; a seta circular permite repetir a foto.';
    } catch(error) {
      if(generation!==this.generation)return;
      this.failedCapture=image || true;this.ui.setPhase('review');
      document.getElementById('camera-panel').hidden=true;
      if(image){const c=document.getElementById('exam-preview');c.width=image.width;c.height=image.height;c.hidden=false;c.getContext('2d').putImageData(image,0,0);this.ui._sizeCanvas(c);}
      document.getElementById('scan-status').textContent=`Não foi possível alinhar esta fotografia: ${error.message} Fotografe novamente com os quatro blocos maiores e nítidos.`;
    } finally {this.capturing=false;this.updateActions();}
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
    this.ui.setPhase('review');
    showAlignmentReview(candidate);
    document.getElementById('camera-panel').hidden=true;
    document.getElementById('review-grade').textContent=`Nota ${format(candidate.grade)} / ${format(candidate.gradeScale)} · ${format(candidate.score.score)} / ${format(candidate.score.total)} pontos`;
    document.getElementById('review-grade').hidden=false;
    this.ui._renderResults(candidate.score, candidate.answers);
    document.getElementById('step3').scrollIntoView({block:'start'});
  }

  resume() {
    if(this.saving)return;
    this.invalidate();this.ui.setPhase('capture');
    document.getElementById('exam-preview').hidden=true;
    document.getElementById('results-panel').replaceChildren();
    document.getElementById('scan-status').textContent='Fotografe novamente ou escolha outro arquivo.';
    if(this.app.camera.isActive)this.cameraStarted();
    this.updateActions();
  }

  async accept() {
    if (this.saving || this.saved) return;
    const candidate = this.pending;
    if (!candidate?.ready) return;
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
      this.saved = record; this.ui.setPhase('saved');
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
    const ids = ['student-name', 'student-select', 'open-settings', 'template-select', 'delete-template', 'edit-template', 'save-template', 'exam-file', 'template-file', 'exam-camera', 'template-camera', 'stop-camera', 'new-sheet', 'show-sheets', 'back-models', 'approve-model'];
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
    this.ui.setPhase('capture');
    if (this.app.camera.isActive) this.cameraStarted();
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
    this.refreshIdentity();
    const active = !!(this.pending || this.saved || this.failedCapture);
    document.getElementById('review-actions').hidden = !active;
    document.getElementById('review-grade').hidden=!(this.pending || this.saved);
    const accept = document.getElementById('accept-exam');
    accept.hidden = !!this.saved || !this.pending; accept.disabled = this.saving || !this.pending?.ready;
    iconButton('accept-exam','check',this.saving ? 'Salvando nota e evidência…' : 'Aceitar e salvar evidência');
    document.getElementById('retake-exam').hidden = (!this.pending && !this.failedCapture) || !!this.saved;
    iconButton('retake-exam','retry',this.app.camera.isActive?'Fotografar novamente':'Escolher outro arquivo');
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
      this.viewed = record; this.downloadData={id:record.id,blob:this.evidenceBlob(evidence)}; document.getElementById('evidence-image').src = evidence;
      document.getElementById('evidence-dialog').showModal();
    } catch (error) { this.ui._showMessage(error.message, 'error'); }
  }

  evidenceBlob(data) {
    if(!data)throw new Error('Imagem não encontrada');
    const [header,encoded]=data.split(',');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    return new Blob([bytes],{type:header.match(/data:([^;]+)/)[1]});
  }

  async download(record) {
    if (!record) return;
    try {
      const blob=this.downloadData?.id===record.id?this.downloadData.blob:this.evidenceBlob(await this.app.storage.getEvidence(record.id));
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      const student = (record.student?.name || 'sem-nome').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70);
      link.download = `MarkScan-${student}-${record.id}.jpg`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(link.href),60000);
    } catch (error) { this.ui._showMessage(error.message, 'error'); }
  }
}
