/** A review receipt rendered from the exact accepted frame, not the next video frame. */
export function createEvidence(image, record, original = null) {
  const width = Math.max(900, image.width);
  const scale = width / image.width;
  const pictureHeight = Math.round(image.height * scale);
  const columns = 3, rowHeight = 30;
  const detailHeight = Math.ceil(record.score.details.length / columns) * rowHeight;
  const headerHeight = 210, footerHeight = detailHeight + 80;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = headerHeight + pictureHeight + footerHeight + (original ? Math.round(original.height * width / original.width) + 50 : 0);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#18243a'; ctx.font = 'bold 26px Arial';
  ctx.fillText('MarkScan · Evidência da correção', 24, 38);
  ctx.font = '20px Arial';
  ctx.fillText(`Aluno: ${record.student?.name || 'Sem identificação'}${record.student?.enrollment ? ` · Matrícula: ${record.student.enrollment}` : ''}`, 24, 72, width - 48);
  ctx.fillText(`Gabarito: ${record.templateDescription}`, 24, 103, width - 48);
  ctx.font = 'bold 26px Arial';
  ctx.fillText(`Nota: ${record.grade} / ${record.gradeScale}   ·   ${record.score.score} / ${record.score.total} pontos`, 24, 140, width - 48);
  ctx.font = '16px Arial';
  ctx.fillText(`Captura: ${new Date(record.capturedAt).toLocaleString('pt-BR')} · Aceite: ${new Date(record.acceptedAt).toLocaleString('pt-BR')}`, 24, 171, width - 48);
  ctx.fillText(`Registro: ${record.id}`, 24, 194, width - 48);
  const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
  source.getContext('2d').putImageData(image, 0, 0);
  ctx.drawImage(source, 0, headerHeight, width, pictureHeight);
  const baseY = headerHeight + pictureHeight + 32;
  ctx.fillStyle = '#18243a'; ctx.font = 'bold 18px Arial';
  ctx.fillText('Questão · resposta lida / gabarito · pontos', 24, baseY);
  ctx.font = '16px Arial';
  record.score.details.forEach((detail, i) => {
    const x = 24 + (i % columns) * ((width - 48) / columns);
    const y = baseY + 32 + Math.floor(i / columns) * rowHeight;
    ctx.fillText(`${detail.question}: ${detail.studentAnswer || '—'} / ${detail.correctAnswer} · ${detail.points} pts`, x, y);
  });
  if (original) {
    const originalY = headerHeight + pictureHeight + footerHeight;
    ctx.fillStyle = '#18243a'; ctx.font = 'bold 18px Arial';
    ctx.fillText('Quadro original da câmera / arquivo, antes do alinhamento', 24, originalY + 30);
    const raw = document.createElement('canvas'); raw.width = original.width; raw.height = original.height;
    raw.getContext('2d').putImageData(original, 0, 0);
    ctx.drawImage(raw, 0, originalY + 50, width, original.height * width / original.width);
  }
  return canvas.toDataURL('image/jpeg', .92);
}
