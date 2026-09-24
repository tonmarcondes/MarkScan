/** Persistência dos gabaritos, incluindo posições e respostas reais. */
export default class TemplateRegistry {
  constructor(storage) { this.storage = storage; }
  async registerTemplate(id, url, description, analysis = {}) {
    const template = { id, url, description, ...analysis, createdAt: new Date().toISOString() };
    await this.storage.save(id, template);
    return template;
  }
  async getTemplate(id) {
    const value = await this.storage.load(id);
    return typeof value === 'string' ? JSON.parse(value) : value;
  }
  async getAllTemplates() {
    const keys = await this.storage.listKeys();
    return (await Promise.all(keys.map(id => this.getTemplate(id)))).filter(Boolean);
  }
  async removeTemplate(id) { await this.storage.delete(id); }
  async updateTemplate(id, updates) {
    const template = await this.getTemplate(id);
    if (!template) throw new Error('Gabarito não encontrado');
    const updated = { ...template, ...updates, id };
    await this.storage.save(id, updated);
    return updated;
  }
}
