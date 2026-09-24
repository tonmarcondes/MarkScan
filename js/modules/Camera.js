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
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.videoElement.srcObject = this.stream;
      
      // Cria canvas oculto para captura
      this.canvasElement = document.createElement('canvas');
      this.context = this.canvasElement.getContext('2d', { willReadFrequently: true });
      
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });
      
      this.isInitialized = true;
      return true;
    } catch (error) {
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
  captureFrame() {
    if (!this.isInitialized || !this.videoElement || !this.context) {
      throw new Error('Câmera não inicializada');
    }

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvasElement.width = videoWidth;
    this.canvasElement.height = videoHeight;
    
    this.context.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    return this.context.getImageData(0, 0, videoWidth, videoHeight);
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