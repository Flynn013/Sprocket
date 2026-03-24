/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Blocks, Settings as SettingsIcon, PanelRightClose, PanelRightOpen, Cpu, Menu, X, TerminalSquare, Bird, Square, Plus, Trash2, Package, BookOpen } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { cn } from './lib/utils';
import Chat from './components/Chat';
import Extensions from './components/Extensions';
import Settings from './components/Settings';
import GoosePen, { GoosePenState } from './components/GoosePen';
import LocalInference from './components/LocalInference';
import { VendingMachine } from './components/VendingMachine';
import MemoryCodex from './components/MemoryCodex';
import { vaultGardener } from './engine/VaultGardener';

export type AppState = {
  userName: string;
  tools: {
    googleSearch: boolean;
    readWebpage: boolean;
    goosePen: boolean;
    memory: boolean;
  };
  systemInstruction: string;
  userMemories: string;
  llmProvider: 'gemini' | 'local';
  localLlmConfig: {
    endpoint: string;
    model: string;
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'extensions' | 'settings' | 'local' | 'vending' | 'codex'>('chat');
  const [isGoosePenOpen, setIsGoosePenOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);

  const [goosePenState, setGoosePenState] = useState<GoosePenState>({
    activeTab: 'vault',
    vfs: {},
    browser: { currentUrl: '', history: [], content: '' },
    terminal: { history: [], cwd: '/home/user' },
    pecking: { displayValue: '0', history: [] }
  });

  const [appState, setAppState] = useState<AppState>({
    userName: "User",
    tools: {
      googleSearch: false,
      readWebpage: false,
      goosePen: false,
      memory: false,
    },
    systemInstruction: "You are a helpful assistant named Sprocket. Your goal is to complete the requested task through any means necessary. Be persistent and creative in finding solutions. For complex, multi-step tasks, you MUST use the `managePlan` tool to create a structured strategic plan. Update the plan as you complete steps. This plan is visible to the user in the 'Agent Strategic Plans' tab in the System Panel. DO NOT ask the user for help or additional information - you must solve the problem autonomously where possible. You have access to a local memory vault (BrainBucket) and a PeckingStation to interact with apps.",
    userMemories: "",
    llmProvider: 'gemini',
    localLlmConfig: {
      endpoint: 'http://localhost:11434/v1',
      model: 'llama-3-8b.gguf'
    }
  });

  useEffect(() => {
    const loadSessions = async () => {
      const list = await vaultGardener.listSessions();
      setSessions(list.sort().reverse());
    };
    loadSessions();

    const handleSessionsUpdated = () => loadSessions();
    window.addEventListener('sessions-updated', handleSessionsUpdated);
    return () => window.removeEventListener('sessions-updated', handleSessionsUpdated);
  }, []);

  useEffect(() => {
    const handleSaveMemory = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const newFact = customEvent.detail;
      setAppState(prev => ({
        ...prev,
        userMemories: prev.userMemories 
          ? `${prev.userMemories}\n- ${newFact}`
          : `- ${newFact}`
      }));
    };

    window.addEventListener('goose-save-memory', handleSaveMemory);
    return () => window.removeEventListener('goose-save-memory', handleSaveMemory);
  }, []);

  // Dynamically build the final system instruction including memories
  const finalSystemInstruction = `${appState.systemInstruction}
  
The user's name is ${appState.userName}. Please address them accordingly.

${appState.userMemories ? `USER PREFS, FACTS AND IMPORTANT MEMORIES TO consider:\n${appState.userMemories}` : ''}`;

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setActiveTab('chat');
    setIsNavOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    await vaultGardener.deleteSession(id);
    window.dispatchEvent(new CustomEvent('sessions-updated'));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const handlePan = (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    const edgeThreshold = 60; // Detect swipes starting near the edges
    
    // Get the starting point of the pan
    const startX = info.point.x - info.offset.x;
    const windowWidth = window.innerWidth;

    // Swipe from left edge to right -> Open GoosePen (Left Panel)
    if (startX < edgeThreshold && info.offset.x > swipeThreshold) {
      setIsGoosePenOpen(true);
    }
    // Swipe from right edge to left -> Open Menu (Right Panel)
    if (startX > windowWidth - edgeThreshold && info.offset.x < -swipeThreshold) {
      setIsNavOpen(true);
    }
    
    // Swipe from right to left while GoosePen is open -> Close GoosePen
    if (isGoosePenOpen && info.offset.x < -swipeThreshold) {
      setIsGoosePenOpen(false);
    }
    // Swipe from left to right while Nav is open -> Close Nav
    if (isNavOpen && info.offset.x > swipeThreshold) {
      setIsNavOpen(false);
    }
  };

  return (
    <motion.div 
      className="flex flex-col h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-sans"
      onPanEnd={handlePan}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
        <button
          onClick={() => setIsGoosePenOpen(!isGoosePenOpen)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl transition-colors border-2",
            isGoosePenOpen ? "text-white bg-white/10 border-white" : "text-zinc-500 border-zinc-800 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
          )}
          title="Toggle System"
        >
          <Square className="w-5 h-5" />
        </button>
        
          <h1 className="text-lg font-semibold tracking-tight absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            {activeTab === 'chat' && (
              <span className="text-2xl font-bold tracking-widest uppercase opacity-80">Sprocket</span>
            )}
            {activeTab === 'extensions' && 'Extensions'}
            {activeTab === 'settings' && 'Settings'}
            {activeTab === 'local' && 'Local Inference'}
            {activeTab === 'vending' && 'Vending Machine'}
            {activeTab === 'codex' && 'Memory Codex'}
          </h1>

        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className={cn(
            "p-2 rounded-xl transition-colors w-10 h-10 flex items-center justify-center",
            isNavOpen ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex">
        {/* GoosePen Side Panel */}
        <AnimatePresence>
          {isGoosePenOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGoosePenOpen(false)}
              className="fixed inset-0 bg-black/60 z-20"
            />
          )}
        </AnimatePresence>

        <motion.div 
          initial={false}
          animate={{ width: isGoosePenOpen ? (window.innerWidth < 768 ? '85vw' : '384px') : 0 }}
          className={cn(
            "h-full border-zinc-800 bg-zinc-950 z-40 fixed md:relative overflow-hidden shrink-0",
            isGoosePenOpen ? "border-r shadow-2xl" : "border-r-0"
          )}
        >
          <div className="w-[85vw] md:w-96 h-full">
            <GoosePen state={goosePenState} setState={setGoosePenState} />
          </div>
        </motion.div>

        <div className="flex-1 relative overflow-hidden">
          <div className={cn("absolute inset-0 transition-opacity duration-200", activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <Chat 
              appState={appState} 
              setAppState={setAppState}
              finalSystemInstruction={finalSystemInstruction} 
              setGoosePenState={setGoosePenState}
              currentSessionId={currentSessionId}
              setCurrentSessionId={setCurrentSessionId}
            />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-200 overflow-y-auto", activeTab === 'extensions' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <Extensions appState={appState} setAppState={setAppState} />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-200 overflow-y-auto", activeTab === 'settings' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <Settings appState={appState} setAppState={setAppState} />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-200 overflow-y-auto", activeTab === 'local' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <LocalInference appState={appState} setAppState={setAppState} />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-200 overflow-y-auto", activeTab === 'vending' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <VendingMachine />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-200 overflow-y-auto", activeTab === 'codex' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <MemoryCodex />
          </div>
        </div>

        {/* Navigation Side Panel */}
        <AnimatePresence>
          {isNavOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavOpen(false)}
              className="fixed inset-0 bg-black/60 z-30"
            />
          )}
        </AnimatePresence>

        <motion.div 
          className={cn(
            "absolute top-0 right-0 h-full transition-all duration-300 ease-in-out border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-xl z-30 flex flex-col shadow-2xl overflow-hidden",
            isNavOpen ? "w-64 translate-x-0" : "w-0 translate-x-full border-l-0"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <span className="font-semibold text-zinc-100 uppercase text-xs tracking-widest">Sprocket</span>
            <button onClick={() => setIsNavOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col p-2 space-y-1 overflow-y-auto flex-1">
            <button
              onClick={() => { setActiveTab('chat'); setIsNavOpen(false); }}
              className={cn(
                "flex items-center p-3 rounded-xl transition-colors text-left",
                activeTab === 'chat' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <MessageSquare className="w-5 h-5 mr-3 shrink-0" />
              <span className="font-medium">Chat</span>
            </button>

            {/* Previous Chats Submenu */}
            <div className="mt-4 px-3 py-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Brain Logs</span>
                <button onClick={handleNewChat} className="p-1 text-zinc-500 hover:text-white transition-colors" title="New Chat">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto scrollbar-hide">
                {sessions.map(id => (
                  <div key={id} className="group flex items-center gap-1">
                    <button
                      onClick={() => { setCurrentSessionId(id); setActiveTab('chat'); setIsNavOpen(false); }}
                      className={cn(
                        "flex-1 text-left p-2 rounded-lg text-xs transition-colors truncate",
                        currentSessionId === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                      )}
                    >
                      {id.replace('chat_', '').substring(0, 18)}
                    </button>
                    <button 
                      onClick={() => handleDeleteSession(id)}
                      className="p-1.5 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-[10px] text-zinc-800 italic px-1">No previous logs</div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-zinc-900">
              <button
                onClick={() => { setActiveTab('codex'); setIsNavOpen(false); }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-colors text-left w-full mb-1",
                  activeTab === 'codex' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                <BookOpen className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">Memory Codex</span>
              </button>
              <button
                onClick={() => { setActiveTab('vending'); setIsNavOpen(false); }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-colors text-left w-full",
                  activeTab === 'vending' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                <Package className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">Vending Machine</span>
              </button>
              <button
                onClick={() => { setActiveTab('extensions'); setIsNavOpen(false); }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-colors text-left w-full",
                  activeTab === 'extensions' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                <Blocks className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">Extensions</span>
              </button>
              <button
                onClick={() => { setActiveTab('local'); setIsNavOpen(false); }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-colors text-left w-full",
                  activeTab === 'local' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                <Cpu className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">Local AI</span>
              </button>
              <button
                onClick={() => { setActiveTab('settings'); setIsNavOpen(false); }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-colors text-left w-full",
                  activeTab === 'settings' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                <SettingsIcon className="w-5 h-5 mr-3 shrink-0" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </nav>
        </motion.div>
      </main>
    </motion.div>
  );
}

