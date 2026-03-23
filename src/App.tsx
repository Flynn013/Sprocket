/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Blocks, Settings as SettingsIcon, PanelRightClose, PanelRightOpen, Cpu, Menu, X, TerminalSquare, Bird } from 'lucide-react';
import { cn } from './lib/utils';
import Chat from './components/Chat';
import Extensions from './components/Extensions';
import Settings from './components/Settings';
import GoosePen, { GoosePenState } from './components/GoosePen';
import LocalInference from './components/LocalInference';

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
  const [activeTab, setActiveTab] = useState<'chat' | 'extensions' | 'settings' | 'local'>('chat');
  const [isGoosePenOpen, setIsGoosePenOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [goosePenState, setGoosePenState] = useState<GoosePenState>({
    vfs: {},
    browser: { currentUrl: '', history: [], content: '' },
    terminal: { history: [], cwd: '/home/user' }
  });

  const [appState, setAppState] = useState<AppState>({
    userName: "User",
    tools: {
      googleSearch: false,
      readWebpage: false,
      goosePen: false,
      memory: false,
    },
    systemInstruction: "You are a helpful assistant named Goose. Your goal is to complete the requested task through any means necessary. Be persistent and creative in finding solutions. DO NOT ask the user for help or additional information - you must solve the problem autonomously where possible.",
    userMemories: "",
    llmProvider: 'gemini',
    localLlmConfig: {
      endpoint: 'http://localhost:11434/v1',
      model: 'llama3'
    }
  });

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

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
        <button
          onClick={() => setIsGoosePenOpen(!isGoosePenOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors font-medium text-sm",
            isGoosePenOpen ? "text-white bg-white/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
          title="Toggle GoosePen"
        >
          <Bird className="w-5 h-5" />
          <span className="hidden sm:inline">GoosePen</span>
        </button>
        
        <h1 className="text-lg font-semibold tracking-tight absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          {activeTab === 'chat' && (
            <span className="text-5xl leading-none" style={{ filter: 'brightness(0)' }}>🪿</span>
          )}
          {activeTab === 'extensions' && 'Extensions'}
          {activeTab === 'settings' && 'Settings'}
          {activeTab === 'local' && 'Local Inference'}
        </h1>

        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className={cn(
            "p-2 rounded-xl transition-colors",
            isNavOpen ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 relative overflow-hidden">
          <div className={cn("absolute inset-0 transition-opacity duration-200", activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
            <Chat 
              appState={appState} 
              finalSystemInstruction={finalSystemInstruction} 
              setGoosePenState={setGoosePenState}
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
        </div>

        {/* GoosePen Side Panel */}
        <div className={cn(
          "transition-all duration-300 ease-in-out border-l border-zinc-800 bg-zinc-950 z-20",
          isGoosePenOpen ? "w-96 translate-x-0" : "w-0 translate-x-full border-l-0"
        )}>
          <div className="w-96 h-full">
            <GoosePen state={goosePenState} setState={setGoosePenState} />
          </div>
        </div>

        {/* Navigation Side Panel */}
        <div className={cn(
          "absolute top-0 right-0 h-full transition-all duration-300 ease-in-out border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-xl z-30 flex flex-col shadow-2xl",
          isNavOpen ? "w-64 translate-x-0" : "w-0 translate-x-full border-l-0"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <span className="font-semibold text-zinc-100">Menu</span>
            <button onClick={() => setIsNavOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col p-2 space-y-1 overflow-y-auto">
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
            <button
              onClick={() => { setActiveTab('extensions'); setIsNavOpen(false); }}
              className={cn(
                "flex items-center p-3 rounded-xl transition-colors text-left",
                activeTab === 'extensions' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Blocks className="w-5 h-5 mr-3 shrink-0" />
              <span className="font-medium">Extensions</span>
            </button>
            <button
              onClick={() => { setActiveTab('local'); setIsNavOpen(false); }}
              className={cn(
                "flex items-center p-3 rounded-xl transition-colors text-left",
                activeTab === 'local' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Cpu className="w-5 h-5 mr-3 shrink-0" />
              <span className="font-medium">Local AI</span>
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setIsNavOpen(false); }}
              className={cn(
                "flex items-center p-3 rounded-xl transition-colors text-left",
                activeTab === 'settings' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <SettingsIcon className="w-5 h-5 mr-3 shrink-0" />
              <span className="font-medium">Settings</span>
            </button>
          </nav>
        </div>
      </main>
    </div>
  );
}

