/**
 * Camera Module - Gerenciamento de câmera e captura de imagens
 * 
 * Responsável por:
 * - Solicitar permissões de câmera
 * - Configurar stream de vídeo
 * - Capturar frames da câmera
 * - Gerenciar múltiplas câmeras (traseira/frontal)
 */

export class Camera {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.context = null;
    this.facingMode = 'environment'; // 'environment' = traseira, 'user' = frontal
    this.isInitialized = false;
    this.constraints = {
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };
  }

  /**
   * Inicializa a câmera
   * @param {HTMLVideoElement} videoElement - Elemento video para preview
   * @returns {Promise<boolean>} Sucesso da inicialização
   */
  async initialize(videoElement) {
    this.videoElement = videoElement;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Use HTTPS ou localhost para acessar a câmera');
      }
      this.stop();
      const requestId = this.requestId;
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      if (requestId !== this.requestId) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Abertura da câmera cancelada');
      }
      this.stream = stream;
      this.videoElement.srcObject = this.stream;
      
      // Cria canvas oculto para captura
      this.canvasElement = document.createElement('canvas');
      this.context = this.canvasElement.getContext('2d', { willReadFrequently: true });
      
      this.videoElement.muted = true;
      let playTimeout;
      try {
        await Promise.race([this.videoElement.play(), new Promise((_, reject) => {
          playTimeout = setTimeout(() => reject(new Error('A câmera não forneceu imagem. Tente abri-la novamente.')), 10000);
        })]);
      } finally { clearTimeout(playTimeout); }
      if (requestId !== this.requestId) throw new Error('Abertura da câmera cancelada');
      if (!this.videoElement.videoWidth) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('A câmera não forneceu imagem')), 10000);
          this.videoElement.addEventListener('loadeddata', () => { clearTimeout(timeout); resolve(); }, { once: true });
        });
      }
      
      const track=stream.getVideoTracks()[0];
      const capabilities=track?.getCapabilities?.();
      if(capabilities?.focusMode?.includes('continuous')) {
        try { await track.applyConstraints({advanced:[{focusMode:'continuous'}]}); } catch { /* Optional camera capability. */ }
      }
      if (requestId !== this.requestId) throw new Error('Abertura da câmera cancelada');
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.stop();
      console.error('Erro ao inicializar câmera:', error);
      this.isInitialized = false;
      throw new Error(`Não foi possível acessar a câmera: ${error.message}`);
    }
  }

  /**
   * Alterna entre câmera frontal e traseira
   * @returns {Promise<boolean>} Sucesso da troca
   */
  async switchCamera() {
    if (!this.stream) return false;
    
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.constraints.video.facingMode = { ideal: this.facingMode };
    
    this.stop();
    return await this.initialize(this.videoElement);
  }

  /**
   * Captura frame atual como ImageData
   * @returns {ImageData} Dados da imagem capturada
   */
  captureFrame({ aspectRatio, maxDimension } = {}) {
    if (!this.isInitialized || !this.videoElement || !this.context) throw new Error('Câmera não inicializada');
    const { videoWidth, videoHeight, readyState } = this.videoElement;
    if (!videoWidth || !videoHeight || readyState < 2) throw new Error('Aguarde a imagem da câmera antes de capturar');
    // Center crop exactly matches the live stage's object-fit: cover.
    let sourceWidth = videoWidth, sourceHeight = videoHeight;
    if (aspectRatio && sourceWidth / sourceHeight > aspectRatio) sourceWidth = sourceHeight * aspectRatio;
    else if (aspectRatio) sourceHeight = sourceWidth / aspectRatio;
    const scale = maxDimension ? Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight)) : 1;
    this.canvasElement.width = Math.max(1, Math.round(sourceWidth * scale));
    this.canvasElement.height = Math.max(1, Math.round(sourceHeight * scale));
    this.context.drawImage(this.videoElement, (videoWidth - sourceWidth) / 2, (videoHeight - sourceHeight) / 2,
      sourceWidth, sourceHeight, 0, 0, this.canvasElement.width, this.canvasElement.height);
    return this.context.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  /**
   * Captura frame como Blob (para upload/salvamento)
   * @param {string} format - Formato da imagem (image/jpeg, image/png)
   * @param {number} quality - Qualidade (0-1) para JPEG
   * @returns {Promise<Blob>} Blob da imagem
   */
  async captureBlob(format = 'image/jpeg', quality = 0.9) {
    if (!this.isInitialized) {
      throw new Error('Câmera não inicializada');
    }

    const { videoWidth, videoHeight } = this.videoElement;
    if (!videoWidth || !videoHeight || this.videoElement.readyState < 2) {
      throw new Error('Aguarde a imagem da câmera antes de capturar');
    }
    this.canvasElement.width = videoWidth;
    this.canvasElement.height = videoHeight;
    this.context.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    
    return new Promise((resolve) => {
      this.canvasElement.toBlob(resolve, format, quality);
    });
  }

  /**
   * Captura frame como base64
   * @param {string} format - Formato da imagem
   * @param {number} quality - Qualidade (0-1)
   * @returns {Promise<string>} Base64 da imagem
   */
  async captureBase64(format = 'image/jpeg', quality = 0.9) {
    const blob = await this.captureBlob(format, quality);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Obtém lista de dispositivos de vídeo disponíveis
   * @returns {Promise<MediaDeviceInfo[]>} Lista de câmeras
   */
  static async getAvailableCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  }

  /**
   * Para a câmera e libera recursos
   */
  stop() {
    this.requestId = (this.requestId || 0) + 1;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isInitialized = false;
  }

  /**
   * Verifica se a câmera está ativa
   * @returns {boolean}
   */
  get isActive() {
    return this.isInitialized && this.stream && this.stream.active;
  }

  /**
   * Obtém dimensões do vídeo
   * @returns {{width: number, height: number}}
   */
  get dimensions() {
    if (!this.videoElement) return { width: 0, height: 0 };
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight
    };
  }
}

export default Camera;