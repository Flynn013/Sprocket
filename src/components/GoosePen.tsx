import { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Globe, TerminalSquare, Terminal as TerminalIcon, Database, Smartphone, BrainCircuit, ClipboardList, Zap } from 'lucide-react';
import * as d3 from 'd3';
import { cn } from '../lib/utils';
import { vaultGardener, VaultGraph } from '../engine/VaultGardener';
import PeckingStation, { PeckingStationState } from './PeckingStation';
import DangerRoom from './DangerRoom';

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
  activeTab: 'files' | 'browser' | 'terminal' | 'vault' | 'pecking' | 'plans' | 'danger';
  vfs: VFS;
  browser: BrowserState;
  terminal: {
    history: TerminalEntry[];
    cwd: string;
  };
  pecking: PeckingStationState;
}

interface GoosePenProps {
  state: GoosePenState;
  setState: React.Dispatch<React.SetStateAction<GoosePenState>>;
}

export default function GoosePen({ state, setState }: GoosePenProps) {
  const { activeTab } = state;
  const setActiveTab = (tab: GoosePenState['activeTab']) => setState(prev => ({ ...prev, activeTab: tab }));
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<VaultGraph>({ nodes: [], links: [] });
  const [neuronList, setNeuronList] = useState<string[]>([]);
  const [selectedNeuron, setSelectedNeuron] = useState<string | null>(null);
  const [neuronContent, setNeuronContent] = useState('');
  const [plans, setPlans] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const fetchPlans = async () => {
    const planIds = await vaultGardener.listPlans();
    setPlans(planIds);
  };

  const handleSelectPlan = async (id: string) => {
    const plan = await vaultGardener.loadPlan(id);
    setSelectedPlan(plan);
    setSelectedPlanId(id);
  };

  const handleSelectNeuron = async (name: string) => {
    setSelectedNeuron(name);
    try {
      const content = await vaultGardener.read_vault_file(`/neurons/${name}.md`);
      setNeuronContent(content);
    } catch (e) {
      setNeuronContent('');
    }
  };

  const handleSaveNeuron = async () => {
    if (selectedNeuron) {
      await vaultGardener.write_vault_neuron(selectedNeuron, neuronContent);
      setSelectedNeuron(null);
      const files = await vaultGardener.list_vault_dir('/neurons');
      setNeuronList(files.map(f => f.replace('.md', '')));
    }
  };

  useEffect(() => {
    const fetchData = () => {
      vaultGardener.get_graph().then(data => {
        setGraphData(data);
      });
      vaultGardener.list_vault_dir('/neurons').then(files => {
        setNeuronList(files.map(f => f.replace('.md', '')));
      });
    };

    fetchData();
    fetchPlans();

    window.addEventListener('vault-updated', fetchData);
    window.addEventListener('plans-updated', fetchPlans);
    return () => {
      window.removeEventListener('vault-updated', fetchData);
      window.removeEventListener('plans-updated', fetchPlans);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'vault' && svgRef.current && graphData.nodes.length > 0) {
      const width = svgRef.current.clientWidth;
      const height = 300; // Fixed height for the graph container
      
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // Clear previous render
      
      const simulation = d3.forceSimulation(graphData.nodes as any)
        .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .attr("stroke", "#52525b") // zinc-600
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(graphData.links)
        .join("line")
        .attr("stroke-width", 1.5);

      const node = svg.append("g")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(graphData.nodes)
        .join("circle")
        .attr("r", (d) => d.group === 1 ? 8 : 6)
        .attr("fill", (d) => d.group === 1 ? "#ffffff" : "#52525b"); // white for source, zinc-600 for target

      const label = svg.append("g")
        .selectAll("text")
        .data(graphData.nodes)
        .join("text")
        .text((d) => d.id)
        .attr("font-size", "10px")
        .attr("fill", "#a1a1aa") // zinc-400
        .attr("dx", 12)
        .attr("dy", 4);

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node
          .attr("cx", (d: any) => d.x)
          .attr("cy", (d: any) => d.y);
          
        label
          .attr("x", (d: any) => d.x)
          .attr("y", (d: any) => d.y);
      });
    }
  }, [activeTab, graphData]);

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
    <div className="flex flex-row h-full bg-zinc-950 text-zinc-100 font-mono text-sm">
      <div className="flex flex-col w-16 border-r border-zinc-800 bg-zinc-900/50 items-center py-4 space-y-4 shrink-0">
        <button
          onClick={() => setActiveTab('vault')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'vault' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="BrainBucket (Vault)"
        >
          <Database className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'plans' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Agent Plans"
        >
          <ClipboardList className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'terminal' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Terminal"
        >
          <TerminalIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'files' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="File System"
        >
          <Folder className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'browser' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Browser"
        >
          <Globe className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('pecking')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'pecking' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Pecking Station"
        >
          <Smartphone className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTab === 'danger' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
          title="Danger Room"
        >
          <Zap className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        <div className={cn("h-full flex flex-col font-mono text-xs", activeTab !== 'terminal' && "hidden")}>
          <div className="flex-1 overflow-y-auto space-y-1 pb-4">
            <div className="text-zinc-500 mb-4">
              Welcome to Sprocket Terminal v1.0.0
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
              autoFocus={activeTab === 'terminal'}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        <div className={cn("space-y-4", activeTab !== 'files' && "hidden")}>
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

        <div className={cn("space-y-4", activeTab !== 'browser' && "hidden")}>
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

        <div className={cn("space-y-4 h-full flex flex-col", activeTab !== 'vault' && "hidden")}>
          <div className="flex items-center space-x-2 text-zinc-400 mb-2 shrink-0">
            <Database className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Neural Pathway Map</span>
          </div>
          
          <div className="flex-1 min-h-0 bg-zinc-900/30 border border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col shadow-inner">
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
            
            {graphData.nodes.length > 0 ? (
              <svg ref={svgRef} className="w-full h-full bg-transparent" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-sm">
                The vault is empty. No neural pathways formed yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Neurons</div>
              <div className="text-2xl font-mono text-white mt-1">{graphData.nodes.length}</div>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Neural Synapses</div>
              <div className="text-2xl font-mono text-white mt-1">{graphData.links.length}</div>
            </div>
          </div>
        </div>

        <div className={cn("h-full", activeTab !== 'pecking' && "hidden")}>
          <PeckingStation 
            state={state.pecking} 
            setState={(updater) => setState(prev => ({ 
              ...prev, 
              pecking: typeof updater === 'function' ? updater(prev.pecking) : updater 
            }))} 
          />
        </div>

        <div className={cn("space-y-4 h-full overflow-y-auto", activeTab !== 'plans' && "hidden")}>
          <div className="flex items-center space-x-2 text-zinc-400 mb-4">
            <ClipboardList className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Agent Strategic Plans</span>
          </div>

          {selectedPlan ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">{selectedPlan.title || selectedPlanId}</h3>
                <button onClick={() => setSelectedPlan(null)} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Back to list</button>
              </div>
              
              <div className="space-y-3">
                {selectedPlan.steps?.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-950 rounded border border-zinc-800">
                    <div className={cn(
                      "w-4 h-4 rounded-full mt-0.5 shrink-0 border",
                      step.status === 'completed' ? "bg-zinc-400 border-zinc-300" :
                      step.status === 'in-progress' ? "bg-white border-zinc-200 animate-pulse" :
                      step.status === 'failed' ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800"
                    )} />
                    <div className="flex-1">
                      <div className="text-sm text-zinc-200">{step.task}</div>
                      <div className="text-[10px] text-zinc-500 uppercase mt-1">{step.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Overall Status</div>
                <div className={cn(
                  "text-sm font-bold mt-1 uppercase",
                  selectedPlan.status === 'completed' ? "text-zinc-300" :
                  selectedPlan.status === 'active' ? "text-white" : "text-zinc-500"
                )}>
                  {selectedPlan.status}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.length > 0 ? plans.map(id => (
                <div 
                  key={id} 
                  onClick={() => handleSelectPlan(id)}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <ClipboardList className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                    <span className="text-sm text-zinc-300 group-hover:text-white">{id}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase">View Plan</div>
                </div>
              )) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                  <p className="text-zinc-600 italic text-sm">No strategic plans active.</p>
                  <p className="text-zinc-700 text-xs mt-2">Sprocket will create plans automatically for complex tasks.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={cn("h-full", activeTab !== 'danger' && "hidden")}>
          <DangerRoom />
        </div>
      </div>
    </div>
  );
}
