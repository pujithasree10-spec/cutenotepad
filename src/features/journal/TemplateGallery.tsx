import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Template } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { X, Sparkles } from 'lucide-react';

interface TemplateGalleryProps {
  onClose: () => void;
  onSelectTemplate: (templateContent: any, templateTitle: string) => Promise<void>;
}

const SYSTEM_TEMPLATES = [
  {
    name: '🌸 Cozy Daily Reflection',
    category: 'Self-Care',
    description: 'A soft, sweet space to log your daily mood, tea of the day, gentle wins, and self-care moments.',
    thumbnail: '🌸',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🌸 My Cozy Daily Journal' }] },
        { type: 'paragraph', content: [{ type: 'text', text: `Date: ${new Date().toLocaleDateString()} | Vibe: Cozy & Peaceful` }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🍵 Daily Warmth & Tea' }] },
        { type: 'paragraph', content: [{ type: 'text', text: "Today's beverage or comforting snack of choice: " }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✨ Gentle Wins & Happy Moments' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• A small thing that made me smile: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• A challenge I met with kindness: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🧸 Self-Care Check-in' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• How did I rest today? ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Something nice I did for my body or mind: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌙 Bedtime Affirmation' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '"I did my best, and it is safe to rest now."' }] }
      ]
    }
  },
  {
    name: '☕ Sweet Morning Routine',
    category: 'Productivity',
    description: 'Set a calm, cute, and intentional tone for your morning.',
    thumbnail: '☕',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '☕ Sweet Morning Coffee & Intention' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌻 Today\'s Focus' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Today I want to focus on: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• I will bring gentle energy to: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🧺 Warm Morning Steps' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Make my cozy bed 🛏️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Stretch and take deep breaths 🧘‍♀️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Sip a warm drink slowly ☕' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Plan my day with kindness 📝' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌈 Affirmation of the Day' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '"Today is filled with small wonders, and I am ready to welcome them."' }] }
      ]
    }
  },
  {
    name: '🙏 Heartfelt Gratitude Log',
    category: 'Mindfulness',
    description: 'A delicate template to document small details, kind souls, and sweet memories.',
    thumbnail: '🙏',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🙏 My Heartfelt Gratitude Log' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌸 Three Tiny Wonders' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '1. A beautiful sound or sight today: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '2. A kind interaction or warm smile: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '3. A small luxury (like cozy socks, a hot shower, or soft sheets): ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💖 A Letter of Appreciation to Myself' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear self, I appreciate that you...' }] }
      ]
    }
  },
  {
    name: '🌙 Sleep & Dream Journal',
    category: 'Mindfulness',
    description: 'Log your sleep quality, bedtime rituals, and mystical dreams.',
    thumbnail: '🌙',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🌙 My Dream & Sleep Catcher' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💤 Sleep Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Hours slept: ___ | Quality: ⭐⭐⭐⭐⭐' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Bedtime wind-down routine: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🌌 Dreamscape Records' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'I dreamt that... (colors, feelings, symbols): ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🕯️ Bedtime Release' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'One thought or worry I want to release before sleep: ' }] }
      ]
    }
  },
  {
    name: '🦄 Cute Weekly Reset',
    category: 'Growth',
    description: 'A delightful checklist to refresh your space, body, and plan for the new week.',
    thumbnail: '🦄',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🦄 My Cozy Weekly Reset' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🏡 Refreshing My Space' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Open windows for fresh air 🌬️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Wipe down desk and light a candle 🕯️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Water my plant babies 🌿' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Tidy clothes and organize my bag 🧺' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '🛁 Loving My Body & Soul' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Hair mask and long hot shower 🚿' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Paint my nails a cute pastel color 💅' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• [ ] Stretch or go for a gentle sunset walk 🌅' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📅 Planning the New Week' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Main focus/theme for next week: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• A sweet treat or reward I will give myself: ' }] }
      ]
    }
  }
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onClose, onSelectTemplate }) => {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Fetch system and own templates
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed database
        const seedPayload = SYSTEM_TEMPLATES.map((t) => ({
          ...t,
          is_system: true,
          user_id: null,
        }));
        const { error: seedError } = await supabase.from('templates').insert(seedPayload);
        if (seedError) throw seedError;
        
        // Reload
        const { data: reloadedData } = await supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: true });
        setTemplates(reloadedData || []);
      } else {
        setTemplates(data || []);
      }
    } catch (e) {
      console.error('Error loading/seeding templates:', e);
      // Fallback local mock state if Supabase issues arise
      const mockTemplates = SYSTEM_TEMPLATES.map((t, idx) => ({
        id: `mock-${idx}`,
        user_id: null,
        name: t.name,
        category: t.category,
        description: t.description,
        content: t.content,
        thumbnail: t.thumbnail,
        is_system: true,
        uses: 0,
      }));
      setTemplates(mockTemplates);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      await onSelectTemplate(template.content, template.name);
      onClose();
    } catch (e) {
      console.error('Error selecting template:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-surface border border-border rounded-lg shadow-lg flex flex-col overflow-hidden animate-fade-in z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-border-soft flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <h3 className="font-display text-2xl italic text-text-primary">
              Template Gallery
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-text-primary transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Templates Grid Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="p-4 bg-elevated/50 border border-border hover:border-accent rounded-lg cursor-pointer transition flex flex-col justify-between h-40 group hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{template.thumbnail || '📝'}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent transition">
                          {template.name}
                        </h4>
                        <span className="text-[10px] text-text-muted bg-border px-1.5 py-0.5 rounded font-mono">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                    className="w-full mt-3 bg-accent/10 border border-accent/20 hover:bg-accent hover:text-white text-accent text-xs py-2 rounded transition active:scale-[0.98] font-medium"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};
