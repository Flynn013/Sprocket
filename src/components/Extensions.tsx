import { Globe, Search, Wrench, ShieldAlert, TerminalSquare } from 'lucide-react';
import { AppState } from '../App';
import { cn } from '../lib/utils';

export default function Extensions({ appState, setAppState }: { appState: AppState, setAppState: (state: AppState) => void }) {
  const toggleTool = (toolName: keyof AppState['tools']) => {
    setAppState({
      ...appState,
      tools: {
        ...appState.tools,
        [toolName]: !appState.tools[toolName]
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Extensions</h2>
        <p className="text-zinc-400 text-sm">Enhance Goose with additional capabilities.</p>
      </div>

      <div className="space-y-4">
        {/* Google Search Extension */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start justify-between transition-colors hover:border-zinc-700">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-zinc-100">Google Search</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[250px]">
                Allow Goose to search the web for real-time information and recent events.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleTool('googleSearch')}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900",
              appState.tools.googleSearch ? 'bg-white' : 'bg-zinc-700'
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full transition-transform",
                appState.tools.googleSearch ? 'translate-x-6 bg-zinc-900' : 'translate-x-1 bg-white'
              )}
            />
          </button>
        </div>

        {/* GoosePen Extension */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start justify-between transition-colors hover:border-zinc-700">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <TerminalSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-zinc-100">GoosePen Workspace</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[250px]">
                Give Goose a virtual file system and simulated browser to perform complex tasks.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleTool('goosePen')}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900",
              appState.tools.goosePen ? 'bg-white' : 'bg-zinc-700'
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full transition-transform",
                appState.tools.goosePen ? 'translate-x-6 bg-zinc-900' : 'translate-x-1 bg-white'
              )}
            />
          </button>
        </div>

        {/* Memory Extension */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start justify-between transition-colors hover:border-zinc-700">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-zinc-100">Core Memory</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[250px]">
                Allow Goose to autonomously save and recall facts about you across sessions.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleTool('memory')}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900",
              appState.tools.memory ? 'bg-white' : 'bg-zinc-700'
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full transition-transform",
                appState.tools.memory ? 'translate-x-6 bg-zinc-900' : 'translate-x-1 bg-white'
              )}
            />
          </button>
        </div>

      </div>

      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-500/90 leading-relaxed">
          Extensions give Goose access to external services. Only enable extensions you trust.
        </p>
      </div>
    </div>
  );
}
