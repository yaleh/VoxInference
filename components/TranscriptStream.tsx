import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptStreamProps {
  items: TranscriptItem[];
}

const TranscriptStream: React.FC<TranscriptStreamProps> = ({ items }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new items
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative">
       {/* Fade overlay at top */}
       <div className="fixed top-[60px] left-0 w-full h-12 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />

      {items.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4">
            <p className="text-sm font-mono tracking-widest opacity-50">AWAITING INPUT STREAM...</p>
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className={`flex w-full ${
            item.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[85%] p-3 rounded-lg backdrop-blur-sm border ${
              item.sender === 'user'
                ? 'bg-gray-800/50 border-gray-700 text-gray-200'
                : 'bg-cyan-900/10 border-cyan-500/30 text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
            }`}
          >
            <div className="text-[10px] uppercase tracking-widest mb-1 opacity-50 font-mono">
                {item.sender === 'user' ? 'USER_AUDIO_IN' : 'THE_PULSE_RESPONSE'}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed font-light">
                {item.text}
                {item.isPartial && <span className="animate-pulse inline-block w-1.5 h-3 ml-1 bg-cyan-400 align-middle"/>}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default TranscriptStream;