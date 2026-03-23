import { User, Shield, Info, Trash2 } from 'lucide-react';
import { AppState } from '../App';
import { cn } from '../lib/utils';

export default function Settings({ appState, setAppState }: { appState: AppState, setAppState: (state: AppState) => void }) {
  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAppState({
      ...appState,
      systemInstruction: e.target.value
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-zinc-400 text-sm">Configure your Goose experience.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Profile</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Your Name</label>
                <input 
                  type="text" 
                  value={appState.userName}
                  onChange={(e) => setAppState({...appState, userName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-white transition-colors"
                  placeholder="How should Goose address you?"
                />
              </div>
            </div>
            <p className="text-sm text-zinc-500">This name will be provided to the model so it knows how to address you.</p>
          </div>
        </section>

        {/* AI Configuration */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">AI Configuration</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-zinc-300">LLM Provider</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={appState.llmProvider === 'gemini'} 
                    onChange={() => setAppState({...appState, llmProvider: 'gemini'})}
                    className="w-4 h-4 text-white bg-zinc-900 border-zinc-700 focus:ring-white focus:ring-offset-zinc-950"
                  />
                  <span className="text-zinc-300">Gemini 3.1 Pro (Cloud)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={appState.llmProvider === 'local'} 
                    onChange={() => setAppState({...appState, llmProvider: 'local'})}
                    className="w-4 h-4 text-white bg-zinc-900 border-zinc-700 focus:ring-white focus:ring-offset-zinc-950"
                  />
                  <span className="text-zinc-300">Local LLM (OpenAI Compatible)</span>
                </label>
              </div>

              {appState.llmProvider === 'local' && (
                <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Endpoint URL</label>
                    <input 
                      type="text" 
                      value={appState.localLlmConfig.endpoint}
                      onChange={(e) => setAppState({...appState, localLlmConfig: {...appState.localLlmConfig, endpoint: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-white transition-colors"
                      placeholder="http://localhost:11434/v1"
                    />
                    <p className="text-xs text-zinc-500 mt-1">e.g., http://localhost:11434/v1 for Ollama, or http://localhost:1234/v1 for LM Studio</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Model Name</label>
                    <input 
                      type="text" 
                      value={appState.localLlmConfig.model}
                      onChange={(e) => setAppState({...appState, localLlmConfig: {...appState.localLlmConfig, model: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-white transition-colors"
                      placeholder="llama3"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <label htmlFor="systemInstruction" className="text-sm font-medium text-zinc-300">
                System Instructions
              </label>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tell Goose how to behave and respond. This acts as the core personality and ruleset.
              </p>
              <textarea
                id="systemInstruction"
                value={appState.systemInstruction}
                onChange={handleInstructionChange}
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 focus:ring-2 focus:ring-white focus:border-transparent transition-all resize-none"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="userMemories" className="text-sm font-medium text-zinc-300">
                User Memories & Preferences
              </label>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Add facts, preferences, or important memories that Goose should always consider.
              </p>
              <textarea
                id="userMemories"
                value={appState.userMemories}
                onChange={(e) => setAppState({ ...appState, userMemories: e.target.value })}
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 focus:ring-2 focus:ring-white focus:border-transparent transition-all resize-none"
                placeholder="e.g. I prefer concise answers. I live in New York. I am a software engineer."
              />
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Data & Privacy</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Privacy Policy</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <Info className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">About Goose Web</span>
              </div>
              <span className="text-xs text-zinc-500">v1.0.0</span>
            </button>
            <button 
              onClick={() => {
                // In a real app, this would show a custom modal.
                // For now, we just reload to clear state.
                window.location.reload();
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5 text-red-500/70 group-hover:text-red-500" />
                <span className="text-sm font-medium text-red-500/70 group-hover:text-red-500">Clear Chat History</span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
