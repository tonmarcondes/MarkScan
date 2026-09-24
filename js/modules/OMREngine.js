/**
 * OMR Engine - Motor de processamento de imagens para leitura de marcações
 * 
 * Responsável por:
 * - Pré-processamento de imagens (conversão para escala de cinza, binarização)
 * - Detecção de bolhas (circulares/ovais) nas áreas de resposta
 * - Determinação da marcação mais escura em cada grupo de opções
 * - Comparação com o gabarito para cálculo de acertos
 */

export class OMR {
  /**
   * Construtor do OMR Engine
   * @param {Object} options - Configurações do motor
   */
  constructor(options = {}) {
    this.options = Object.assign({
      threshold: 128,        // Limiar para binarização (0-255)
      minBubbleSize: 10,     // Tamanho mínimo da bolha em pixels
      maxBubbleSize: 40,     // Tamanho máximo da bolha em pixels
      bubbleSpacing: 45,     // Espaçamento entre opções
      optionsPerQuestion: 4, // Número de opções por questão (A, B, C, D)
      debug: false           // Modo de depuração
    }, options);

    // Cache para evitar recálculos desnecessários
    this.cache = new Map();
  }

  /**
   * Processa uma imagem para extrair as marcações das respostas
   * @param {ImageData} imageData - Dados da imagem a ser processada
   * @param {Array} bubblePositions - Posições das bolhas [[x, y], ...]
   * @param {number} questionsCount - Número total de questões
   * @returns {Array} Respostas detectadas [1, 3, 0, 2, ...] (índices das opções)
   */
  processOMR(imageData, bubblePositions, questionsCount) {
    const { optionsPerQuestion, debug } = this.options;
    const answers = new Array(questionsCount).fill(-1);
    
    // Converte para escala de cinza e aplica limiarização
    const grayData = this._toGrayscale(imageData);
    const binaryData = this._threshold(grayData, this.options.threshold);
    
    // Para cada questão
    for (let question = 0; question < questionsCount; question++) {
      const optionStart = question * optionsPerQuestion;
      const optionEnd = optionStart + optionsPerQuestion;
      
      let maxDarkness = -1;
      let runnerUp = -1;
      let selectedOption = -1;
      
      // Para cada opção da questão
      for (let option = 0; option < optionsPerQuestion; option++) {
        const bubbleIndex = optionStart + option;
        if (bubbleIndex >= bubblePositions.length) break;
        
        const [x, y] = bubblePositions[bubbleIndex];
        const darkness = this._calculateDarkness(binaryData, x, y, Math.max(1, Math.round(this.options.sampleRadius || 5)));
        
        if (darkness > maxDarkness) {
          runnerUp = maxDarkness;
          maxDarkness = darkness;
          selectedOption = option;
        } else {
          runnerUp = Math.max(runnerUp, darkness);
        }
        
        // Debug: marca opção analisada
        if (debug && option === 0) {
          this._markArea(binaryData, x, y, 15, [255, 0, 0]); // Vermelho
        }
      }
      
      answers[question] = maxDarkness < 90 ? -1 :
        (runnerUp >= 90 && maxDarkness - runnerUp < 40 ? -2 : selectedOption);
    }
    
    if (debug) {
      // Converte de volta para imagem e retorna com marcações
      return { answers, debugImage: this._binaryToImageData(binaryData, imageData.width, imageData.height) };
    }
    
    return answers;
  }

  /**
   * Pré-processa a imagem para melhorar a detecção
   * @param {ImageData} imageData - Dados da imagem original
   * @returns {ImageData} Imagem pré-processada
   */
  preprocess(imageData) {
    // Cache baseado em hash simples da imagem
    const hash = this._simpleHash(imageData);
    if (this.cache.has(`preprocess:${hash}`)) {
      return this.cache.get(`preprocess:${hash}`);
    }
    
    let processed = imageData;
    
    // Aplica suavização para reduzir ruído
    processed = this._gaussianBlur(processed, 3);
    
    // Converte para escala de cinza
    processed = this._toGrayscale(processed);
    
    // Realça contraste
    processed = this._enhanceContrast(processed);
    
    this.cache.set(`preprocess:${hash}`, processed);
    return processed;
  }

  /**
   * Detecta automaticamente as posições das bolhas em uma imagem de gabarito
   * @param {ImageData} imageData - Dados da imagem do gabarito
   * @returns {Array} Array de posições [[x, y], ...]
   */
  detectBubbles(imageData, layout) {
    if (!layout) throw new Error('Calibre a grade de respostas primeiro');
    const { rows, cols, left, top, right, bottom } = layout;
    if (layout.positions) {
      if (layout.positions.length !== rows * cols) throw new Error('Quantidade de áreas incompatível com a grade');
      return layout.positions.map(([x, y]) => [Math.round(x * imageData.width), Math.round(y * imageData.height)]);
    }
    const positions = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        positions.push([
          Math.round((left + (right - left) * col / (cols - 1)) * imageData.width),
          Math.round((top + (bottom - top) * row / Math.max(1, rows - 1)) * imageData.height)
        ]);
      }
    }
    return positions;
  }

  /**
   * Compara respostas do aluno com o gabarito e calcula a nota
   * @param {Array} studentAnswers - Respostas do aluno [0, 2, 1, ...] (índices)
   * @param {Array} templateAnswers - Respostas do gabarito [0, 1, 3, ...] (índices)
   * @param {Object} scoringRules - Regras de pontuação {acertos: 1, erros: 0, blank: 0}
   * @returns {Object} Resultado da correção {score, total, percentage, details}
   */
  calculateScore(studentAnswers, templateAnswers, scoringRules = {}) {
    const rules = Object.assign({
      correct: 1,
      incorrect: 0,
      blank: 0
    }, scoringRules);
    
    let score = 0;
    const details = [];
    
    for (let i = 0; i < templateAnswers.length; i++) {
      const studentAnswer = studentAnswers[i] ?? -1; // -1 = em branco
      const correctAnswer = templateAnswers[i];
      
      let points = 0;
      let status = '';
      
      if (studentAnswer === -1) {
        points = rules.blank;
        status = 'blank';
      } else if (studentAnswer === correctAnswer) {
        points = rules.correct;
        status = 'correct';
      } else {
        points = -Math.abs(rules.incorrect);
        status = 'incorrect';
      }
      
      score += points;
      details.push({
        question: i + 1,
        studentAnswer: this._indexToLetter(studentAnswer),
        correctAnswer: this._indexToLetter(correctAnswer),
        points,
        status
      });
    }
    
    const percentage = templateAnswers.length > 0 && rules.correct > 0
      ? (score / (templateAnswers.length * rules.correct)) * 100 
      : 0;
    
    return {
      score,
      total: templateAnswers.length * rules.correct,
      percentage: parseFloat(percentage.toFixed(2)),
      details
    };
  }

  // Métodos auxiliares privados
  
  _toGrayscale(imageData) {
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Fórmula padrão de luminância
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      grayData[i] = gray;     // R
      grayData[i + 1] = gray; // G
      grayData[i + 2] = gray; // B
      grayData[i + 3] = data[i + 3]; // A
    }
    
    return new ImageData(grayData, imageData.width, imageData.height);
  }
  
  _threshold(imageData, threshold) {
    const data = imageData.data;
    const binaryData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i]; // R, G e B são iguais em escala de cinza
      const value = gray > threshold ? 255 : 0;
      
      binaryData[i] = value;     // R
      binaryData[i + 1] = value; // G
      binaryData[i + 2] = value; // B
      binaryData[i + 3] = data[i + 3]; // A
    }
    
    return new ImageData(binaryData, imageData.width, imageData.height);
  }
  
  _calculateDarkness(imageData, centerX, centerY, radius) {
    const { width, height } = imageData;
    const data = imageData.data;
    let darkness = 0;
    let pixels = 0;
    
    const halfWidth = (this.options.sampleWidth || radius * 2) / 2;
    const halfHeight = (this.options.sampleHeight || radius * 2) / 2;
    const shape = this.options.sampleShape || 'circle';
    for (let y = Math.max(0, Math.ceil(centerY - halfHeight)); y <= Math.min(height - 1, Math.floor(centerY + halfHeight)); y++) {
      for (let x = Math.max(0, Math.ceil(centerX - halfWidth)); x <= Math.min(width - 1, Math.floor(centerX + halfWidth)); x++) {
        if (shape === 'circle' && ((x - centerX) / halfWidth) ** 2 + ((y - centerY) / halfHeight) ** 2 > 1) continue;
        darkness += 255 - data[(y * width + x) * 4];
        pixels++;
      }
    }

    return pixels > 0 ? darkness / pixels : 0;
  }
  
  _markArea(imageData, centerX, centerY, radius, color) {
    const { width, height } = imageData;
    const data = imageData.data;
    const [r, g, b] = color;
    
    for (let y = Math.max(0, centerY - radius); 
         y <= Math.min(height - 1, centerY + radius); 
         y++) {
      for (let x = Math.max(0, centerX - radius); 
           x <= Math.min(width - 1, centerX + radius); 
           x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          const index = (y * width + x) * 4;
          data[index] = r;     // R
          data[index + 1] = g; // G
          data[index + 2] = b; // B
        }
      }
    }
  }
  
  _binaryToImageData(binaryData, width, height) {
    return new ImageData(
      new Uint8ClampedArray(binaryData.data),
      width,
      height
    );
  }
  
  _gaussianBlur(imageData, radius) {
    // Implementação simples de blur - pode ser otimizada
    const { width, height } = imageData;
    const data = imageData.data;
    const blurred = new Uint8ClampedArray(data.length);
    
    const kernelSize = radius * 2 + 1;
    const kernel = [];
    let sum = 0;
    
    // Kernel gaussiano 1D
    for (let i = -radius; i <= radius; i++) {
      const value = Math.exp(-(i * i) / (2 * radius * radius)) / (Math.sqrt(2 * Math.PI) * radius);
      kernel.push(value);
      sum += value;
    }
    
    // Normaliza o kernel
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= sum;
    }
    
    // Aplica blur horizontal
    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
        
        for (let i = -radius; i <= radius; i++) {
          const px = Math.min(Math.max(x + i, 0), width - 1);
          const index = (y * width + px) * 4;
          const weight = kernel[i + radius];
          
          rSum += data[index] * weight;
          gSum += data[index + 1] * weight;
          bSum += data[index + 2] * weight;
          aSum += data[index + 3] * weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        temp[targetIndex] = rSum;
        temp[targetIndex + 1] = gSum;
        temp[targetIndex + 2] = bSum;
        temp[targetIndex + 3] = aSum;
      }
    }
    
    // Aplica blur vertical
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
        
        for (let i = -radius; i <= radius; i++) {
          const py = Math.min(Math.max(y + i, 0), height - 1);
          const index = (py * width + x) * 4;
          const weight = kernel[i + radius];
          
          rSum += temp[index] * weight;
          gSum += temp[index + 1] * weight;
          bSum += temp[index + 2] * weight;
          aSum += temp[index + 3] * weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        blurred[targetIndex] = rSum;
        blurred[targetIndex + 1] = gSum;
        blurred[targetIndex + 2] = bSum;
        blurred[targetIndex + 3] = aSum;
      }
    }
    
    return new ImageData(blurred, width, height);
  }
  
  _enhanceContrast(imageData) {
    const data = imageData.data;
    const enhanced = new Uint8ClampedArray(data.length);
    
    // Encontra min e max
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    
    // Aplica stretch de contraste
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i];
        const enhancedValue = ((gray - min) * 255) / range;
        enhanced[i] = enhancedValue;
        enhanced[i + 1] = enhancedValue;
        enhanced[i + 2] = enhancedValue;
        enhanced[i + 3] = data[i + 3];
      }
    } else {
      // Se todos os pixels são iguais, retorna o original
      return imageData;
    }
    
    return new ImageData(enhanced, imageData.width, imageData.height);
  }
  
  _indexToLetter(index) {
    if (index === -2) return 'Múltipla';
    if (index < 0) return '';
    return String.fromCharCode(65 + index); // 0=A, 1=B, 2=C, 3=D, ...
  }
  
  _letterToIndex(letter) {
    if (!letter) return -1;
    return letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, ...
  }
  
  _simpleHash(data) {
    // Hash simples baseado na soma dos valores
    let hash = 0;
    const bytes = data.data;
    for (let i = 0; i < Math.min(bytes.length, 1000); i += 4) { // Amostra para performance
      hash = ((hash << 5) - hash) + bytes[i];
      hash = hash & hash; // Converte para 32-bit integer
    }
    return Math.abs(hash);
  }
}

export default OMR;