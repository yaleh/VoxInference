import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPCM16Blob, decodeAudioData } from './audioUtils';
import { SAMPLE_RATE_INPUT, SAMPLE_RATE_OUTPUT, INITIAL_SYSTEM_INSTRUCTION } from '../constants';

interface LiveServiceCallbacks {
  onConnectionStateChange: (state: string) => void;
  onTranscript: (text: string, sender: 'user' | 'model', isFinal: boolean) => void;
  onAudioVolume: (volume: number) => void;
  onError: (error: string) => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI | null = null;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private isConnected = false;
  private callbacks: LiveServiceCallbacks;
  private audioStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // Pause state
  public isPaused = false;

  constructor(callbacks: LiveServiceCallbacks) {
    this.callbacks = callbacks;
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    console.log(`Session ${paused ? 'Paused' : 'Resumed'}`);
  }

  async connect(apiKey: string) {
    if (!apiKey) {
      this.callbacks.onError("API Key is missing");
      return;
    }

    try {
      this.callbacks.onConnectionStateChange('CONNECTING');
      this.ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE_INPUT,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE_OUTPUT,
      });

      // Ensure contexts are running (vital for some browsers)
      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();

      // Get Microphone Stream
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE_INPUT,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect to Gemini Live
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: INITIAL_SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            this.callbacks.onError("Connection error occurred.");
            this.disconnect();
          },
        },
      });

      // Set up Audio Processing Pipeline
      this.inputSource = this.inputAudioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.inputAudioContext.createAnalyser();
      this.analyser.fftSize = 256; 
      this.analyser.smoothingTimeConstant = 0.5;

      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // If paused, we send silence (zeros)
        let dataToSend = inputData;
        if (this.isPaused) {
            dataToSend = new Float32Array(inputData.length); 
        }

        const pcmBlob = createPCM16Blob(dataToSend);
        sessionPromise.then((session) => {
            this.session = session;
            session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      // Connect graph
      this.inputSource.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
      
      // Start Visualizer Loop
      this.startVisualizer();

    } catch (error) {
      console.error("Connection failed:", error);
      this.callbacks.onError(error instanceof Error ? error.message : "Failed to connect");
      this.disconnect();
    }
  }

  private startVisualizer() {
      if (!this.analyser) return;
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      const loop = () => {
          if (!this.isConnected || !this.analyser) return;
          
          if (this.isPaused) {
              this.callbacks.onAudioVolume(0);
              this.animationFrameId = requestAnimationFrame(loop);
              return;
          }

          this.analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = avg / 255;
          
          this.callbacks.onAudioVolume(normalized);
          
          this.animationFrameId = requestAnimationFrame(loop);
      };
      loop();
  }

  private handleOpen() {
    console.log("Gemini Live Session Opened");
    this.isConnected = true;
    this.isPaused = false;
    this.callbacks.onConnectionStateChange('CONNECTED');
    this.nextStartTime = this.outputAudioContext?.currentTime || 0;
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext) return;

    // Handle Output Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        const audioBuffer = await decodeAudioData(base64Audio, this.outputAudioContext, SAMPLE_RATE_OUTPUT);
        
        const data = audioBuffer.getChannelData(0);
        let sum = 0;
        for(let i=0; i<data.length; i+=50) sum += Math.abs(data[i]);
        const avg = sum / (data.length / 50);
        
        if (!this.isPaused) {
            this.callbacks.onAudioVolume(Math.min(1, avg * 3));
        }

        // NOTE: Still muted physically as per 'CRITICAL PROTOCOLS' in constants.ts
        // The visualizer reacts, but we do not play audio.

      } catch (e) {
        console.error("Error decoding audio:", e);
      }
    }

    // Handle Transcriptions
    const outputTranscript = message.serverContent?.outputTranscription?.text;
    if (outputTranscript) {
       this.callbacks.onTranscript(outputTranscript, 'model', false);
    }
    
    const inputTranscript = message.serverContent?.inputTranscription?.text;
    if (inputTranscript) {
        this.callbacks.onTranscript(inputTranscript, 'user', false);
    }

    // Handle Turn Complete
    if (message.serverContent?.turnComplete) {
       this.callbacks.onTranscript("", 'model', true);
       this.callbacks.onTranscript("", 'user', true);
    }
  }

  private handleClose() {
    console.log("Gemini Live Session Closed");
    this.disconnect();
  }

  disconnect() {
    this.isConnected = false;
    this.isPaused = false;
    this.callbacks.onConnectionStateChange('DISCONNECTED');
    
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    if (this.session) {
      try {
          this.session.close();
      } catch (e) {
          console.error("Error closing session", e);
      }
      this.session = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
    }

    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }

    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}