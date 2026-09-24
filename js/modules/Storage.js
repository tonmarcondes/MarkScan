/**
 * Storage Module - Gerenciamento de armazenamento local
 * 
 * Wrapper para IndexedDB/localStorage para persistência de dados
 * 
 * Funcionalidades:
 * - Salvar templates/configurações
 * - Carregar dados salvos
 * - Excluir dados
 * - Listar todos os itens
 */

export class Storage {
  constructor(dbName = 'OMRScannerDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.useIndexedDB = typeof window !== 'undefined' && 
                      typeof window.indexedDB !== 'undefined';
    
    if (this.useIndexedDB) {
      this.ready = this._initIndexedDB().catch(error => {
        console.warn('IndexedDB indisponível:', error);
        this.useIndexedDB = false;
      });
    } else {
      // Fallback para localStorage
      console.warn('IndexedDB não disponível, usando localStorage como fallback');
    }
  }

  /**
   * Inicializa o IndexedDB
   * @returns {Promise<void>}
   */
  _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      
      request.onerror = (event) => {
        reject(new Error(`Erro ao abrir IndexedDB: ${event.target.error}`));
      };
    });
  }

  /**
   * Salva um item no armazenamento
   * @param {string} key - Chave do item
   * @param {*} value - Valor a ser salvo (será convertido para string se não for objeto)
   * @returns {Promise<void>}
   */
  async save(key, value) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._saveIndexedDB(key, value, 'templates');
    } else {
      // localStorage fallback
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(`templates:${key}`, stringValue);
    }
  }

  /**
   * Carrega um item do armazenamento
   * @param {string} key - Chave do item
   * @returns {Promise<*>} Valor armazenado ou null se não existir
   */
  async load(key) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._loadIndexedDB(key, 'templates');
    } else {
      // localStorage fallback
      const value = localStorage.getItem(`templates:${key}`);
      return value ? JSON.parse(value) : null;
    }
  }

  /**
   * Remove um item do armazenamento
   * @param {string} key - Chave do item a remover
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._deleteIndexedDB(key, 'templates');
    } else {
      // localStorage fallback
      localStorage.removeItem(`templates:${key}`);
    }
  }

  /**
   * Lista todas as chaves de um tipo específico
   * @param {string} storeName - Nome da store ('templates', 'config', 'history')
   * @returns {Promise<Array<string>>} Lista de chaves
   */
  async listKeys(storeName = 'templates') {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._listKeysIndexedDB(storeName);
    } else {
      // localStorage fallback - retorna todas as chaves com prefixo
      const prefix = storeName + ':';
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      }
      return keys;
    }
  }

  /**
   * Limpa todo o armazenamento (usar com cuidado!)
   * @returns {Promise<void>}
   */
  async clear() {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._clearIndexedDB();
    } else {
      // localStorage fallback
      localStorage.clear();
    }
  }

  // Métodos privados para IndexedDB
  
  _saveIndexedDB(key, value, storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item = typeof value === 'string' ? 
        { id: key, value: value, type: 'string' } : 
        { id: key, ...value, type: 'object' };
      
      if (store.keyPath === 'key') item.key = key;
      const request = store.put(item);
      
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('Transação cancelada'));
      request.onerror = () => reject(new Error(`Erro ao salvar em IndexedDB: ${request.error}`));
    });
  }
  
  _loadIndexedDB(key, storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        if (result.type === 'string') {
          resolve(result.value);
        } else {
          // Remove os campos de metadados
          const { type, ...data } = result;
          resolve(data);
        }
      };
      
      request.onerror = () => reject(new Error(`Erro ao carregar do IndexedDB: ${request.error}`));
    });
  }
  
  _deleteIndexedDB(key, storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('Transação cancelada'));
      request.onerror = () => reject(new Error(`Erro ao deletar do IndexedDB: ${request.error}`));
    });
  }
  
  _listKeysIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Erro ao listar chaves do IndexedDB: ${request.error}`));
    });
  }
  
  _clearIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction(Array.from(this.db.objectStoreNames), 'readwrite');
      Array.from(this.db.objectStoreNames).forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Erro ao limpar IndexedDB: ${transaction.error}`));
    });
  }
  
  /**
   * Salva configuração genérica
   * @param {string} key - Chave da configuração
   * @param {*} value - Valor da configuração
   * @returns {Promise<void>}
   */
  async saveConfig(key, value) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._saveIndexedDB(key, value, 'config');
    } else {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(`config:${key}`, stringValue);
    }
  }
  
  /**
   * Carrega configuração genérica
   * @param {string} key - Chave da configuração
   * @returns {Promise<*>} Valor da configuração ou null
   */
  async loadConfig(key) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._loadIndexedDB(key, 'config');
    } else {
      const value = localStorage.getItem(`config:${key}`);
      return value ? JSON.parse(value) : null;
    }
  }
  
  /**
   * Adiciona ao histórico
   * @param {object} entry - Entrada para adicionar ao histórico
   * @returns {Promise<number>} ID da entrada adicionada
   */
  async addToHistory(entry) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._addToHistoryIndexedDB(entry);
    } else {
      // localStorage fallback
      const historyKey = 'history';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const newEntry = { ...entry, id: Date.now(), timestamp: new Date().toISOString() };
      history.push(newEntry);
      localStorage.setItem(historyKey, JSON.stringify(history));
      return newEntry.id;
    }
  }
  
  _addToHistoryIndexedDB(entry) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const newEntry = { ...entry, timestamp: new Date().toISOString() };
      const request = store.add(newEntry);
      
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || new Error('Transação cancelada'));
      request.onerror = () => reject(new Error(`Erro ao adicionar ao histórico: ${request.error}`));
    });
  }
  
  /** Atomically commit grade + evidence. A quota failure cannot leave a grade without its image. */
  async saveAcceptedResult(record, evidence) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['history', 'config'], 'readwrite');
        transaction.objectStore('history').add(record);
        transaction.objectStore('config').put({ key: `evidence:${record.id}`, id: `evidence:${record.id}`, value: evidence, type: 'string' });
        transaction.oncomplete = () => resolve(record.id);
        transaction.onabort = () => reject(transaction.error || new Error('Transação cancelada'));
        transaction.onerror = () => reject(transaction.error || new Error('Erro ao salvar a correção'));
      });
    }
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    if (history.some(item => item.id === record.id)) throw new Error('Esta correção já foi salva');
    history.push({ ...record, evidence });
    localStorage.setItem('history', JSON.stringify(history));
    return record.id;
  }

  async getEvidence(id) {
    await this.ready;
    if (this.useIndexedDB && this.db) return this.loadConfig(`evidence:${id}`);
    return JSON.parse(localStorage.getItem('history') || '[]').find(record => record.id === id)?.evidence || null;
  }

  /**
   * Obtém o histórico
   * @param {number} limit - Número máximo de entradas (opcional)
   * @returns {Promise<Array>} Lista de entradas do histórico
   */
  async getHistory(limit) {
    await this.ready;
    if (this.useIndexedDB && this.db) {
      return this._getHistoryIndexedDB(limit);
    } else {
      // localStorage fallback
      const history = JSON.parse(localStorage.getItem('history') || '[]').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return limit ? history.slice(0, limit) : history;
    }
  }
  
  _getHistoryIndexedDB(limit) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não inicializado'));
        return;
      }
      
      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result.sort((a, b) => (b.acceptedAt || b.timestamp).localeCompare(a.acceptedAt || a.timestamp));
        resolve(limit ? records.slice(0, limit) : records);
      };
      
      request.onerror = () => reject(new Error(`Erro ao obter histórico: ${request.error}`));
    });
  }
}

export default Storage;