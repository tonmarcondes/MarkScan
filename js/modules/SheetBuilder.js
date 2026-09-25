import { solidDefinition, solidSVG } from './SolidReferences.js';
const WIDTH = 840, HEIGHT = 1188, MARKER_SIZE = 56;
const WORDS = [[1, 0, 0, 0, 0], [1, 0, 1, 1, 1], [0, 1, 0, 0, 1], [0, 1, 1, 1, 0]];
const escapeXML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const bitsFor = id => Array.from({ length: 5 }, (_, row) => WORDS[(id >> (2 * (4 - row))) & 3]);

function unambiguous(id) {
  let bits = bitsFor(id), valid = 0;
  for (let turn = 0; turn < 4; turn++) {
    if (bits.every(row => WORDS.some(word => word.every((bit, col) => bit === row[col])))) valid++;
    bits = bits[0].map((_, row) => bits.map((_, col) => bits[4 - col][row]));
  }
  return valid === 1;
}

export function markerSVG(id, cx, cy, size) {
  const unit = size / 7, left = cx - size / 2, top = cy - size / 2;
  let svg = `<rect x="${left - unit}" y="${top - unit}" width="${size + unit * 2}" height="${size + unit * 2}" fill="white"/><rect x="${left}" y="${top}" width="${size}" height="${size}" fill="black"/>`;
  bitsFor(id).forEach((row, y) => row.forEach((bit, x) => {
    if (bit) svg += `<rect x="${left + (x + 1) * unit}" y="${top + (y + 1) * unit}" width="${unit}" height="${unit}" fill="white"/>`;
  }));
  return svg;
}

export function buildTemplate(name, settings, answers) {
  const { rows, cols, shape } = settings;
  if (!name.trim() || answers.length !== rows || answers.some(value => !Number.isInteger(value) || value < 0 || value >= cols)) throw new Error(`Informe ${rows} respostas entre A e ${String.fromCharCode(64 + cols)}.`);
  const ids = [];
  while (ids.length < 4) {
    const id = crypto.getRandomValues(new Uint32Array(1))[0] % 1024;
    if (!ids.includes(id) && unambiguous(id)) ids.push(id);
  }
  const blocks = Math.ceil(rows / 25), blockWidth = 720 / blocks;
  const spacing = (blockWidth - 36) / cols;
  const markWidth = Math.min(20, spacing * .65), markHeight = shape === 'rectangle' ? markWidth * .65 : markWidth;
  const positions = [];
  for (let question = 0; question < rows; question++) {
    const block = Math.floor(question / 25), row = question % 25;
    for (let option = 0; option < cols; option++) positions.push([(60 + block * blockWidth + 36 + spacing * (option + .5)) / WIDTH, (258 + row * 32) / HEIGHT]);
  }
  return { id: `template-${crypto.randomUUID()}`, description: name.trim(), answers,
    imageSize: { width: WIDTH, height: HEIGHT },
    layout: { rows, cols, left: positions[0][0], top: positions[0][1], right: positions[positions.length - 1][0], bottom: positions[positions.length - 1][1], positions },
    region: { shape, width: Math.min(settings.width, markWidth * .55) / WIDTH, height: Math.min(shape === 'rectangle' ? settings.height : settings.width, markHeight * .55) / HEIGHT },
    threshold: settings.threshold,
    generated: { version: 1, markWidth, markHeight },
    alignment: settings.referenceStyle === 'coded' ? { type: 'aruco-v1', width: WIDTH, height: HEIGHT, markerSize: MARKER_SIZE,
      markers: [[52, 52], [788, 52], [788, 1136], [52, 1136]].map(([x, y], i) => ({ id: ids[i], x, y })) } : solidDefinition(WIDTH, HEIGHT, settings.referenceThickness || 5)
  };
}

export function sheetSVG(template, key = false) {
  if (!template.generated) {
    const {width,height}=template.imageSize || {width:840,height:1188};
    const layout=template.layout,region=template.region || {shape:'circle',width:template.radius*2,height:template.radius*2*width/height};
    const positions=layout.positions || Array.from({length:layout.rows*layout.cols},(_,i)=>[layout.left+(layout.right-layout.left)*(i%layout.cols)/(layout.cols-1),layout.rows===1?layout.top:layout.top+(layout.bottom-layout.top)*Math.floor(i/layout.cols)/(layout.rows-1)]);
    const w=region.width*width*1.8,h=region.height*height*1.8;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>`;
    positions.forEach(([nx,ny],i)=>{
      const x=nx*width,y=ny*height,fill=key && template.answers[Math.floor(i/layout.cols)]===i%layout.cols?'black':'white';
      svg+=region.shape==='circle'?`<ellipse cx="${x}" cy="${y}" rx="${w/2}" ry="${h/2}" fill="${fill}" stroke="black" stroke-width="1"/>`:`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="${fill}" stroke="black" stroke-width="1"/>`;
      svg+=`<text x="${x}" y="${y-h/2-4}" text-anchor="middle" font-family="Arial" font-size="10">${Math.floor(i/layout.cols)+1}${String.fromCharCode(65+i%layout.cols)}</text>`;
    });
    for(const marker of template.alignment?.markers || [])svg+=template.alignment.type==='solid-v1'?solidSVG(marker):markerSVG(marker.id,marker.x,marker.y,template.alignment.markerSize);
    return svg+'</svg>';
  }
  const { width, height, markers, markerSize } = template.alignment;
  const { markWidth, markHeight } = template.generated;
  const { positions, cols, rows } = template.layout;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,sans-serif" fill="black">
    <text x="420" y="65" text-anchor="middle" font-size="19" font-weight="bold">MarkScan · ${key ? 'GABARITO DO PROFESSOR' : 'FOLHA DO ALUNO'}</text>
    <text x="60" y="126" font-size="24" textLength="${Math.min(720, template.description.length * 13)}" lengthAdjust="spacingAndGlyphs">${escapeXML(template.description)}</text>
    <text x="60" y="168" font-size="16">Nome: _______________________________________________________</text>
    <text x="60" y="199" font-size="14">Turma: ___________________  Data: ____ / ____ / ______</text>
    <text x="60" y="224" font-size="12">Preencha uma alternativa por questão. Não risque nem corte as quatro marcas dos cantos.</text>`;
  for (let question = 0; question < rows; question++) {
    const start = positions[question * cols], y = start[1] * height;
    svg += `<text x="${start[0] * width - 22}" y="${y + 4}" text-anchor="end" font-size="12">${question + 1}</text>`;
    for (let option = 0; option < cols; option++) {
      const [nx, ny] = positions[question * cols + option], x = nx * width, cy = ny * height;
      const fill = key && template.answers[question] === option ? 'black' : 'white';
      if (question % 25 === 0) svg += `<text x="${x}" y="${cy - 16}" font-size="11" text-anchor="middle">${String.fromCharCode(65 + option)}</text>`;
      svg += template.region.shape === 'circle' ? `<ellipse cx="${x}" cy="${cy}" rx="${markWidth / 2}" ry="${markHeight / 2}" fill="${fill}" stroke="black" stroke-width="1.4"/>` :
        `<rect x="${x - markWidth / 2}" y="${cy - markHeight / 2}" width="${markWidth}" height="${markHeight}" fill="${fill}" stroke="black" stroke-width="1.4"/>`;
    }
  }
  svg += `<text x="420" y="1072" text-anchor="middle" font-size="12">${rows} questões · ${cols} alternativas · Referências ${markers.map(marker => marker.id).join(' / ')}</text></g>`;
  for (const marker of markers) svg += template.alignment.type === 'solid-v1' ? solidSVG(marker) : markerSVG(marker.id, marker.x, marker.y, markerSize);
  return svg + '</svg>';
}

export async function svgImage(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return { image: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), url: canvas.toDataURL('image/png') };
  } finally { URL.revokeObjectURL(url); }
}

export default class SheetBuilder {
  constructor(app, ui) { this.app = app; this.ui = ui; }
  markup() {
    return `<dialog id="sheet-dialog" aria-labelledby="sheet-title"><form id="sheet-form">
      <div class="settings-heading"><h2 id="sheet-title">Criar folha com referências</h2><button type="button" id="close-sheet" class="btn secondary" aria-label="Fechar criador">✕</button></div>
      <p id="sheet-summary"></p><p>Quantidade de questões, alternativas e formato são definidos na engrenagem. As áreas de leitura serão cadastradas automaticamente.</p>
      <label class="roster-label">Nome do gabarito<input id="sheet-name" maxlength="100" required placeholder="Matemática · Turma A"></label>
      <label class="roster-label">Respostas corretas, na ordem das questões<textarea id="sheet-answers" rows="4" required placeholder="A B C D A B C D A B"></textarea></label>
      <p id="sheet-error" role="alert"></p><button id="create-sheet" class="btn primary">Criar e salvar gabarito</button>
    </form></dialog>
    <dialog id="print-sheet-dialog" aria-labelledby="print-sheet-title"><div class="settings-heading"><h2 id="print-sheet-title">Folhas com referências</h2><button id="close-print-sheet" class="btn secondary" aria-label="Fechar folhas">✕</button></div>
      <p id="print-description">Imprima a folha do aluno para as provas. O gabarito do professor contém as respostas: mantenha-o separado. Preserve as quatro marcas e use o mesmo modelo nas cópias.</p>
      <div class="review-actions"><button id="view-key" class="btn secondary">Ver gabarito preenchido</button><button id="view-blank" class="btn secondary">Ver gabarito em branco</button></div>
      <div class="review-actions"><button id="share-key" class="btn primary">Compartilhar gabarito</button><button id="share-blank" class="btn primary">Compartilhar em branco</button></div>
      <details><summary>Imprimir ou baixar</summary><div class="review-actions"><button id="print-student" class="btn primary">Imprimir folha do aluno</button><button id="download-student" class="btn secondary">Baixar folha do aluno</button><button id="print-key" class="btn secondary">Imprimir gabarito</button><button id="download-key" class="btn secondary">Baixar gabarito</button></div>
      </details><p id="sheet-kind" role="status"></p><div id="sheet-preview"></div><p>Distribua a versão em branco aos alunos. Depois selecione este mesmo modelo para corrigir as cópias preenchidas.</p><button id="approve-sheet" class="btn primary">Aprovar modelo e corrigir provas</button>
    </dialog>`;
  }
  bind() {
    document.getElementById('new-sheet').addEventListener('click', () => {
      this.editing = null;
      document.getElementById('sheet-form').reset();
      document.getElementById('sheet-title').textContent = 'Criar folha com referências';
      document.getElementById('create-sheet').textContent = 'Criar e salvar gabarito';
      const settings = this.app.config.get('calibration');
      document.getElementById('sheet-summary').textContent = `${settings.rows} questões · ${settings.cols} alternativas · quatro blocos sólidos de referência`;
      document.getElementById('sheet-error').textContent = '';
      document.getElementById('sheet-dialog').showModal();
    });
    document.getElementById('close-sheet').addEventListener('click', () => document.getElementById('sheet-dialog').close());
    document.getElementById('close-print-sheet').addEventListener('click', () => document.getElementById('print-sheet-dialog').close());
    document.getElementById('sheet-form').addEventListener('submit', event => { event.preventDefault(); this.create(); });
    document.getElementById('view-key').onclick=()=>this.preview(true);
    document.getElementById('view-blank').onclick=()=>this.preview(false);
    document.getElementById('share-key').onclick=()=>this.share(true);
    document.getElementById('share-blank').onclick=()=>this.share(false);
    document.getElementById('approve-sheet').onclick=()=>{document.getElementById('print-sheet-dialog').close();this.ui.setPhase('capture');document.getElementById('step3').scrollIntoView({block:'start'});};
    document.getElementById('show-sheets').addEventListener('click', () => this.show());
    for (const key of [false, true]) {
      document.getElementById(key ? 'download-key' : 'download-student').addEventListener('click', () => this.download(key));
      document.getElementById(key ? 'print-key' : 'print-student').addEventListener('click', () => this.print(key));
    }
  }
  edit(template) {
    this.editing = template;
    document.getElementById('sheet-title').textContent = 'Editar modelo';
    document.getElementById('create-sheet').textContent = 'Salvar alterações';
    document.getElementById('sheet-name').value = template.description;
    document.getElementById('sheet-answers').value = template.answers.map(answer => String.fromCharCode(65 + answer)).join(' ');
    document.getElementById('sheet-summary').textContent = `Editar respostas: ${template.layout.rows} questões · ${template.layout.cols} alternativas. As referências e a folha impressa serão mantidas.`;
    document.getElementById('sheet-error').textContent = '';
    document.getElementById('sheet-dialog').showModal();
  }
  async create() {
    const button = document.getElementById('create-sheet'); if (button.disabled) return;
    button.disabled = true;
    try {
      const settings = this.editing ? { ...this.app.config.get('calibration'), rows: this.editing.layout.rows, cols: this.editing.layout.cols } : this.app.config.get('calibration');
      const answers = document.getElementById('sheet-answers').value.toUpperCase().replace(/[\s,;|]+/g, '').split('').map(letter => letter.charCodeAt(0) - 65);
      let template = buildTemplate(document.getElementById('sheet-name').value, settings, answers);
      if (this.editing) template = { ...this.editing, description: template.description, answers };
      delete template.url;
      const rendered = await svgImage(sheetSVG(template, true));
      // Validate the printed code and the generated answer regions before persisting.
      const aligned = this.app.alignment.align(rendered.image, template.alignment);
      Object.assign(this.app.omr.options, { optionsPerQuestion: settings.cols, sampleShape: template.region.shape,
        sampleWidth: template.region.width * template.imageSize.width, sampleHeight: template.region.height * template.imageSize.height, threshold: template.threshold });
      const read = this.app.omr.processOMR(aligned.image, this.app.omr.detectBubbles(aligned.image, template.layout), settings.rows);
      if (read.some((answer, i) => answer !== answers[i])) throw new Error('Não foi possível validar as áreas de leitura. Ajuste o formato/tamanho na engrenagem.');
      await this.app.template.registerTemplate(template.id, rendered.url, template.description, template);
      await this.app._loadTemplates(); document.getElementById('template-select').value = template.id;
      await this.ui._applyTemplate(); document.getElementById('sheet-dialog').close();
      await this.show();
    } catch (error) { document.getElementById('sheet-error').textContent = error.message; }
    finally { button.disabled = false; }
  }
  async show() {
    try {
      const id = document.getElementById('template-select').value;
      const template = await this.app.template.getTemplate(id);
      if (!template?.layout) throw new Error('Selecione um gabarito criado com referências, ou crie uma nova folha.');
      this.template = template;
      document.getElementById('print-description').textContent=template.generated ? 'Confira o modelo antes de avançar. As duas versões usam exatamente as mesmas posições e referências.' : 'As versões abaixo são recriadas apenas com as áreas de resposta mapeadas, sem enunciados nem preenchimentos da imagem original. Confira o tamanho e a posição antes de usar na prova.';
      this.files={};this.svgs={};
      for(const key of [false,true]) {
        const svg=sheetSVG(template,key);this.svgs[key]=svg;
        const rendered=await svgImage(svg);const blob=await (await fetch(rendered.url)).blob();
        this.files[key]=new File([blob],`MarkScan-${key?'gabarito':'em-branco'}-${template.id}.png`,{type:'image/png'});
      }
      this.preview(true);
      document.getElementById('print-sheet-dialog').showModal();
    } catch (error) { this.ui._showMessage(error.message, 'error'); }
  }
  preview(key) {
    this.previewKey=key;document.getElementById('sheet-preview').innerHTML=this.svgs[key];
    document.getElementById('sheet-kind').textContent=key?'Gabarito preenchido · uso do professor':'Gabarito em branco · distribuir aos alunos';
    document.getElementById('view-key').setAttribute('aria-pressed',String(key));
    document.getElementById('view-blank').setAttribute('aria-pressed',String(!key));
  }
  async share(key) {
    const file=this.files?.[key];if(!file)return;
    try {
      if(navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:key?'Gabarito preenchido':'Gabarito em branco'});
      else { this.download(key);this.ui._showMessage('Imagem baixada. Este navegador não oferece compartilhamento de arquivos.','info'); }
    }catch(error){if(error.name!=='AbortError')this.ui._showMessage(`Não foi possível compartilhar: ${error.message}`,'error');}
  }
  download(key) {
    const file=this.files?.[key];if(!file)return;
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  print(key) {
    const tab = window.open('', '_blank');
    if (!tab) { this.ui._showMessage('Permita a janela de impressão ou baixe a folha em PNG.', 'info'); return; }
    tab.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>MarkScan · ${key ? 'Gabarito' : 'Folha do aluno'}</title><style>@page{size:A4 portrait;margin:10mm}body{margin:0}svg{width:190mm;height:auto;display:block;margin:auto}button{margin:12px;padding:12px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Imprimir / Salvar como PDF</button>${sheetSVG(this.template, key)}</body></html>`);
    tab.document.close(); tab.focus();
    tab.addEventListener('load', () => tab.print(), { once: true });
  }
}
