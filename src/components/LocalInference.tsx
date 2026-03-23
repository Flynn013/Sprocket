import { useState, useEffect } from 'react';
import { Cpu, Download, Trash2, RefreshCw, AlertTriangle, HardDrive, Play } from 'lucide-react';
import { AppState } from '../App';
import { cn } from '../lib/utils';

export default function LocalInference({ appState, setAppState }: { appState: AppState, setAppState: (state: AppState) => void }) {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState('');
  const [pullProgress, setPullProgress] = useState(0);

  // Extract base URL from the OpenAI compatible endpoint (e.g., http://localhost:11434/v1 -> http://localhost:11434)
  const getOllamaBaseUrl = () => {
    try {
      const url = new URL(appState.localLlmConfig.endpoint);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      return 'http://localhost:11434';
    }
  };

  const baseUrl = getOllamaBaseUrl();

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Failed to fetch models: ${response.statusText}`);
      const data = await response.json();
      setModels(data.models || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Ollama. Is it running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appState.llmProvider === 'local') {
      fetchModels();
    }
  }, [appState.localLlmConfig.endpoint, appState.llmProvider]);

  const handlePullModel = async () => {
    if (!pullModelName.trim() || isPulling) return;
    
    setIsPulling(true);
    setPullStatus('Starting download...');
    setPullProgress(0);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullModelName.trim() })
      });

      if (!response.ok) throw new Error(`Failed to pull model: ${response.statusText}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            setPullStatus(data.status);
            if (data.total && data.completed) {
              setPullProgress((data.completed / data.total) * 100);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
      
      setPullStatus('Download complete!');
      setPullModelName('');
      await fetchModels(); // Refresh list
    } catch (err: any) {
      setError(`Pull failed: ${err.message}`);
      setPullStatus('');
    } finally {
      setIsPulling(false);
      setTimeout(() => {
        if (pullStatus === 'Download complete!') setPullStatus('');
      }, 3000);
    }
  };

  const handleDeleteModel = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      const response = await fetch(`${baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) throw new Error(`Failed to delete model: ${response.statusText}`);
      await fetchModels();
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`);
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const selectModel = (name: string) => {
    setAppState({
      ...appState,
      llmProvider: 'local',
      localLlmConfig: {
        ...appState.localLlmConfig,
        model: name
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight flex items-center space-x-2">
          <Cpu className="w-6 h-6 text-white" />
          <span>Local Inference (Ollama)</span>
        </h2>
        <p className="text-zinc-400 text-sm">Manage and download local models directly through Ollama.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-500">Connection Error</p>
            <p className="text-sm text-red-500/80 leading-relaxed">{error}</p>
            <p className="text-xs text-red-500/60 mt-2">
              Make sure Ollama is running locally. If you are using the web version, you must start Ollama with CORS enabled:
              <br/>
              <code className="bg-red-500/10 px-1 py-0.5 rounded mt-1 inline-block">OLLAMA_ORIGINS="*" ollama serve</code>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pull Model Section */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-zinc-100 font-medium">
              <Download className="w-5 h-5 text-blue-400" />
              <h3>Download Model</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Enter a model name from the Ollama library (e.g., <code className="text-zinc-300">llama3.1</code>, <code className="text-zinc-300">mistral</code>, <code className="text-zinc-300">qwen2.5</code>).
            </p>
            
            <div className="space-y-3">
              <input
                type="text"
                value={pullModelName}
                onChange={(e) => setPullModelName(e.target.value)}
                placeholder="e.g., llama3.1"
                disabled={isPulling}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-white transition-colors disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePullModel();
                }}
              />
              <button
                onClick={handlePullModel}
                disabled={!pullModelName.trim() || isPulling}
                className="w-full bg-white hover:bg-zinc-200 text-black rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center space-x-2"
              >
                {isPulling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pulling...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pull Model</span>
                  </>
                )}
              </button>
            </div>

            {isPulling && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span className="truncate pr-2">{pullStatus}</span>
                  <span>{pullProgress > 0 ? `${pullProgress.toFixed(1)}%` : ''}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-300 ease-out"
                    style={{ width: `${pullProgress}%` }}
                  />
                </div>
              </div>
            )}
            {pullStatus === 'Download complete!' && !isPulling && (
              <p className="text-xs text-white text-center">{pullStatus}</p>
            )}
          </div>
        </div>

        {/* Installed Models Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center space-x-2 text-zinc-100 font-medium">
                <HardDrive className="w-5 h-5 text-white" />
                <h3>Installed Models</h3>
                <span className="bg-zinc-800 text-zinc-300 text-xs py-0.5 px-2 rounded-full">
                  {models.length}
                </span>
              </div>
              <button 
                onClick={fetchModels}
                disabled={isLoading}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh models"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {models.length === 0 && !isLoading && !error ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                  <HardDrive className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No models installed yet.</p>
                </div>
              ) : (
                models.map((model) => {
                  const isSelected = appState.llmProvider === 'local' && appState.localLlmConfig.model === model.name;
                  return (
                    <div 
                      key={model.name} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors group",
                        isSelected 
                          ? "bg-white/10 border-white/30" 
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center space-x-2">
                          <h4 className={cn("font-medium truncate", isSelected ? "text-white" : "text-zinc-200")}>
                            {model.name}
                          </h4>
                          {isSelected && (
                            <span className="bg-white/20 text-white text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-zinc-500">
                          <span>{formatSize(model.size)}</span>
                          <span>•</span>
                          <span>{model.details?.parameter_size || 'Unknown size'}</span>
                          <span>•</span>
                          <span>{model.details?.quantization_level || 'Unknown quant'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 shrink-0">
                        {!isSelected && (
                          <button
                            onClick={() => selectModel(model.name)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Use this model"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteModel(model.name)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete model"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
