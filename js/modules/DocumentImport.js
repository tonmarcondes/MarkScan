/** Local image/PDF page selection and optional crop, approved before mapping/reading. */
export default class DocumentImport {
  constructor(app) { this.app=app; this.serial=0; }
  markup() { return `<dialog id="import-dialog" aria-labelledby="import-title"><div class="settings-heading"><h2 id="import-title">1. Confira a imagem</h2><button id="cancel-import" class="btn secondary" aria-label="Cancelar importação">✕</button></div>
    <label id="pdf-page-field" hidden>Página do PDF <select id="pdf-page"></select></label>
    <p>Use a página inteira ou toque em dois cantos para recortar somente a área necessária. Inclua as quatro referências, se já existirem.</p>
    <canvas id="import-preview" tabindex="0" aria-label="Selecione dois cantos para recortar a imagem"></canvas>
    <p id="import-status" role="status"></p><div class="review-actions"><button id="reset-crop" class="btn secondary">Usar página inteira</button><button id="approve-import" class="btn primary" disabled>Aprovar imagem e continuar</button></div></dialog>`; }
  bind() {
    const dialog=document.getElementById('import-dialog');
    document.getElementById('cancel-import').onclick=()=>this.finish(null);
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.finish(null);});
    dialog.addEventListener('close',()=>{if(!dialog.open && this.resolve)this.finish(null);});
    document.getElementById('pdf-page').onchange=()=>this.renderPage();
    document.getElementById('reset-crop').onclick=()=>{this.crop=[];this.draw();};
    document.getElementById('import-preview').onclick=e=>{
      if(!this.image)return;const b=e.target.getBoundingClientRect();
      if(this.crop.length===2)this.crop=[];
      this.crop.push([Math.max(0,Math.min(this.image.width,Math.round((e.clientX-b.left)/b.width*this.image.width))),Math.max(0,Math.min(this.image.height,Math.round((e.clientY-b.top)/b.height*this.image.height)))]);this.draw();
    };
    document.getElementById('approve-import').onclick=()=>{
      if(!this.image || this.crop.length===1)return;
      let image=this.image;
      if(this.crop.length===2){const [[x,y],[a,b]]=this.crop;const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').putImageData(image,0,0);image=c.getContext('2d').getImageData(Math.min(x,a),Math.min(y,b),Math.abs(x-a),Math.abs(y-b));}
      this.finish(image);
    };
  }
  finish(image) {
    this.serial++;this.loadingTask?.destroy().catch(()=>{});this.loadingTask=null;this.pdf=null;
    const resolve=this.resolve;this.resolve=null;document.getElementById('import-dialog').close();resolve?.(image);
  }
  async open(source) {
    if(this.resolve) return null;
    const result=new Promise(resolve=>{this.resolve=resolve;});
    this.image=null;this.crop=[];this.pdf=null;
    document.getElementById('pdf-page-field').hidden=true;
    document.getElementById('approve-import').disabled=true;
    document.getElementById('import-status').textContent='Carregando…';
    const canvas=document.getElementById('import-preview');canvas.width=1;canvas.height=1;
    document.getElementById('import-dialog').showModal();const serial=++this.serial;
    try {
      if(source instanceof ImageData){this.image=source;this.draw();}
      else if(source.type==='application/pdf' || /\.pdf$/i.test(source.name)) {
        if(source.size>50*1024*1024)throw new Error('Use um PDF de até 50 MB.');
        const pdfjs=await import('../vendor/pdfjs/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/build/pdf.worker.mjs',import.meta.url).href;
        const root=new URL('../vendor/pdfjs/',import.meta.url).href;
        const data=new Uint8Array(await source.arrayBuffer());if(serial!==this.serial)return result;
        const task=pdfjs.getDocument({data,cMapUrl:root+'cmaps/',cMapPacked:true,standardFontDataUrl:root+'standard_fonts/',wasmUrl:root+'wasm/',isEvalSupported:false});
        this.loadingTask=task;
        const pdf=await task.promise;
        if(serial!==this.serial){await task.destroy();return result;}
        this.pdf=pdf;const select=document.getElementById('pdf-page');select.replaceChildren();
        for(let i=1;i<=pdf.numPages;i++)select.add(new Option(`Página ${i} de ${pdf.numPages}`,String(i)));
        document.getElementById('pdf-page-field').hidden=false;await this.renderPage();
      } else {const image=await this.app.ui._loadImage(source);if(serial===this.serial){this.image=image;this.draw();}}
    } catch(error){if(serial===this.serial)document.getElementById('import-status').textContent=error.name==='PasswordException'?'PDF protegido por senha. Importe uma cópia desbloqueada.':`Não foi possível abrir: ${error.message}`;}
    return result;
  }
  async renderPage(){
    const serial=++this.serial;this.image=null;this.crop=[];document.getElementById('approve-import').disabled=true;
    document.getElementById('import-status').textContent='Renderizando página…';
    try {const page=await this.pdf.getPage(Number(document.getElementById('pdf-page').value));const initial=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:2400/Math.max(initial.width,initial.height)});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;
      if(serial!==this.serial)return;
      this.image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);this.draw();
    }catch(error){if(serial===this.serial)document.getElementById('import-status').textContent=`Falha ao renderizar página: ${error.message}`;}
  }
  draw(){
    if(!this.image)return;const canvas=document.getElementById('import-preview');canvas.width=this.image.width;canvas.height=this.image.height;
    const ctx=canvas.getContext('2d');ctx.putImageData(this.image,0,0);let valid=this.crop.length!==1;
    if(this.crop.length){const [x,y]=this.crop[0];const [a,b]=this.crop[1]||[x+6,y+6];ctx.strokeStyle='#e6007e';ctx.lineWidth=Math.max(2,canvas.width/350);ctx.strokeRect(x,y,a-x,b-y);if(this.crop.length===2)valid=Math.abs(a-x)>=50&&Math.abs(b-y)>=50;}
    document.getElementById('approve-import').disabled=!valid;
    document.getElementById('import-status').textContent=this.crop.length===1?'Toque no canto oposto para terminar o recorte.':!valid?'Selecione uma área de pelo menos 50 × 50 pixels.':this.crop.length===2?'Recorte selecionado. Confira antes de aprovar.':'Página inteira selecionada. Confira antes de aprovar.';
  }
}
