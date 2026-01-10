export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface TranscriptItem {
  id: string;
  text: string;
  sender: 'user' | 'model';
  timestamp: number;
  isPartial?: boolean;
}

export interface AudioVisualizerData {
  volume: number; // 0.0 to 1.0
}

export interface AppConfig {
  apiKey: string;
}

export interface PulseNode {
  id: string;
  text: string;
  strength: number; // 0-1 relevance
}