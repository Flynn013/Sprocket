import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { sendMessage, Message, ToolCallbacks } from '../lib/gemini';
import { AppState } from '../App';
import { GoosePenState } from './GoosePen';
import { sprocketEngine } from '../engine/SprocketEngine';
import { vaultGardener } from '../engine/VaultGardener';
import { NativeBridge } from '../engine/NativeBridge';

export default function Chat({ 
  appState, 
  setAppState,
  finalSystemInstruction,
  setGoosePenState,
  currentSessionId,
  setCurrentSessionId
}: { 
  appState: AppState, 
  setAppState: React.Dispatch<React.SetStateAction<AppState>>,
  finalSystemInstruction: string,
  setGoosePenState: React.Dispatch<React.SetStateAction<GoosePenState>>,
  currentSessionId: string | null,
  setCurrentSessionId: (id: string | null) => void
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [engineStatus, setEngineStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load session when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      vaultGardener.loadSession(currentSessionId).then(setMessages).catch(err => {
        console.error("Failed to load session:", err);
        setMessages([]);
      });
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Auto-save session
  useEffect(() => {
    if (messages.length > 0) {
      const save = async () => {
        let id = currentSessionId;
        if (!id) {
          // Generate a title from the first message
          const firstMsg = messages.find(m => m.role === 'user')?.parts.find(p => p.text)?.text || 'New Chat';
          const title = firstMsg.substring(0, 20).replace(/[^a-z0-9]/gi, '_');
          id = `chat_${new Date().getTime()}_${title}`;
          setCurrentSessionId(id);
          window.dispatchEvent(new CustomEvent('sessions-updated'));
        }
        await vaultGardener.saveSession(id, messages);
      };
      save();
    }
  }, [messages, currentSessionId, setCurrentSessionId]);

  useEffect(() => {
    if (appState.llmProvider === 'local') {
      setEngineStatus('Initializing Native Engine...');
      sprocketEngine.init((progress) => {
        setEngineStatus(progress.text);
      }, appState.localLlmConfig.model).then(() => {
        setEngineStatus('');
      }).catch(err => {
        console.error(err);
        setEngineStatus('Failed to load model');
      });
    }
  }, [appState.llmProvider, appState.localLlmConfig.model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput((prev) => prev + finalTranscript + ' ');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
    setIsLoading(true);

    const toolCallbacks: ToolCallbacks = {
      writeFile: (path, content) => {
        setGoosePenState(prev => ({
          ...prev,
          vfs: { ...prev.vfs, [path]: content }
        }));
        return `Successfully wrote to ${path}`;
      },
      readFile: (path) => {
        let content = "";
        setGoosePenState(prev => {
          content = prev.vfs[path];
          return prev;
        });
        if (content !== undefined) {
          return content;
        }
        throw new Error(`File not found: ${path}`);
      },
      listDir: (path) => {
        let files: string[] = [];
        setGoosePenState(prev => {
          files = Object.keys(prev.vfs).filter(p => p.startsWith(path));
          return prev;
        });
        return files.length > 0 ? files.join('\n') : `No files found in ${path}`;
      },
      runCommand: (cmd) => {
        let output = '';
        let isError = false;
        
        setGoosePenState(prev => {
          const args = cmd.trim().split(' ');
          const command = args[0];
          let newCwd = prev.terminal.cwd;
          let newVfs = { ...prev.vfs };

          try {
            switch (command) {
              case 'help':
                output = 'Available commands: help, ls, pwd, cd, cat, echo, mkdir, touch, rm, clear, curl';
                break;
              case 'pwd':
                output = newCwd;
                break;
              case 'ls':
                const paths = Object.keys(newVfs);
                output = paths.length > 0 ? paths.join('\n') : '';
                break;
              case 'cat':
                if (args[1]) {
                  const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
                  if (newVfs[path] !== undefined) {
                    output = newVfs[path];
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
                  newVfs[path] = newVfs[path] || '';
                } else {
                  output = 'touch: missing operand';
                  isError = true;
                }
                break;
              case 'rm':
                if (args[1]) {
                  const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
                  if (newVfs[path] !== undefined) {
                    delete newVfs[path];
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
                return {
                  ...prev,
                  terminal: { ...prev.terminal, history: [] }
                };
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
                    // In a real VFS we'd check if it's a directory. Here we just set it.
                    newCwd = newPath;
                  }
                } else {
                  newCwd = '/';
                }
                break;
              case 'mkdir':
                if (args[1]) {
                  const path = args[1].startsWith('/') ? args[1] : `${newCwd}/${args[1]}`.replace('//', '/');
                  // We can simulate a directory by adding a dummy file or just tracking it.
                  // For now, we just let cd go anywhere, so mkdir is a no-op in this flat VFS.
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

          return {
            ...prev,
            vfs: newVfs,
            terminal: {
              ...prev.terminal,
              cwd: newCwd,
              history: [
                ...prev.terminal.history,
                { type: 'input', content: `${prev.terminal.cwd}$ ${cmd}` },
                ...(output ? [{ type: isError ? 'error' : 'output', content: output } as any] : [])
              ]
            }
          };
        });

        return output || 'Command executed successfully';
      },
      browseUrl: async (url) => {
        setGoosePenState(prev => ({
          ...prev,
          browser: {
            ...prev.browser,
            currentUrl: url,
            history: [...prev.browser.history, url],
            content: 'Loading...'
          }
        }));

        try {
          // Use a public CORS proxy to fetch the URL content
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          
          // Basic HTML to text conversion (strip tags)
          const textContent = data.contents
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          setGoosePenState(prev => ({
            ...prev,
            browser: {
              ...prev.browser,
              content: textContent
            }
          }));

          return textContent;
        } catch (error: any) {
          const errorMsg = `Failed to fetch ${url}: ${error.message}`;
          setGoosePenState(prev => ({
            ...prev,
            browser: {
              ...prev.browser,
              content: errorMsg
            }
          }));
          throw new Error(errorMsg);
        }
      },
      saveMemory: (fact) => {
        const event = new CustomEvent('goose-save-memory', { detail: fact });
        window.dispatchEvent(event);
        return `Successfully saved memory: "${fact}"`;
      },
      searchVault: async (keyword) => {
        const results = await vaultGardener.search_vault(keyword);
        return results.length > 0 ? results.map(r => `[${r}]`).join(', ') : 'No results found.';
      },
      readNeuron: async (title) => {
        try {
          return await vaultGardener.read_vault_file(`/neurons/${title}.md`);
        } catch (e) {
          return `Neuron not found: ${title}`;
        }
      },
      writeNeuron: async (title, content) => {
        await vaultGardener.write_vault_neuron(title, content);
        return `Successfully wrote neuron: ${title}`;
      },
      getBacklinks: async (title) => {
        const backlinks = await vaultGardener.get_backlinks(title);
        return backlinks.length > 0 ? backlinks.join(', ') : 'No backlinks found.';
      },
      createSynapse: async (sourceTitle, targetTitle) => {
        await vaultGardener.createSynapse(sourceTitle, targetTitle);
        return `Created synapse from ${sourceTitle} to ${targetTitle}`;
      },
      readScreen: async () => {
        setGoosePenState(prev => ({ ...prev, activeTab: 'pecking' }));
        return await NativeBridge.execute({ type: 'read_screen', payload: {} });
      },
      peckElement: async (elementId) => {
        setGoosePenState(prev => ({ ...prev, activeTab: 'pecking' }));
        return await NativeBridge.execute({ type: 'click', payload: { elementId } });
      },
      managePlan: async (action, id, plan) => {
        if (action === 'create' || action === 'update') {
          if (!plan) return "Error: Plan object is required for create/update actions.";
          await vaultGardener.savePlan(id, plan);
          window.dispatchEvent(new CustomEvent('plans-updated'));
          return `Successfully ${action}d plan: ${id}`;
        } else if (action === 'read') {
          const loadedPlan = await vaultGardener.loadPlan(id);
          return loadedPlan ? JSON.stringify(loadedPlan, null, 2) : `Plan not found: ${id}`;
        } else if (action === 'delete') {
          await vaultGardener.deletePlan(id);
          return `Plan ${id} deleted successfully.`;
        }
        return "Invalid action.";
      },
      listPlans: async () => {
        const plans = await vaultGardener.listPlans();
        return plans.length > 0 ? plans.join(', ') : 'No plans found.';
      },
      vectorSearch: async (query, topK) => {
        const results = await vaultGardener.vector_search(query, topK);
        return results.length > 0 
          ? results.map(r => `[${r.title}] (score: ${r.score.toFixed(2)})`).join('\n')
          : 'No semantically similar neurons found.';
      }
    };

    try {
      const response = await sendMessage(
        userMessage, 
        messages, 
        appState.tools, 
        finalSystemInstruction,
        toolCallbacks,
        appState.llmProvider,
        appState.localLlmConfig
      );
      
      let responseText = response.text || '';
      
      // Check for grounding chunks to append links
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        responseText += '\n\n**Sources:**\n';
        chunks.forEach((chunk: any, index: number) => {
          if (chunk.web?.uri) {
            responseText += `[${index + 1}] [${chunk.web.title}](${chunk.web.uri})\n`;
          }
        });
      }

      setMessages((prev) => [
        ...prev, 
        ...(response.newMessages || []),
        { role: 'model', parts: [{ text: responseText }] }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedTokens = messages.reduce((acc, msg) => {
    return acc + msg.parts.reduce((partAcc, part) => {
      return partAcc + (part.text ? Math.ceil(part.text.length / 4) : 0);
    }, 0);
  }, 0);
  const maxTokens = appState.llmProvider === 'local' ? 4096 : 128000;
  const contextPercentage = Math.min(100, (estimatedTokens / maxTokens) * 100);

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-24 h-24 text-black opacity-80" xmlns="http://www.w3.org/2000/svg"><path d="M50,10 C40,10 35,15 35,25 C35,35 40,40 50,40 C60,40 65,35 65,25 C65,15 60,10 50,10 Z M35,25 C30,20 20,15 10,25 C0,35 10,55 30,60 C50,65 70,65 90,60 C110,55 120,35 110,25 C100,15 90,20 85,25" /></svg>
            <p className="text-sm">How can I help you today?</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="flex w-full flex-col mb-2"
          >
            <div className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">
              {msg.role === 'user' ? `${appState.userName || 'USER'}>` : 'SPROCKET>'}
            </div>
            <div
              className="w-full bg-black text-white border border-zinc-800 p-4 rounded-sm"
            >
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                  {msg.parts.map((part: any, i: number) => (
                    <div key={i}>
                      {part.text && <ReactMarkdown>{part.text}</ReactMarkdown>}
                      {part.functionCall && (
                        <div className="text-zinc-500 font-mono text-xs mt-2 border-l-2 border-zinc-700 pl-2">
                          [tool: {part.functionCall.name}]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.parts.map((part: any, i: number) => (
                    <div key={i}>
                      {part.text && part.text}
                      {part.functionResponse && (
                        <div className="text-zinc-400 font-mono text-xs mt-2 border-l-2 border-zinc-700 pl-2">
                          [tool_response: {part.functionResponse.name}]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full flex-col mb-2">
            <div className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">
              SPROCKET&gt;
            </div>
            <div className="w-full bg-black text-white border border-zinc-800 p-4 rounded-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              <span className="text-sm font-mono text-zinc-500">processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-900 rounded-3xl p-2 border border-zinc-800 focus-within:border-zinc-700 transition-colors">
          <button
            onClick={toggleListening}
            className={cn(
              "p-3 rounded-full shrink-0 transition-colors",
              isListening ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            )}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Sprocket..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-[15px] text-zinc-100 placeholder:text-zinc-500"
            rows={1}
          />
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 shrink-0 text-white disabled:opacity-50 disabled:text-zinc-600 transition-colors hover:text-zinc-300"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between px-2">
          <div className="relative group">
            <select
              value={appState.llmProvider}
              onChange={(e) => setAppState(prev => ({ ...prev, llmProvider: e.target.value as 'gemini' | 'local' }))}
              className="appearance-none bg-transparent text-white text-xs font-medium pr-6 py-1 cursor-pointer focus:outline-none"
            >
              <option value="gemini" className="bg-zinc-900 text-white">Gemini 3.1 Pro</option>
              <option value="local" className="bg-zinc-900 text-white">Local Llama.cpp</option>
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <div className="text-[10px] text-zinc-500 font-mono">CTX</div>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  contextPercentage > 90 ? "bg-red-500" : contextPercentage > 75 ? "bg-yellow-500" : "bg-zinc-400"
                )}
                style={{ width: `${contextPercentage}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 font-mono w-12 text-right">
              {estimatedTokens > 1000 ? `${(estimatedTokens/1000).toFixed(1)}k` : estimatedTokens}/{maxTokens > 1000 ? `${(maxTokens/1000).toFixed(0)}k` : maxTokens}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
