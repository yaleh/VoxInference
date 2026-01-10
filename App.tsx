import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionState, TranscriptItem } from './types';
import { APP_CONFIG_KEY } from './constants';
import { GeminiLiveService } from './services/geminiLive';
import PulseVisualizer from './components/PulseVisualizer';
import TranscriptStream from './components/TranscriptStream';
import SettingsModal from './components/SettingsModal';
import { MicIcon, MicOffIcon, SettingsIcon, ActivityIcon } from './components/Icons';

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Refs for managing service without re-renders
  const serviceRef = useRef<GeminiLiveService | null>(null);

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

  // Initialize Service Callback
  const handleTranscript = useCallback((text: string, sender: 'user' | 'model', isFinal: boolean) => {
    setTranscript(prev => {
        const newTranscript = [...prev];
        const lastIndex = newTranscript.length - 1;
        const lastItem = newTranscript[lastIndex];

        // Logic: If same sender and partial, update existing item. Otherwise add new.
        if (lastItem && lastItem.sender === sender && lastItem.isPartial) {
             const updatedItem = { ...lastItem }; // Create shallow copy to avoid mutation
             
             if (isFinal) {
                 updatedItem.isPartial = false;
                 if (text) updatedItem.text += text; 
             } else {
                 updatedItem.text += text;
             }
             
             newTranscript[lastIndex] = updatedItem; // Replace with updated item
             return newTranscript;
        } else {
            // New item
            if (!text && isFinal) return prev; // Ignore empty completion signals if no prev item
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
      return;
    }

    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    // Initialize Service
    serviceRef.current = new GeminiLiveService({
        onConnectionStateChange: (state) => setConnectionState(state as ConnectionState),
        onTranscript: handleTranscript,
        onAudioVolume: (vol) => setVolume(vol),
        onError: (err) => {
            console.error(err);
            alert(`Error: ${err}`); // Simple alert for Phase 1
        }
    });

    await serviceRef.current.connect(apiKey);

  }, [apiKey, connectionState, handleTranscript]);

  return (
    <div className="flex flex-col h-screen w-full bg-black font-sans text-gray-100">
      
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
            <ActivityIcon className="text-cyan-500 w-5 h-5" />
            <h1 className="font-bold tracking-widest text-sm uppercase">The Pulse <span className="text-gray-600 text-xs ml-1">v0.1</span></h1>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Visualizer Area (The Brain) */}
        <div className="shrink-0 border-b border-gray-800/50 bg-gradient-to-b from-gray-900 to-black relative">
            <PulseVisualizer 
                volume={volume} 
                isActive={connectionState === ConnectionState.CONNECTED} 
            />
        </div>

        {/* Transcript Area (The Flow) */}
        <TranscriptStream items={transcript} />

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-0 w-full flex justify-center z-30 pointer-events-none">
             <div className="pointer-events-auto">
                 <button
                    onClick={toggleConnection}
                    disabled={connectionState === ConnectionState.CONNECTING}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                        ${connectionState === ConnectionState.CONNECTED 
                            ? 'bg-red-500/90 hover:bg-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                            : connectionState === ConnectionState.CONNECTING
                                ? 'bg-gray-700 text-gray-400 animate-pulse cursor-wait'
                                : 'bg-cyan-600/90 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105'
                        }
                    `}
                 >
                    {connectionState === ConnectionState.CONNECTED ? (
                        <MicOffIcon className="w-8 h-8" />
                    ) : (
                        <MicIcon className="w-8 h-8" />
                    )}
                 </button>
             </div>
        </div>
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