import React, { useState, useEffect } from 'react';
import { Search, Book, Edit3, Save, Trash2, ChevronRight, Brain, Clock, FileText, Plus, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { vaultGardener } from '../engine/VaultGardener';

interface Neuron {
  title: string;
  content: string;
  lastModified?: string;
}

export default function MemoryCodex() {
  const [neurons, setNeurons] = useState<string[]>([]);
  const [selectedNeuron, setSelectedNeuron] = useState<Neuron | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadNeurons();
    window.addEventListener('vault-updated', loadNeurons);
    return () => window.removeEventListener('vault-updated', loadNeurons);
  }, []);

  const loadNeurons = async () => {
    try {
      setIsLoading(true);
      const files = await vaultGardener.list_vault_dir('neurons');
      setNeurons(files.map(f => f.replace('.md', '')));
    } catch (error) {
      console.error("Failed to load neurons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNeuron = async (title: string) => {
    try {
      const content = await vaultGardener.read_vault_file(`neurons/${title}.md`);
      setSelectedNeuron({ title, content });
      setEditContent(content);
      setIsEditing(false);
      setIsCreating(false);
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (error) {
      console.error("Failed to read neuron:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedNeuron) return;
    try {
      await vaultGardener.write_vault_neuron(selectedNeuron.title, editContent);
      setSelectedNeuron({ ...selectedNeuron, content: editContent });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save neuron:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedNeuron) return;
    if (!confirm(`Are you sure you want to delete the neuron "${selectedNeuron.title}"? This action is irreversible.`)) return;
    
    try {
      await vaultGardener.delete_vault_neuron(selectedNeuron.title);
      setSelectedNeuron(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to delete neuron:", error);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await vaultGardener.write_vault_neuron(newTitle, "# " + newTitle + "\n\n(New neuron content)");
      setIsCreating(false);
      setNewTitle('');
      handleSelectNeuron(newTitle);
    } catch (error) {
      console.error("Failed to create neuron:", error);
    }
  };

  const filteredNeurons = neurons.filter(n => 
    n.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#0a0a0a] text-zinc-400 font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar: Neuron List */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 border-r border-zinc-900 flex flex-col bg-[#0a0a0a] transition-transform duration-300 transform lg:relative lg:translate-x-0 lg:z-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-900">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Memory Codex</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Neural Repository</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCreating(true)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-white"
                title="New Neuron"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-zinc-500 hover:text-white lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search neurons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-white/5 rounded-xl border border-white/20 mb-2"
            >
              <input
                autoFocus
                type="text"
                placeholder="Neuron Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 mb-2"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-1.5 bg-white text-black text-[10px] font-bold rounded-lg uppercase tracking-wider"
                >
                  Create
                </button>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded-lg uppercase tracking-wider"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="w-4 h-4 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Indexing...</span>
            </div>
          ) : filteredNeurons.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-zinc-600 italic">No neurons found in this sector.</p>
            </div>
          ) : (
            filteredNeurons.map((title) => (
              <button
                key={title}
                onClick={() => handleSelectNeuron(title)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                  selectedNeuron?.title === title 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg border transition-colors",
                  selectedNeuron?.title === title ? "bg-white/10 border-white/20" : "bg-zinc-900/50 border-zinc-800 group-hover:border-zinc-700"
                )}>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium truncate flex-1 text-left">{title}</span>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  selectedNeuron?.title === title ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                )} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Editor/Viewer */}
      <div className="flex-1 flex flex-col bg-black/40">
        <AnimatePresence mode="wait">
          {selectedNeuron ? (
            <motion.div
              key={selectedNeuron.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="p-4 lg:p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 lg:gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-white/5 rounded-lg border border-white/10 lg:hidden text-white"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/10 hidden sm:block">
                    <Book className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base lg:text-xl font-bold text-white tracking-tight truncate">{selectedNeuron.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last Synapse: Just Now
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={handleDelete}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                        title="Delete Neuron"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-800 hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                        EDIT NEURON
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        <Save className="w-4 h-4" />
                        COMMIT CHANGES
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full bg-transparent text-zinc-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                    spellCheck={false}
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed text-lg">
                      {selectedNeuron.content}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-6 left-6 p-2 bg-white/5 rounded-lg border border-white/10 lg:hidden text-white flex items-center gap-2 text-xs font-bold"
              >
                <Menu className="w-4 h-4" />
                OPEN CODEX
              </button>
              <div className="w-24 h-24 bg-white/5 rounded-full border border-white/10 flex items-center justify-center mb-6 animate-pulse">
                <Brain className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Neuron</h3>
              <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                Browse the neural repository to access and modify Sprocket's long-term memory structures.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
