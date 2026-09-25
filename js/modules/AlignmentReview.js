/** Visual explanation of the exact transform used for grading; never modifies the candidate. */
export function alignmentMetrics(alignment) {
  const {quad,sourceSize,rotation}=alignment;
  const points=quad.map(([x,y])=>[x*sourceSize.width,y*sourceSize.height]);
  const edges=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%4][0],p[1]-points[(i+1)%4][1]));
  const angleDeviation=Math.max(...points.map((p,i)=>{
    const previous=points[(i+3)%4],next=points[(i+1)%4];
    const a=[previous[0]-p[0],previous[1]-p[1]],b=[next[0]-p[0],next[1]-p[1]];
    const cosine=(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b));
    return Math.abs(Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI-90);
  }));
  const difference=(a,b)=>100*Math.abs(a-b)/Math.max(a,b);
  return { angleDeviation, rotation: rotation>180?rotation-360:rotation,
    edgeDifference: Math.max(difference(edges[0],edges[2]),difference(edges[1],edges[3])) };
}

export function alignmentReviewMarkup() {
  return `<section id="alignment-summary" hidden aria-label="Enquadramento automático">
    <h3>Enquadramento corrigido automaticamente</h3>
    <div class="alignment-metrics"><span>Rotação da foto <strong id="alignment-rotation"></strong></span><span>Diferença entre bordas opostas <strong id="alignment-perspective"></strong></span><span>Desvio dos ângulos de 90° <strong id="alignment-angles"></strong></span></div>
    <details><summary>O que esses números mostram?</summary><p>A rotação indica a orientação da folha na fotografia; a imagem corrigida volta à orientação do modelo. A diferença compara os comprimentos das bordas superior/inferior e esquerda/direita e mostra o maior valor: diferença dividida pela maior borda do par. O desvio dos ângulos mostra quanto o canto mais inclinado se afasta de 90°. São medidas da geometria fotografada, não da confiança da nota, e não medem toda forma de distorção.</p></details>
  </section>
  <div id="alignment-comparison" class="alignment-comparison">
    <figure id="original-figure" hidden><figcaption>Antes · enquadramento detectado</figcaption><canvas id="original-preview" role="img" aria-label="Foto original com contorno da folha e quatro cantos detectados"></canvas><p>Os quatro pontos indicam os cantos detectados. São indicadores, não alças de edição.</p></figure>
    <figure id="corrected-figure"><figcaption id="corrected-caption" hidden>Depois · imagem usada na correção</figcaption><div class="canvas-viewport"><canvas id="exam-preview" hidden role="img" aria-label="Imagem da prova usada para calcular a nota"></canvas></div></figure>
  </div>`;
}

export function clearAlignmentReview() {
  for(const id of ['alignment-summary','original-figure','corrected-caption'])document.getElementById(id).hidden=true;
  document.getElementById('alignment-comparison').classList.remove('has-alignment');
}

export function showAlignmentReview(candidate) {
  clearAlignmentReview();
  if(!candidate.alignment || !candidate.original)return;
  for(const id of ['alignment-summary','original-figure','corrected-caption'])document.getElementById(id).hidden=false;
  document.getElementById('alignment-comparison').classList.add('has-alignment');
  const metrics=alignmentMetrics(candidate.alignment);
  const number=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:1});
  document.getElementById('alignment-rotation').textContent=number(metrics.rotation)+'°';
  document.getElementById('alignment-perspective').textContent=number(metrics.edgeDifference)+'%';
  document.getElementById('alignment-angles').textContent=number(metrics.angleDeviation)+'°';
  const canvas=document.getElementById('original-preview'),ctx=canvas.getContext('2d'),raw=candidate.original;
  canvas.width=raw.width;canvas.height=raw.height;ctx.putImageData(raw,0,0);
  const points=candidate.alignment.quad.map(([x,y])=>[x*raw.width,y*raw.height]);
  const unit=Math.max(raw.width,raw.height)/700;
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  ctx.strokeStyle='#142a3d';ctx.lineWidth=5*unit;ctx.stroke();
  ctx.strokeStyle='#00efcd';ctx.lineWidth=2*unit;ctx.stroke();
  for(const [x,y] of points){ctx.beginPath();ctx.arc(x,y,5*unit,0,Math.PI*2);ctx.fillStyle='#00efcd';ctx.fill();ctx.strokeStyle='#142a3d';ctx.lineWidth=unit;ctx.stroke();}
}
