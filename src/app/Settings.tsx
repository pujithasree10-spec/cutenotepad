import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { motion } from 'framer-motion';
import { Key, Sparkles, Check, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Settings: React.FC = () => {
  const [openAiKey, setOpenAiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('LITTLE_PAGES_OPENAI_KEY');
    if (storedKey) {
      setOpenAiKey(storedKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('LITTLE_PAGES_OPENAI_KEY', openAiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-4xl italic text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary">Configure your Personal Life OS</p>
        </motion.div>

        <div className="space-y-6">
          {/* AI Configuration Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-surface border border-border shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-text-primary">AI Integration</h2>
                <p className="text-sm text-text-secondary">Unlock smart features like auto-task breakdown and the AI Life Coach.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                  <Key size={16} /> OpenAI API Key
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 px-4 py-2 rounded-xl bg-bg border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  />
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition-colors flex items-center gap-2"
                  >
                    {saved ? <Check size={18} /> : <Save size={18} />}
                    {saved ? 'Saved' : 'Save Key'}
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Your key is stored securely in your browser's local storage and is never sent to our database.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};
