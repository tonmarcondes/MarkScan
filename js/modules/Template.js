/**
 * Template Module - Registro de gabaritos de prova
 * 
 * Permite:
 * - Registrar novos gabaritos (imagens de perguntas)
 * - Buscar gabaritos pelo nome ou ID
 * - Associar gabarito a uma prova específica
 */

class TemplateRegistry {
  constructor(storageModule) {
    this.storage = storageModule;
    this.templates = new Map(); // templateId -> {id, url, description}
  }

  /**
   * Registra um novo gabarito
   * @param {string} templateId - Identificador único do gabarito
   * @param {string} url - URL da imagem do gabarito
   * @param {string} description - Descrição do gabarito
   * @returns {Promise<Object>} Template registrado
   */
  async registerTemplate(templateId, url, description) {
    const template = {
      id: templateId,
      url: url,
      description: description,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    this.templates.set(templateId, template);
    await this.storage.save(templateId, JSON.stringify(template));
    return template;
  }

  /**
   * Busca um template pelo ID
   * @param {string} templateId - ID do template
   * @returns {Promise<Object|null>} Template encontrado
   */
  async getTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) return null;
    return this.storage.load(templateId);
  }

  /**
   * Busca todos os templates
   * @returns {Promise<Array>} Lista de todos os templates
   */
  async getAllTemplates() {
    const templates = [];
    for (const [id, template] of this.templates.entries()) {
      templates.push({
        id,
        ...template
      });
    }
    return templates;
  }

  /**
   * Remove um template
   * @param {string} templateId - ID do template a remover
   * @returns {Promise<void>}
   */
  async removeTemplate(templateId) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} não encontrado`);
    }
    
    this.templates.delete(templateId);
    await this.storage.delete(templateId);
  }

  /**
   * Atualiza informações de um template
   * @param {string} templateId - ID do template
   * @param {string} updates - Atualizações a aplicar
   * @returns {Promise<Object>} Template atualizado
   */
  async updateTemplate(templateId, updates) {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} não encontrado`);
    }
    
    Object.assign(template, updates);
    await this.storage.save(templateId, JSON.stringify(template));
    return template;
  }
}

export default TemplateRegistry;