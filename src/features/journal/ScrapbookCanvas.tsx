import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '../../types';
import {
  Type,
  Image as ImageIcon,
  Smile,
  Palette,
  Trash2,
  RotateCcw,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────

type ElementType = 'text' | 'sticker' | 'image';

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // text
  content?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  // sticker
  emoji?: string;
  emojiSize?: number;
  // image
  src?: string;
  objectFit?: 'cover' | 'contain';
}

interface ScrapbookData {
  elements: CanvasElement[];
  bgColor: string;
  bgPattern: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BG_COLORS = [
  { label: 'Cream', value: '#FFF8F0' },
  { label: 'Blush', value: '#F8D7DA' },
  { label: 'Rose', value: '#F4C2C2' },
  { label: 'Mauve', value: '#D8BFD8' },
  { label: 'Lavender', value: '#E6E0F8' },
  { label: 'Mint', value: '#D4F0E8' },
  { label: 'Sky', value: '#D0EAFB' },
  { label: 'Butter', value: '#FFF3C4' },
  { label: 'Peach', value: '#FFE4CC' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Lilac', value: '#EDD9F5' },
  { label: 'Sage', value: '#DDF0DA' },
];

const BG_PATTERNS = [
  { label: 'None', value: 'none' },
  { label: 'Dots', value: 'dots' },
  { label: 'Lines', value: 'lines' },
  { label: 'Grid', value: 'grid' },
  { label: 'Hearts', value: 'hearts' },
  { label: 'Stars', value: 'stars' },
  { label: 'Dashes', value: 'dashes' },
  { label: 'Waves', value: 'waves' },
];

const STICKER_CATEGORIES = [
  {
    name: '🌸 Nature',
    stickers: ['🌸', '🌺', '🌻', '🌼', '🌷', '🍀', '🌿', '🍃', '🦋', '🐝', '🌙', '⭐', '🌈', '☀️', '🌤️', '⛅', '🌧️', '❄️', '🍂', '🍁'],
  },
  {
    name: '🐾 Animals',
    stickers: ['🐱', '🐰', '🐼', '🐨', '🦊', '🐶', '🐸', '🐭', '🐹', '🦄', '🐙', '🦋', '🐧', '🦉', '🐺', '🦝', '🐻', '🐯', '🦁', '🐮'],
  },
  {
    name: '🍓 Food',
    stickers: ['🍓', '🍒', '🫐', '🍰', '🧁', '🍪', '🍩', '🍦', '☕', '🧋', '🍵', '🎂', '🍫', '🍬', '🍭', '🥐', '🥞', '🍑', '🍋', '🫖'],
  },
  {
    name: '💕 Hearts',
    stickers: ['💖', '💕', '💗', '💓', '💝', '💘', '💞', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '💌', '💟', '♥️'],
  },
  {
    name: '✨ Magic',
    stickers: ['✨', '🌟', '💫', '⚡', '🔮', '🪄', '🎩', '🎪', '🎠', '🎭', '🎨', '🎀', '🎁', '🎈', '🎉', '🎊', '🪅', '🌠', '🎆', '🎇'],
  },
  {
    name: '📚 Study',
    stickers: ['📚', '📖', '📝', '✏️', '🖊️', '📐', '📏', '🗒️', '🗓️', '📌', '📎', '🖇️', '📋', '📊', '💡', '🔭', '🔬', '🧪', '🎓', '🏆'],
  },
];

const TEXT_COLORS = ['#5D4037', '#8D6E63', '#E91E63', '#9C27B0', '#3F51B5', '#009688', '#4CAF50', '#FF9800', '#FF5722', '#607D8B', '#000000', '#FFFFFF'];

// ── Pattern SVG Backgrounds ───────────────────────────────────────────────────

function getPatternStyle(pattern: string, bgColor: string): React.CSSProperties {
  const base: React.CSSProperties = { backgroundColor: bgColor };
  switch (pattern) {
    case 'dots':
      return { ...base, backgroundImage: 'radial-gradient(circle, rgba(141,110,99,0.2) 1px, transparent 1px)', backgroundSize: '20px 20px' };
    case 'lines':
      return { ...base, backgroundImage: 'repeating-linear-gradient(0deg, rgba(141,110,99,0.12) 0, rgba(141,110,99,0.12) 1px, transparent 1px, transparent 28px)' };
    case 'grid':
      return { ...base, backgroundImage: 'linear-gradient(rgba(141,110,99,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(141,110,99,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' };
    case 'hearts':
      return { ...base, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ctext x='10' y='28' font-size='20' opacity='0.12'%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3C/svg%3E")`, backgroundSize: '40px 40px' };
    case 'stars':
      return { ...base, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ctext x='8' y='28' font-size='18' opacity='0.13'%3E%E2%AD%90%3C/text%3E%3C/svg%3E")`, backgroundSize: '40px 40px' };
    case 'dashes':
      return { ...base, backgroundImage: 'repeating-linear-gradient(45deg, rgba(141,110,99,0.1) 0, rgba(141,110,99,0.1) 5px, transparent 5px, transparent 15px)' };
    case 'waves':
      return { ...base, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='20'%3E%3Cpath d='M0 10 Q15 0 30 10 Q45 20 60 10' fill='none' stroke='rgba(141,110,99,0.15)' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 20px' };
    default:
      return base;
  }
}

// ── Mini hook: generate id ────────────────────────────────────────────────────
function uid() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScrapbookCanvasProps {
  note: Note;
  onSave: (noteId: string, updates: Partial<Note>) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ScrapbookCanvas: React.FC<ScrapbookCanvasProps> = ({ note, onSave }) => {
  const parseInitialData = (): ScrapbookData => {
    try {
      if (note.content && typeof note.content === 'object' && note.content.__scrapbook) {
        return note.content as ScrapbookData;
      }
    } catch {}
    return { elements: [], bgColor: '#FFF8F0', bgPattern: 'none' };
  };

  const [data, setData] = useState<ScrapbookData>(parseInitialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  // Panel states
  const [panel, setPanel] = useState<'none' | 'stickers' | 'bg' | 'image'>('none');
  const [stickerTab, setStickerTab] = useState(0);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');

  // Autosave
  const saveTimer = useRef<any>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const canvasRef = useRef<HTMLDivElement>(null);

  const scheduleSave = useCallback((newData: ScrapbookData) => {
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await onSave(note.id, { content: { ...newData, __scrapbook: true } });
      setSaveStatus('saved');
    }, 1500);
  }, [note.id, onSave]);

  const updateData = useCallback((updater: (prev: ScrapbookData) => ScrapbookData) => {
    setData((prev) => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Element operations ───────────────────────────────────────────────────

  const addText = () => {
    const el: CanvasElement = {
      id: uid(), type: 'text',
      x: 80, y: 80, width: 220, height: 60,
      rotation: 0, content: 'Write here...', fontSize: 16,
      fontWeight: 'normal', fontStyle: 'normal', color: '#5D4037',
    };
    updateData((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
    setPanel('none');
  };

  const addSticker = (emoji: string) => {
    const el: CanvasElement = {
      id: uid(), type: 'sticker',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 64, height: 64,
      rotation: (Math.random() - 0.5) * 20,
      emoji, emojiSize: 48,
    };
    updateData((prev) => ({ ...prev, elements: [...prev.elements, el] }));
  };

  const addImage = (src: string) => {
    if (!src) return;
    const el: CanvasElement = {
      id: uid(), type: 'image',
      x: 80, y: 80, width: 200, height: 160,
      rotation: 0, src, objectFit: 'cover',
    };
    updateData((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setPanel('none');
    setImageUrl('');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateData((prev) => ({ ...prev, elements: prev.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    updateData((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => e.id === selectedId ? { ...e, rotation: e.rotation + 15 } : e),
    }));
  };

  const updateElement = (id: string, patch: Partial<CanvasElement>) => {
    updateData((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => e.id === id ? { ...e, ...patch } : e),
    }));
  };

  // ── Drag logic ─────────────────────────────────────────────────────────────

  const handleMouseDownElement = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    setSelectedId(elId);
    const el = data.elements.find((x) => x.id === elId)!;
    setDraggingId(elId);
    setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  const handleMouseMoveCanvas = useCallback((e: React.MouseEvent) => {
    if (draggingId) {
      updateData((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === draggingId
            ? { ...el, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : el
        ),
      }));
    }
    if (resizingId) {
      const dx = e.clientX - resizeStart.mouseX;
      const dy = e.clientY - resizeStart.mouseY;
      updateData((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === resizingId
            ? { ...el, width: Math.max(60, resizeStart.w + dx), height: Math.max(40, resizeStart.h + dy) }
            : el
        ),
      }));
    }
  }, [draggingId, resizingId, dragOffset, resizeStart, updateData]);

  const handleMouseUpCanvas = useCallback(() => {
    setDraggingId(null);
    setResizingId(null);
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    const el = data.elements.find((x) => x.id === elId)!;
    setResizingId(elId);
    setResizeStart({ mouseX: e.clientX, mouseY: e.clientY, w: el.width, h: el.height });
  };

  // Deselect on canvas click
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) setSelectedId(null);
  };

  // Paste image from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => addImage(ev.target?.result as string);
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const selectedEl = data.elements.find((e) => e.id === selectedId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-surface" style={{ userSelect: draggingId || resizingId ? 'none' : 'auto' }}>

      {/* ── Top Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-surface/95 backdrop-blur flex-wrap">
        
        {/* Left: Page Title */}
        <div className="flex-1 min-w-[140px]">
          <input
            defaultValue={note.title}
            onBlur={(e) => onSave(note.id, { title: e.target.value })}
            className="text-base font-semibold text-text-primary bg-transparent border-none outline-none w-full"
            placeholder="Page title..."
          />
        </div>

        {/* Center: Tool buttons */}
        <div className="flex items-center gap-1">
          <ToolBtn
            icon={<Type size={14} />}
            label="Add Text"
            active={false}
            onClick={addText}
          />
          <ToolBtn
            icon={<Smile size={14} />}
            label="Stickers"
            active={panel === 'stickers'}
            onClick={() => setPanel(panel === 'stickers' ? 'none' : 'stickers')}
          />
          <ToolBtn
            icon={<ImageIcon size={14} />}
            label="Add Image"
            active={panel === 'image'}
            onClick={() => setPanel(panel === 'image' ? 'none' : 'image')}
          />
          <ToolBtn
            icon={<Palette size={14} />}
            label="Background"
            active={panel === 'bg'}
            onClick={() => setPanel(panel === 'bg' ? 'none' : 'bg')}
          />
        </div>

        {/* Right: selection actions + save status */}
        <div className="flex items-center gap-1 ml-auto">
          {selectedEl && (
            <>
              <ToolBtn icon={<RotateCcw size={13} />} label="Rotate" active={false} onClick={rotateSelected} />
              <ToolBtn icon={<Trash2 size={13} />} label="Delete" active={false} onClick={deleteSelected} danger />
            </>
          )}
          <span className={`text-[10px] font-mono ml-2 ${saveStatus === 'saving' ? 'text-amber-400' : 'text-green-400'}`}>
            {saveStatus === 'saving' ? '● saving...' : '✓ saved'}
          </span>
        </div>
      </div>

      {/* ── Sub-panel row ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border bg-[var(--color-elevated)]"
          >
            {/* Stickers Panel */}
            {panel === 'stickers' && (
              <div className="p-3">
                {/* Category tabs */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar mb-2">
                  {STICKER_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => setStickerTab(i)}
                      className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                        stickerTab === i ? 'bg-[#F4C2C2] text-[#5D4037] font-semibold' : 'bg-black/5 text-text-secondary hover:bg-black/10'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {STICKER_CATEGORIES[stickerTab].stickers.map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addSticker(s)}
                      className="text-2xl p-1 rounded hover:bg-black/5 transition"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Panel */}
            {panel === 'image' && (
              <div className="p-3 space-y-2">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setImageMode('url')}
                    className={`text-xs px-3 py-1 rounded-full ${imageMode === 'url' ? 'bg-[#F4C2C2] text-[#5D4037] font-semibold' : 'bg-black/5 text-text-secondary'}`}
                  >
                    <LinkIcon size={11} className="inline mr-1" /> From URL
                  </button>
                  <button
                    onClick={() => setImageMode('upload')}
                    className={`text-xs px-3 py-1 rounded-full ${imageMode === 'upload' ? 'bg-[#F4C2C2] text-[#5D4037] font-semibold' : 'bg-black/5 text-text-secondary'}`}
                  >
                    <Upload size={11} className="inline mr-1" /> Upload
                  </button>
                </div>
                {imageMode === 'url' ? (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL here..."
                      className="flex-1 text-xs bg-white/60 border border-border rounded px-2.5 py-1.5 outline-none focus:border-[#F4C2C2]"
                    />
                    <button
                      onClick={() => addImage(imageUrl)}
                      className="text-xs bg-[#F4C2C2] text-[#5D4037] font-semibold px-3 py-1.5 rounded hover:opacity-90 transition"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="flex items-center gap-2 text-xs bg-white/60 border border-dashed border-[#F4C2C2] rounded px-3 py-3 cursor-pointer hover:bg-[#FFF8F0] transition text-center justify-center">
                      <Upload size={14} className="text-[#8D6E63]" />
                      <span className="text-[#8D6E63]">Click to upload image from device</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
                <p className="text-[10px] text-text-muted">You can also paste (Ctrl+V) an image from clipboard!</p>
              </div>
            )}

            {/* Background Panel */}
            {panel === 'bg' && (
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[10px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">Page Color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateData((prev) => ({ ...prev, bgColor: c.value }))}
                        title={c.label}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          data.bgColor === c.value ? 'border-[#8D6E63] scale-110' : 'border-transparent hover:border-[#D8BFD8]'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">Pattern</p>
                  <div className="flex flex-wrap gap-1">
                    {BG_PATTERNS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => updateData((prev) => ({ ...prev, bgPattern: p.value }))}
                        className={`text-xs px-2.5 py-1 rounded-full transition ${
                          data.bgPattern === p.value ? 'bg-[#F4C2C2] text-[#5D4037] font-semibold' : 'bg-black/5 text-text-secondary hover:bg-black/10'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Canvas Area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        <div
          ref={canvasRef}
          className="relative mx-auto rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: '100%',
            minHeight: '640px',
            ...getPatternStyle(data.bgPattern, data.bgColor),
            cursor: draggingId ? 'grabbing' : 'default',
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
        >
          {/* Hint when empty */}
          {data.elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-5xl mb-3">✨</div>
              <p className="text-sm font-medium text-[#8D6E63] opacity-60">Your scrapbook page is empty</p>
              <p className="text-xs text-[#8D6E63] opacity-40 mt-1">Add text, stickers, or images using the toolbar above</p>
            </div>
          )}

          {/* Canvas Elements */}
          {data.elements.map((el) => (
            <CanvasElementRenderer
              key={el.id}
              el={el}
              isSelected={selectedId === el.id}
              onMouseDown={(e) => handleMouseDownElement(e, el.id)}
              onResizeMouseDown={(e) => handleResizeMouseDown(e, el.id)}
              onUpdate={(patch) => updateElement(el.id, patch)}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom Text Styling Bar (when text element selected) ───────── */}
      <AnimatePresence>
        {selectedEl?.type === 'text' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 border-t border-border bg-surface flex-wrap"
          >
            <span className="text-[10px] text-text-muted mr-1">TEXT:</span>
            <button
              onClick={() => updateElement(selectedId!, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`text-xs font-bold px-2 py-0.5 rounded ${selectedEl.fontWeight === 'bold' ? 'bg-[#F4C2C2] text-[#5D4037]' : 'bg-black/5 text-text-secondary'}`}
            >B</button>
            <button
              onClick={() => updateElement(selectedId!, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`text-xs italic px-2 py-0.5 rounded ${selectedEl.fontStyle === 'italic' ? 'bg-[#F4C2C2] text-[#5D4037]' : 'bg-black/5 text-text-secondary'}`}
            >I</button>
            <select
              value={selectedEl.fontSize || 16}
              onChange={(e) => updateElement(selectedId!, { fontSize: Number(e.target.value) })}
              className="text-xs bg-black/5 border border-border rounded px-1 py-0.5 outline-none"
            >
              {[10, 12, 14, 16, 20, 24, 32, 40, 48, 64].map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>
            <div className="flex gap-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateElement(selectedId!, { color: c })}
                  className={`w-4 h-4 rounded-full border transition ${selectedEl.color === c ? 'border-[#8D6E63] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

function ToolBtn({ icon, label, active, onClick, danger = false }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
        danger
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : active
          ? 'bg-[#F4C2C2] text-[#5D4037]'
          : 'bg-black/5 text-text-secondary hover:bg-black/10'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function CanvasElementRenderer({ el, isSelected, onMouseDown, onResizeMouseDown, onUpdate }: {
  el: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        cursor: 'grab',
        outline: isSelected ? '2px solid #F4C2C2' : 'none',
        outlineOffset: '2px',
        borderRadius: '6px',
        zIndex: isSelected ? 100 : 1,
      }}
    >
      {/* Inner content */}
      {el.type === 'text' && (
        <textarea
          value={el.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: '"Outfit", cursive',
            fontSize: el.fontSize || 16,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            color: el.color || '#5D4037',
            lineHeight: 1.5,
            padding: '4px',
            cursor: 'text',
            overflowWrap: 'break-word',
          }}
        />
      )}

      {el.type === 'sticker' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: el.emojiSize || 48,
            lineHeight: 1,
            cursor: 'grab',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
          }}
        >
          {el.emoji}
        </div>
      )}

      {el.type === 'image' && (
        <img
          src={el.src}
          alt="scrapbook"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: el.objectFit || 'cover',
            borderRadius: '6px',
            pointerEvents: 'none',
            display: 'block',
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="160"%3E%3Crect width="200" height="160" fill="%23F4C2C2"/%3E%3Ctext x="50%25" y="50%25" font-size="32" text-anchor="middle" dominant-baseline="middle"%3E🖼️%3C/text%3E%3C/svg%3E'; }}
        />
      )}

      {/* Resize handle (bottom-right) */}
      {isSelected && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 14,
            height: 14,
            backgroundColor: '#F4C2C2',
            border: '2px solid #8D6E63',
            borderRadius: '50%',
            cursor: 'se-resize',
            zIndex: 200,
          }}
        />
      )}
    </div>
  );
}
