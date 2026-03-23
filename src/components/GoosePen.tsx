import { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Globe, TerminalSquare, Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export type VFS = { [path: string]: string };

export type BrowserState = {
  currentUrl: string;
  history: string[];
  content: string;
};

export type TerminalEntry = {
  type: 'input' | 'output' | 'error';
  content: string;
};

export interface GoosePenState {
  vfs: VFS;
  browser: BrowserState;
  terminal: {
    history: TerminalEntry[];
    cwd: string;
  };
}

interface GoosePenProps {
  state: GoosePenState;
  setState: React.Dispatch<React.SetStateAction<GoosePenState>>;
}

export default function GoosePen({ state, setState }: GoosePenProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'browser' | 'terminal'>('terminal');
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [state.terminal.history, activeTab]);

  const handleTerminalCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.trim();
      setTerminalInput('');
      
      if (!cmd) return;

      const args = cmd.split(' ');
      const command = args[0];
      
      let output = '';
      let isError = false;
      let newCwd = state.terminal.cwd;

      // Basic simulated shell
      try {
        switch (command) {
          case 'help':
            output = 'Available commands: help, ls, pwd, cd, cat, echo, mkdir, touch, rm, clear, curl';
            break;
          case 'pwd':
            output = newCwd;
            break;
          case 'ls':
            const paths = Object.keys(state.vfs);
            // Just list all files for now, ignoring directories
            output = paths.length > 0 ? paths.join('\n') : '';
            break;
          case 'cat':
            if (args[1]) {
              const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
              if (state.vfs[path] !== undefined) {
                output = state.vfs[path];
              } else {
                output = `cat: ${args[1]}: No such file or directory`;
                isError = true;
              }
            } else {
              output = 'cat: missing operand';
              isError = true;
            }
            break;
          case 'echo':
            output = args.slice(1).join(' ');
            break;
          case 'touch':
            if (args[1]) {
              const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
              setState(prev => ({
                ...prev,
                vfs: { ...prev.vfs, [path]: prev.vfs[path] || '' }
              }));
            } else {
              output = 'touch: missing operand';
              isError = true;
            }
            break;
          case 'rm':
            if (args[1]) {
              const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
              if (state.vfs[path] !== undefined) {
                setState(prev => {
                  const newVfs = { ...prev.vfs };
                  delete newVfs[path];
                  return { ...prev, vfs: newVfs };
                });
              } else {
                output = `rm: cannot remove '${args[1]}': No such file or directory`;
                isError = true;
              }
            } else {
              output = 'rm: missing operand';
              isError = true;
            }
            break;
          case 'clear':
            setState(prev => ({
              ...prev,
              terminal: { ...prev.terminal, history: [] }
            }));
            return; // Early return to avoid adding the command to history
          case 'cd':
            if (args[1]) {
              if (args[1] === '..') {
                const parts = newCwd.split('/').filter(Boolean);
                parts.pop();
                newCwd = '/' + parts.join('/');
              } else if (args[1] === '/') {
                newCwd = '/';
              } else {
                const newPath = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
                newCwd = newPath;
              }
            } else {
              newCwd = '/';
            }
            break;
          case 'mkdir':
            if (args[1]) {
              output = '';
            } else {
              output = 'mkdir: missing operand';
              isError = true;
            }
            break;
          case 'curl':
            if (args[1]) {
              output = `curl: fetching ${args[1]}... (Simulated, use browseUrl tool for real fetch)`;
            } else {
              output = 'curl: try \'curl --help\' or \'curl --manual\' for more information';
              isError = true;
            }
            break;
          default:
            output = `${command}: command not found`;
            isError = true;
        }
      } catch (err: any) {
        output = err.message;
        isError = true;
      }

      setState(prev => ({
        ...prev,
        terminal: {
          ...prev.terminal,
          cwd: newCwd,
          history: [
            ...prev.terminal.history,
            { type: 'input', content: `${prev.terminal.cwd}$ ${cmd}` },
            ...(output ? [{ type: isError ? 'error' : 'output', content: output } as TerminalEntry] : [])
          ]
        }
      }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 text-zinc-100 font-mono text-sm">
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('terminal')}
          className={cn(
            "flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'terminal' ? "border-white text-white bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <TerminalIcon className="w-4 h-4" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            "flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'files' ? "border-white text-white bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Folder className="w-4 h-4" />
          <span>File System</span>
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={cn(
            "flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'browser' ? "border-white text-white bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>Browser</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col font-mono text-xs">
            <div className="flex-1 overflow-y-auto space-y-1 pb-4">
              <div className="text-zinc-500 mb-4">
                Welcome to GoosePen Terminal v1.0.0
                <br />
                Type 'help' to see available commands.
              </div>
              {state.terminal?.history.map((entry, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "whitespace-pre-wrap break-all",
                  entry.type === 'input' ? "text-white" : 
                  entry.type === 'error' ? "text-red-400" : "text-zinc-300"
                  )}
                >
                  {entry.content}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            <div className="flex items-center text-white mt-2 shrink-0">
              <span className="mr-2">{state.terminal?.cwd || '/home/user'}$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalCommand}
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-zinc-400 mb-4">
              <TerminalSquare className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Virtual File System</span>
            </div>
            {Object.keys(state.vfs).length === 0 ? (
              <p className="text-zinc-600 italic">No files created yet.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(state.vfs).map(([path, content]) => (
                  <div key={path} className="space-y-2">
                    <div className="flex items-center space-x-2 text-white">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{path}</span>
                    </div>
                    <pre className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg overflow-x-auto text-xs text-zinc-300">
                      {content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'browser' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-zinc-400 mb-4">
              <Globe className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Simulated Browser</span>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center space-x-2">
              <span className="text-zinc-500">URL:</span>
              <span className="text-white truncate flex-1">
                {state.browser.currentUrl || 'about:blank'}
              </span>
            </div>

            {state.browser.history.length > 0 && (
              <div className="text-xs text-zinc-500">
                History: {state.browser.history.join(' → ')}
              </div>
            )}

            <div className="mt-4">
              {state.browser.content ? (
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-sans">
                    {state.browser.content.substring(0, 2000)}
                    {state.browser.content.length > 2000 && '...\n\n[Content truncated for display]'}
                  </pre>
                </div>
              ) : (
                <p className="text-zinc-600 italic">No page loaded.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
