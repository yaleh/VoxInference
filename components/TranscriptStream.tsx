import React, { useEffect, useRef, useMemo } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptStreamProps {
  items: TranscriptItem[];
}

const TranscriptStream: React.FC<TranscriptStreamProps> = ({ items }) => {
  const userBottomRef = useRef<HTMLDivElement>(null);
  const modelBottomRef = useRef<HTMLDivElement>(null);

  // Separate and merge text to create a continuous stream effect
  const userText = useMemo(() => items.filter(i => i.sender === 'user').map(i => i.text).join(' '), [items]);
  const modelText = useMemo(() => items.filter(i => i.sender === 'model').map(i => i.text).join(' '), [items]);
  
  // Determine active state for cursors
  const isUserActive = items.length > 0 && items[items.length - 1].sender === 'user' && items[items.length - 1].isPartial;
  const isModelActive = items.length > 0 && items[items.length - 1].sender === 'model' && items[items.length - 1].isPartial;

  useEffect(() => {
    if (userBottomRef.current) userBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [userText]);

  useEffect(() => {
    if (modelBottomRef.current) modelBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [modelText]);

  return (
    <div className="flex flex-col h-full bg-black font-mono text-sm md:text-base">
      {/* User Section - Top Half */}
      <div className="flex-1 border-b border-gray-800 p-6 overflow-hidden flex flex-col relative">
         <div className="absolute top-2 left-6 text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold select-none z-10 bg-black px-1">
            Incoming Stream
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
             <div className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {userText}
                {isUserActive && <span className="inline-block w-2 h-4 ml-1 bg-gray-500 animate-pulse align-middle"/>}
                <div ref={userBottomRef} />
             </div>
         </div>
      </div>

      {/* Model Section - Bottom Half */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col relative bg-gray-900/10">
         <div className="absolute top-2 left-6 text-[10px] uppercase tracking-[0.2em] text-cyan-700 font-bold select-none z-10 bg-black/50 px-1 backdrop-blur-sm">
            System Response
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
             <div className="text-cyan-400 leading-relaxed whitespace-pre-wrap break-words">
                {modelText}
                {isModelActive && <span className="inline-block w-2 h-4 ml-1 bg-cyan-500 animate-pulse align-middle"/>}
                <div ref={modelBottomRef} />
             </div>
         </div>
      </div>
    </div>
  );
};

export default TranscriptStream;