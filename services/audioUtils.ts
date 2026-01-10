import { Blob as GenAIBlob } from '@google/genai';

export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function createPCM16Blob(data: Float32Array): GenAIBlob {
  const int16 = float32ToInt16(data);
  const base64 = arrayBufferToBase64(int16.buffer);
  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function decodeAudioData(
  base64Data: string,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64Data);
  const dataInt16 = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(dataInt16.length);

  // Convert Int16 to Float32
  for (let i = 0; i < dataInt16.length; i++) {
    float32[i] = dataInt16[i] / 32768.0;
  }

  // Create an AudioBuffer
  const buffer = audioContext.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);
  return buffer;
}
