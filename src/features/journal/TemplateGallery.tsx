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
    name: 'Daily Planner',
    category: 'Productivity',
    description: 'Structure your day with intentions, schedule, and reflections.',
    thumbnail: '📅',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Daily Planner 📅' }] },
        { type: 'paragraph', content: [{ type: 'text', text: `Date: ${new Date().toLocaleDateString()}` }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: "Today's Intentions ✨" }] },
        { type: 'paragraph', content: [{ type: 'text', text: '1. Focus on: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '2. Take care of: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Schedule & Timeblocks ⏱️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• 09:00 - 11:00 : Deep Work Session' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• 11:00 - 12:00 : Admin & Emails' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• 13:00 - 15:00 : Focus Project Task' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Reflections & Notes 📝' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What went well today? What can I improve tomorrow?' }] }
      ]
    }
  },
  {
    name: 'Gratitude Journal',
    category: 'Mindfulness',
    description: 'A simple layout to log things and people you appreciate.',
    thumbnail: '🙏',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Gratitude Journal 🙏' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Three things I am grateful for today:' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '1. ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '2. ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '3. ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Who made me smile today? 😊' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '...' }] }
      ]
    }
  },
  {
    name: 'Weekly Review',
    category: 'Productivity',
    description: 'Reflect on wins, learnings, and plan the upcoming week.',
    thumbnail: '🗓️',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Weekly Review 🗓️' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Big Wins This Week 🏆' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Win 1: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Win 2: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Lessons & Adjustments 💡' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What did I learn? What should I change?' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Upcoming Week Goals 🎯' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Goal 1: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Goal 2: ' }] }
      ]
    }
  },
  {
    name: 'Study Session',
    category: 'Academics',
    description: 'Keep track of lectures, summaries, and action items.',
    thumbnail: '📚',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Study Session Notes 📚' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Subject / Lecture: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Core Concepts 🧠' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Takeaways & Summaries 📝' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Summarize concept in 3 sentences:' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Review Questions ❓' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• ' }] }
      ]
    }
  },
  {
    name: 'Goal Tracker',
    category: 'Growth',
    description: 'Define key milestones, action items, and deadline dates.',
    thumbnail: '🎯',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Goal Blueprint 🎯' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Goal Statement:' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'I want to... by [Deadline]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why is this important? 💡' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Plan 📋' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• Milestones & Dates: ' }] }
      ]
    }
  },
  {
    name: 'Project Plan',
    category: 'Productivity',
    description: 'Outline requirements, tasks, resource links, and scope.',
    thumbnail: '🚀',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Project Plan 🚀' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Project Name: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Scope & Description 📝' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What are we building?' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tasks Checklist 🛠️' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Resources & Reference Links 🔗' }] }
      ]
    }
  },
  {
    name: 'Meeting Notes',
    category: 'Work',
    description: 'Track attendees, discussion points, and next steps.',
    thumbnail: '👥',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Meeting Notes 👥' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Attendees: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda 📌' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Discussion Points 💬' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items 🚀' }] }
      ]
    }
  },
  {
    name: 'Reflection Page',
    category: 'Mindfulness',
    description: 'Deep self-analysis prompts for emotional alignment.',
    thumbnail: '🧠',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Self-Reflection Page 🧠' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Current Emotional State' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'I feel... because...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Prompts to ponder 🤔' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• What is causing anxiety? How can I address it?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '• What am I ignoring? What needs immediate attention?' }] }
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
