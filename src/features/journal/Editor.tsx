import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import { Note, Folder } from '../../types';

import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Image as ImageIcon,
  Save,
  Tag,
  FolderOpen,
  Check,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorProps {
  note: Note;
  folders: Folder[];
  onSave: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
}

export const Editor: React.FC<EditorProps> = ({ note, folders, onSave }) => {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [folderId, setFolderId] = useState<string | null>(note.folder_id);
  const [coverUrl, setCoverUrl] = useState<string | null>(note.cover_url);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const saveTimeoutRef = useRef<any>(null);

  const [showStickers, setShowStickers] = useState(false);

  const CUTE_STICKERS = [
    '🌸', '✨', '🎀', '🧸', '🐱', '🐰', '🦄', '🐼', '🌻', '🍓', '🧁', '🍪', '☕', '🍵', '🎨', '📚', '🎈', '🎉', '🎁', '💖', '💕', '🌙', '⭐', '🌈', '🌧️', '☀️', '🍀', '🦋', '🩰', '💌', '💤', '🕯️'
  ];

  // Initialize TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Override codeBlock to use standard or custom if needed
      }),
      Placeholder.configure({
        placeholder: 'Write your thoughts here...',
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start my-1 gap-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-h-[300px] object-cover my-4',
        },
      }),
      CharacterCount,
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      setSavingStatus('saving');
      triggerAutosave(editor.getJSON());
    },
  }, [note.id]);

  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags || []);
    setFolderId(note.folder_id);
    setCoverUrl(note.cover_url);
    if (editor && note.content) {
      editor.commands.setContent(note.content);
    }
  }, [note.id, editor]);

  // Debounced auto-save
  const triggerAutosave = (contentJson: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const wordCount = editor ? editor.storage.characterCount.words() : 0;
        await onSave(note.id, {
          title,
          content: contentJson,
          tags,
          folder_id: folderId,
          cover_url: coverUrl,
          word_count: wordCount,
        });
        setSavingStatus('saved');
      } catch (e) {
        setSavingStatus('error');
      }
    }, 2000);
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleForceSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, tags, folderId, coverUrl, editor]);

  const handleForceSave = async () => {
    if (!editor) return;
    setSavingStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      const wordCount = editor.storage.characterCount.words();
      await onSave(note.id, {
        title,
        content: editor.getJSON(),
        tags,
        folder_id: folderId,
        cover_url: coverUrl,
        word_count: wordCount,
      });
      setSavingStatus('saved');
    } catch (e) {
      setSavingStatus('error');
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const nextTags = [...tags, tagInput.trim()];
        setTags(nextTags);
        triggerAutosave(editor?.getJSON());
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerAutosave(editor?.getJSON());
  };

  const generateCoverImage = () => {
    const categories = ['minimal', 'nature', 'mountains', 'forest', 'ocean', 'abstract'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomId = Math.floor(Math.random() * 1000);
    const newCover = `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80&sig=${randomId}&q=${randomCategory}`;
    setCoverUrl(newCover);
    triggerAutosave(editor?.getJSON());
  };

  const handleAddImage = () => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Cover Image Area */}
      <div className="relative group w-full h-32 md:h-44 bg-elevated border-b border-border rounded-t-lg overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-text-muted italic">No cover image</span>
        )}
        <button
          onClick={generateCoverImage}
          className="absolute right-4 bottom-4 bg-surface/80 hover:bg-surface border border-border px-3 py-1.5 rounded-md text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
        >
          <ImageIcon size={12} />
          Change Cover
        </button>
      </div>

      {/* Title & Folder Info */}
      <div className="p-4 md:p-6 pb-2 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSavingStatus('saving');
              triggerAutosave(editor.getJSON());
            }}
            placeholder="Untitled note"
            className="w-full md:w-3/4 bg-transparent border-none outline-none font-display text-3xl italic text-text-primary placeholder-text-muted"
          />

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary flex items-center gap-1">
              {savingStatus === 'saved' && (
                <span className="text-success flex items-center gap-1">
                  <Check size={12} /> Saved
                </span>
              )}
              {savingStatus === 'saving' && <span className="text-warning">Saving...</span>}
              {savingStatus === 'error' && <span className="text-danger">Save error</span>}
            </span>

            <button
              onClick={handleForceSave}
              className="bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent p-2 rounded-md transition"
              title="Force Save (Ctrl+S)"
            >
              <Save size={14} />
            </button>
          </div>
        </div>

        {/* Note configuration panel */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary bg-elevated px-2.5 py-1.5 border border-border rounded-md">
            <FolderOpen size={12} className="text-accent" />
            <select
              value={folderId || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setFolderId(val);
                setSavingStatus('saving');
                triggerAutosave(editor.getJSON());
              }}
              className="bg-transparent border-none outline-none text-text-primary cursor-pointer text-xs"
            >
              <option value="">No Folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.icon} {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-text-secondary bg-elevated px-2.5 py-1.5 border border-border rounded-md font-mono">
            <span>Words: {editor.storage.characterCount.words()}</span>
            <span>|</span>
            <span>Chars: {editor.storage.characterCount.characters()}</span>
          </div>
        </div>
      </div>

      {/* Editor Toolbar (Sticky top) */}
      <div className="sticky top-0 z-10 border-y border-border-soft bg-surface/80 backdrop-blur-md px-4 py-2 flex flex-col gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('bold') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('italic') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('heading', { level: 1 }) ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('heading', { level: 2 }) ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('heading', { level: 3 }) ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Heading 3"
          >
            <Heading3 size={16} />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('bulletList') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Bulleted List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('orderedList') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('taskList') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Task List"
          >
            <CheckSquare size={16} />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('blockquote') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              editor.isActive('codeBlock') ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Code Block"
          >
            <Code size={16} />
          </button>
          <button
            onClick={handleAddImage}
            className="p-1.5 rounded hover:bg-white/5 transition text-text-secondary"
            title="Add Image"
          >
            <ImageIcon size={16} />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1"></div>

          <button
            onClick={() => setShowStickers(!showStickers)}
            className={`p-1.5 rounded hover:bg-white/5 transition ${
              showStickers ? 'text-accent bg-accent/10' : 'text-text-secondary'
            }`}
            title="Insert Cute Sticker"
          >
            <Sparkles size={16} />
          </button>
        </div>

        {/* Stickers Panel */}
        <AnimatePresence>
          {showStickers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border-soft pt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto"
            >
              {CUTE_STICKERS.map((sticker, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    editor.chain().focus().insertContent(sticker).run();
                  }}
                  className="text-xl p-1 hover:scale-125 transition-transform duration-100 cursor-pointer select-none bg-transparent border-none outline-none"
                  title="Click to insert sticker"
                >
                  {sticker}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-6 md:p-8 min-h-[300px] outline-none">
        <EditorContent editor={editor} className="font-display text-lg text-text-primary leading-relaxed outline-none" />
      </div>

      {/* Tags Footer Section */}
      <div className="border-t border-border-soft p-4 space-y-3 bg-surface/30">
        <div className="flex items-center gap-2 text-text-secondary text-xs">
          <Tag size={12} className="text-accent" />
          <span>Tags (Press Enter to add)</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-accent/10 border border-accent/20 text-accent rounded px-2.5 py-1 text-xs flex items-center gap-1.5 font-mono"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-text-muted hover:text-danger text-[10px] bg-transparent border-none outline-none cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="bg-transparent border-none outline-none text-xs text-text-primary placeholder-text-muted min-w-[100px]"
          />
        </div>
      </div>
    </div>
  );
};
