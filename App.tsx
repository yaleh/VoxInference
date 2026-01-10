import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionState, TranscriptItem } from './types';
import { APP_CONFIG_KEY } from './constants';
import { GeminiLiveService } from './services/geminiLive';
import PulseVisualizer from './components/PulseVisualizer';
import TranscriptStream from './components/TranscriptStream';
import SettingsModal from './components/SettingsModal';
import { MicIcon, MicOffIcon, SettingsIcon, ActivityIcon, PauseIcon, PlayIcon } from './components/Icons';

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Stats
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // Refs
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const timerRef = useRef<number | null>(null);

  // Load API Key
  useEffect(() => {
    const stored = localStorage.getItem(APP_CONFIG_KEY);
    if (stored) {
        try {
            const config = JSON.parse(stored);
            if (config.apiKey) setApiKey(config.apiKey);
        } catch (e) {
            console.error("Failed to parse config");
        }
    }
  }, []);

  const saveApiKey = (key: string) => {
      setApiKey(key);
      localStorage.setItem(APP_CONFIG_KEY, JSON.stringify({ apiKey: key }));
  };

  // Timer Logic
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED && !isPaused) {
        timerRef.current = window.setInterval(() => {
            setSessionDuration(prev => prev + 1);
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connectionState, isPaused]);

  // Handle Transcript
  const handleTranscript = useCallback((text: string, sender: 'user' | 'model', isFinal: boolean) => {
    setTranscript(prev => {
        const newTranscript = [...prev];
        const lastIndex = newTranscript.length - 1;
        const lastItem = newTranscript[lastIndex];

        if (lastItem && lastItem.sender === sender && lastItem.isPartial) {
             const updatedItem = { ...lastItem };
             if (isFinal) {
                 updatedItem.isPartial = false;
                 if (text) updatedItem.text += text; 
             } else {
                 updatedItem.text += text;
             }
             newTranscript[lastIndex] = updatedItem;
             return newTranscript;
        } else {
            if (!text && isFinal) return prev; 
            return [...prev, {
                id: Date.now().toString(),
                text: text,
                sender,
                timestamp: Date.now(),
                isPartial: !isFinal
            }];
        }
    });
  }, []);

  const toggleConnection = useCallback(async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      serviceRef.current?.disconnect();
      setVolume(0);
      setSessionDuration(0);
      setIsPaused(false);
      return;
    }

    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    serviceRef.current = new GeminiLiveService({
        onConnectionStateChange: (state) => setConnectionState(state as ConnectionState),
        onTranscript: handleTranscript,
        onAudioVolume: (vol) => setVolume(vol),
        onError: (err) => {
            console.error(err);
            alert(`Error: ${err}`);
        }
    });

    await serviceRef.current.connect(apiKey);

  }, [apiKey, connectionState, handleTranscript]);

  const togglePause = useCallback(() => {
      if (serviceRef.current && connectionState === ConnectionState.CONNECTED) {
          const newState = !isPaused;
          setIsPaused(newState);
          serviceRef.current.setPaused(newState);
      }
  }, [connectionState, isPaused]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black font-sans text-gray-100 overflow-hidden">
      
      {/* 1. Header & Metadata Dashboard */}
      <header className="shrink-0 h-24 bg-gray-900/50 border-b border-gray-800 flex flex-col justify-between relative z-20">
         {/* Stats Row */}
        <div className="flex items-center justify-between px-6 pt-3 text-[10px] uppercase tracking-[0.2em] font-mono z-20 relative">
            <div className="flex items-center gap-2">
                <ActivityIcon className={`w-3 h-3 ${connectionState === ConnectionState.CONNECTED ? 'text-cyan-500' : 'text-gray-600'}`} />
                <span className="text-gray-500">STATUS: <span className={connectionState === ConnectionState.CONNECTED ? 'text-cyan-400 font-bold' : 'text-gray-400'}>{isPaused ? 'PAUSED' : connectionState}</span></span>
            </div>
            <div className="text-gray-500">SESSION: <span className="text-gray-300">{formatTime(sessionDuration)}</span></div>
        </div>
        
        {/* Visualizer Area */}
        <div className="absolute inset-0 pt-6 px-0 opacity-50 z-10">
             <PulseVisualizer 
                volume={volume} 
                isActive={connectionState === ConnectionState.CONNECTED && !isPaused} 
            />
        </div>
      </header>

      {/* 2. Main Content Area (Scrollable Stream) */}
      <div className="flex-1 relative bg-black">
        <TranscriptStream items={transcript} />
      </div>

      {/* 3. Bottom Control Dock */}
      <div className="shrink-0 px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black to-transparent z-30 flex items-center justify-between">
          
          {/* Settings / Secondary */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-4 rounded-full bg-gray-900 hover:bg-gray-800 text-gray-400 transition-all border border-gray-800"
          >
              <SettingsIcon className="w-6 h-6" />
          </button>

          {/* Main Action (Mic) */}
          <button
            onClick={toggleConnection}
            disabled={connectionState === ConnectionState.CONNECTING}
            className={`
                w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 border border-gray-800
                ${connectionState === ConnectionState.CONNECTED 
                    ? 'bg-red-900/20 hover:bg-red-900/40 text-red-500 border-red-900/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' 
                    : connectionState === ConnectionState.CONNECTING
                        ? 'bg-gray-800 text-gray-500 animate-pulse'
                        : 'bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-500 border-cyan-900/50 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
                }
            `}
          >
            {connectionState === ConnectionState.CONNECTED ? (
                <div className="w-6 h-6 bg-current rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.5)]" /> /* Stop Square with Glow */
            ) : (
                <MicIcon className="w-8 h-8" />
            )}
          </button>

          {/* Pause / Resume */}
          <button
            onClick={togglePause}
            disabled={connectionState !== ConnectionState.CONNECTED}
            className={`
                p-4 rounded-full border transition-all duration-300
                ${connectionState === ConnectionState.CONNECTED
                    ? isPaused 
                        ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-500 hover:bg-yellow-900/30' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    : 'bg-gray-900 border-gray-800 text-gray-800 cursor-not-allowed'
                }
            `}
          >
              {isPaused ? <PlayIcon className="w-6 h-6" /> : <PauseIcon className="w-6 h-6" />}
          </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={saveApiKey}
      />
    </div>
  );
}

export default App;