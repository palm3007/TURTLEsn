import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { BotPersona } from '../types';

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  
  // Video related
  private videoInterval: number | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    const apiKey = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async start(persona: BotPersona, onDisconnect: () => void) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("Microphone permission denied", e);
      onDisconnect();
      return;
    }

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log('Live session opened');
          this.startAudioInput();
        },
        onmessage: async (message: LiveServerMessage) => {
          this.handleMessage(message);
        },
        onerror: (e: ErrorEvent) => {
          console.error('Live session error', e);
          onDisconnect();
        },
        onclose: (e: CloseEvent) => {
          console.log('Live session closed');
          onDisconnect();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName || 'Kore' } },
        },
        systemInstruction: persona.systemInstruction + " You are in a video/voice call. If the user shows you video, comment on what you see. Keep answers concise.",
      },
    });
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  // --- Video Handling ---

  async startVideoStream(videoElement: HTMLVideoElement) {
    if (!this.sessionPromise) return;

    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    const FRAME_RATE = 1; // Send 1 frame per second to save bandwidth/tokens but allow vision

    this.videoInterval = window.setInterval(() => {
      if (!this.canvas || !ctx || !videoElement) return;

      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);

      const base64 = this.canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      
      this.sessionPromise?.then((session) => {
         session.sendRealtimeInput({
            media: {
              mimeType: 'image/jpeg',
              data: base64
            }
         });
      });

    }, 1000 / FRAME_RATE);
  }

  stopVideoStream() {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    this.canvas = null;
  }

  // --- End Video Handling ---

  private async handleMessage(message: LiveServerMessage) {
    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64EncodedAudioString && this.outputAudioContext && this.outputNode) {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      try {
        const audioBuffer = await this.decodeAudioData(
          this.decode(base64EncodedAudioString),
          this.outputAudioContext,
          24000,
          1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime = this.nextStartTime + audioBuffer.duration;
        this.sources.add(source);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
      for (const source of this.sources.values()) {
        source.stop();
        this.sources.delete(source);
      }
      this.nextStartTime = 0;
    }
  }

  stop() {
    this.stopVideoStream();

    // Stop script processor
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
    }
    
    // Stop media stream
    this.stream?.getTracks().forEach(track => track.stop());
    
    // Close Audio Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    // Stop all playing sources
    for (const source of this.sources.values()) {
      try { source.stop(); } catch(e) {}
    }
    this.sources.clear();
  }

  // --- Helpers ---

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}