import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('geminiApiKey') || '';
      setApiKey(storedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Google AI Studio API Key (Client Override)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-2">
            This key will be saved locally in your browser and sent with API requests. If empty, the server will use its own environment variable.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(apiKey);
              onClose();
            }}
            className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-md"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
