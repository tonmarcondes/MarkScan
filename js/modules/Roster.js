/** One student per line: name, or enrollment;name. Never sent to a server. */
export function parseRoster(text) {
  const seen = new Set();
  return text.split(/\r?\n/).map((line, index) => {
    line = line.trim();
    if (!line) return null;
    const separator = line.indexOf(';');
    const name = (separator < 0 ? line : line.slice(separator + 1)).trim();
    const enrollment = separator < 0 ? '' : line.slice(0, separator).trim();
    if (!name || name.length > 120 || enrollment.length > 80) throw new Error(`Confira o aluno na linha ${index + 1} (nome até 120 caracteres).`);
    const id = enrollment || `nome:${name.normalize('NFC').toLocaleLowerCase('pt-BR')}`;
    if (seen.has(id)) throw new Error(`Aluno ou matrícula repetida na linha ${index + 1}. Para nomes iguais, informe matrículas diferentes.`);
    seen.add(id);
    return { id, name, enrollment };
  }).filter(Boolean);
}
