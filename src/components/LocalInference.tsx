import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Play, CheckCircle2 } from 'lucide-react';
import { AppState } from '../App';
import { cn } from '../lib/utils';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';

export default function LocalInference({ appState, setAppState }: { appState: AppState, setAppState: (state: AppState) => void }) {
  const [models, setModels] = useState<any[]>([]);
  
  useEffect(() => {
    // Load available models from WebLLM config
    const availableModels = prebuiltAppConfig.model_list.filter(m => 
      m.model_id.includes('Llama-3') || 
      m.model_id.includes('Qwen') || 
      m.model_id.includes('Mistral') ||
      m.model_id.includes('Phi') ||
      m.model_id.includes('DeepSeek')
    );
    setModels(availableModels);
  }, []);

  const selectModel = (modelId: string) => {
    setAppState({
      ...appState,
      llmProvider: 'local',
      localLlmConfig: {
        ...appState.localLlmConfig,
        model: modelId
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight flex items-center space-x-2">
          <Cpu className="w-6 h-6 text-white" />
          <span>Local Inference (WebGPU)</span>
        </h2>
        <p className="text-zinc-400 text-sm">Run models entirely in your browser using WebGPU and OPFS. No API keys required.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center space-x-2 text-zinc-100 font-medium mb-4">
          <HardDrive className="w-5 h-5 text-white" />
          <h3>Available Models</h3>
        </div>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {models.map((model) => {
            const isSelected = appState.llmProvider === 'local' && appState.localLlmConfig.model === model.model_id;
            
            return (
              <div 
                key={model.model_id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  isSelected 
                    ? "bg-white/10 border-white/50" 
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isSelected ? "bg-white/20 text-white" : "bg-zinc-900 text-zinc-400"
                  )}>
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-100">{model.model_id}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-zinc-500">
                        {model.vram_required_MB ? `Est. VRAM: ${Math.round(model.vram_required_MB / 1024)}GB` : 'VRAM: Unknown'}
                      </p>
                      {localStorage.getItem(`stocked_${model.model_id}`) === 'true' && (
                        <span className="text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded border border-white/20 font-mono uppercase">Stocked</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => selectModel(model.model_id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2",
                      isSelected 
                        ? "bg-white text-black hover:bg-zinc-200" 
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                    )}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Use Model</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
