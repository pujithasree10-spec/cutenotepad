import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Note, Folder } from '../types';
import { ScrapbookCanvas } from '../features/journal/ScrapbookCanvas';
import { TemplateGallery } from '../features/journal/TemplateGallery';
import {
  FolderPlus,
  Plus,
  Search,
  BookOpen,
  Pin,
  Trash2,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

export const Journal: React.FC = () => {
  const { user } = useAuthStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditorMobile, setShowEditorMobile] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDirectories();
  }, [user, activeFolderId]);

  const loadDirectories = async () => {
    setLoading(true);
    try {
      // 1. Fetch folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .order('position', { ascending: true });
      setFolders(foldersData || []);

      // 2. Fetch notes
      let query = supabase
        .from('notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (activeFolderId) {
        query = query.eq('folder_id', activeFolderId);
      }

      const { data: notesData } = await query;
      setNotes(notesData || []);
    } catch (e) {
      console.error('Error loading journal items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name || !user) return;

    try {
      const { error } = await supabase.from('folders').insert({
        name,
        user_id: user.id,
      });
      if (error) throw error;
      loadDirectories();
    } catch (e) {
      console.error('Error creating folder:', e);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this folder? Notes inside will not be deleted.')) return;

    try {
      const { error } = await supabase.from('folders').delete().eq('id', folderId);
      if (error) throw error;
      if (activeFolderId === folderId) {
        setActiveFolderId(null);
      }
      loadDirectories();
    } catch (e) {
      console.error('Error deleting folder:', e);
    }
  };

  const handleCreateNote = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          folder_id: activeFolderId,
          content: { type: 'doc', content: [] },
          tags: [],
          cover_url: null,
          word_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      setNotes([data, ...notes]);
      setSelectedNote(data);
      setShowEditorMobile(true);
    } catch (e) {
      console.error('Error creating note:', e);
    }
  };

  const handleSelectTemplate = async (templateContent: any, templateTitle: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: templateTitle,
          folder_id: activeFolderId,
          content: templateContent,
          tags: [],
          cover_url: null,
          word_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      setNotes([data, ...notes]);
      setSelectedNote(data);
      setShowEditorMobile(true);
    } catch (e) {
      console.error('Error creating note from template:', e);
    }
  };

  const handleSaveNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) throw error;

      // Update local state
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)));
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({ ...selectedNote, ...updates });
      }
    } catch (e) {
      console.error('Error saving note:', e);
      throw e;
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this note permanently?')) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
      
      setNotes(notes.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setShowEditorMobile(false);
      }
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const handleTogglePinNote = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !note.is_pinned;
    try {
      await handleSaveNote(note.id, { is_pinned: nextPinned });
      // Reload directories to enforce sorting
      loadDirectories();
    } catch (e) {
      console.error('Error toggling pin:', e);
    }
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = n.title.toLowerCase().includes(query);
    const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(query)) || false;
    return titleMatch || tagMatch;
  });

  return (
    <PageWrapper>
      <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden relative">
        
        {/* Left Explorer Sidebar */}
        <div
          className={`w-full md:w-80 flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden ${
            showEditorMobile ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Controls */}
          <div className="p-4 border-b border-border-soft space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-text-secondary uppercase">Journal Explorer</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateFolder}
                  className="p-1.5 hover:bg-white/5 rounded border border-border text-text-secondary hover:text-text-primary transition"
                  title="New Folder"
                >
                  <FolderPlus size={14} />
                </button>
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="p-1.5 hover:bg-white/5 rounded border border-border text-accent hover:text-accent transition flex items-center justify-center"
                  title="Use Template"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  onClick={handleCreateNote}
                  className="bg-accent border border-accent hover:opacity-90 text-white p-1.5 rounded transition flex items-center justify-center"
                  title="New Note"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Note search input */}
            <div className="flex items-center gap-2 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-text-secondary focus-within:border-accent">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search notes or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-text-primary placeholder-text-muted w-full"
              />
            </div>
          </div>

          {/* Folders navigation list */}
          <div className="px-2 py-3 border-b border-border-soft flex gap-1.5 overflow-x-auto select-none no-scrollbar">
            <button
              onClick={() => setActiveFolderId(null)}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition ${
                activeFolderId === null
                  ? 'bg-accent/10 border border-accent/25 text-accent font-medium'
                  : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All Notes
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeFolderId === folder.id
                    ? 'bg-accent/10 border border-accent/25 text-accent font-medium'
                    : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{folder.icon}</span>
                <span>{folder.name}</span>
                <span
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                  className="hover:text-danger ml-1 text-[9px] bg-black/10 px-1 rounded"
                >
                  ✕
                </span>
              </button>
            ))}
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border border-accent border-t-transparent"></div>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-xs text-text-muted italic">
                No entries found.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setShowEditorMobile(true);
                  }}
                  className={`p-3 rounded-md border transition cursor-pointer relative group flex flex-col justify-between min-h-[72px] ${
                    selectedNote?.id === note.id
                      ? 'bg-accent/10 border-accent'
                      : 'bg-elevated/50 border-border hover:border-text-secondary'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-medium text-text-primary truncate flex-1 leading-normal">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePinNote(note, e)}
                        className={`p-0.5 rounded hover:bg-white/5 ${
                          note.is_pinned ? 'text-accent' : 'text-text-muted'
                        }`}
                        title={note.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={10} className={note.is_pinned ? 'fill-accent' : ''} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-0.5 rounded hover:bg-white/5 text-text-muted hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-text-secondary">
                      {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
                    </span>
                    {note.is_pinned && (
                      <Pin size={10} className="text-accent fill-accent md:group-hover:hidden" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center / Right Editor Pane */}
        <div
          className={`flex-1 flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden ${
            showEditorMobile ? 'flex' : 'hidden md:flex'
          }`}
        >
          {showEditorMobile && (
            <div className="md:hidden border-b border-border-soft p-3 flex items-center bg-surface">
              <button
                onClick={() => setShowEditorMobile(false)}
                className="flex items-center gap-1 text-xs text-accent bg-transparent border-none outline-none font-medium cursor-pointer"
              >
                <ChevronLeft size={16} /> Back to Explorer
              </button>
            </div>
          )}

          {selectedNote ? (
            <div className="flex-1 overflow-y-auto">
              <ScrapbookCanvas
                note={selectedNote}
                onSave={handleSaveNote}
              />
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-surface/30">
              {/* Seedling / Open book SVG */}
              <BookOpen size={48} className="text-accent/40 mb-4 stroke-[1.5]" />
              <h3 className="font-display text-xl italic text-text-primary mb-1">
                Your story starts here.
              </h3>
              <p className="text-xs text-text-secondary max-w-xs mb-4">
                Select an entry from the explorer or create a new note to start writing.
              </p>
              <button
                onClick={handleCreateNote}
                className="bg-accent text-white text-xs px-4 py-2 rounded-md hover:opacity-90 transition active:scale-[0.98] font-medium shadow-accent"
              >
                Create First Entry
              </button>
            </div>
          )}
        </div>
        
      </div>

      {showTemplateGallery && (
        <TemplateGallery
          onClose={() => setShowTemplateGallery(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
    </PageWrapper>
  );
};
