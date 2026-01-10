import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [localKey, setLocalKey] = useState(apiKey);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(localKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
            <XIcon className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-cyan-400">
            <span className="w-2 h-6 bg-cyan-500 rounded-sm"></span>
            SYSTEM CONFIG
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Gemini API Key
            </label>
            <input
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="Enter your Google GenAI Key"
              className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-2">
                Key is stored locally in your browser. 
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-400 ml-1 underline">
                    Get a key
                </a>
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-4 uppercase tracking-wider text-sm"
          >
            Initialize System
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;