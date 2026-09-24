/**
 * Módulo Manager - Gerenciador de Módulos
 * 
 * Permite carregar e gerenciar módulos ES6
 */
class ModuleManager {
  constructor() {
    this.modules = new Map();
  }

  /**
   * Carrega um módulo dinamicamente
   * @param {string} moduleId - ID do módulo
   * @returns {Promise<Object>} Módulo carregado
   */
  load(moduleId) {
    if (this.modules.has(moduleId)) {
      return this.modules.get(moduleId);
    }

    const module = import(`./modules/${moduleId}.js`);
    this.modules.set(moduleId, module);
    return module;
  }
}

export default ModuleManager;