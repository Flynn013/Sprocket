import React, { useState, useEffect, useRef } from 'react';
import { dangerRoomEngine } from '../services/DangerRoomEngine';
import { ModelType } from '../services/InferenceRouter';
import { Play, Square, Zap, AlertCircle, Terminal, Brain, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DangerRoom() {
  const [isRunning, setIsRunning] = useState(false);
  const [modelType, setModelType] = useState<ModelType>('cloud-teacher');
  const [telemetry, setTelemetry] = useState<string[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addTelemetry = (msg: string) => {
    setTelemetry(prev => [...prev.slice(-50), msg]);
    if (msg.startsWith('[PUZZLE]')) {
      setCurrentPuzzle(msg.replace('[PUZZLE] Spawned: ', ''));
    }
  };

  const startLoop = async () => {
    setIsRunning(true);
    setTelemetry([]);
    await dangerRoomEngine.startContinuousLoop(modelType, addTelemetry);
    setIsRunning(false);
  };

  const stopLoop = () => {
    dangerRoomEngine.stop();
    setIsRunning(false);
    addTelemetry('[SYSTEM] Emergency Stop triggered.');
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [telemetry]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-400 font-mono overflow-y-auto p-6 gap-8">
      {/* Top Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-white uppercase">DangerRoom</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">Neural Stress Test Environment</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'bg-zinc-700'}`} />
          <span className="text-[10px] font-bold tracking-widest">{isRunning ? 'SYSTEM ACTIVE' : 'SYSTEM STANDBY'}</span>
        </div>
      </div>

      {/* Inference Selection */}
      <div className="space-y-3">
        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest ml-1">Select Inference Engine</label>
        <div className="grid grid-cols-3 gap-4">
          {(['cloud-teacher', 'local-student', 'native-pro'] as ModelType[]).map(type => (
            <button
              key={type}
              onClick={() => setModelType(type)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2 ${
                modelType === type 
                  ? 'bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <Cpu className={`w-5 h-5 ${modelType === type ? 'text-white' : 'text-zinc-600'}`} />
              <span className="text-[11px] font-bold uppercase tracking-tighter">{type.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Telemetry */}
      <div className="flex flex-col bg-black/60 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">Live Telemetry Feed</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
          </div>
        </div>
        
        <div 
          ref={terminalRef}
          className="h-48 overflow-y-auto p-4 space-y-1 scrollbar-hide font-mono"
        >
          {telemetry.length === 0 && (
            <div className="text-zinc-700 italic text-xs">Awaiting system initialization...</div>
          )}
          {telemetry.map((line, i) => (
            <div key={i} className="text-[11px] leading-relaxed break-words">
              {line.startsWith('[SYSTEM]') && <span className="text-zinc-500">{line}</span>}
              {line.startsWith('[PUZZLE]') && <span className="text-white font-bold">{line}</span>}
              {line.startsWith('[THINKING]') && <span className="text-zinc-400 italic">{line}</span>}
              {line.startsWith('[SUCCESS]') && <span className="text-zinc-300 font-bold">{line}</span>}
              {line.startsWith('[FAILURE]') && <span className="text-zinc-600 font-bold">{line}</span>}
              {line.startsWith('[VAULT]') && <span className="text-zinc-400">{line}</span>}
              {line.startsWith('[ERROR]') && <span className="text-zinc-100 bg-zinc-900 px-1">{line}</span>}
              {!line.includes('[') && <span>{line}</span>}
            </div>
          ))}
          {isRunning && (
            <motion.div 
              animate={{ opacity: [0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-2 h-4 bg-white inline-block ml-1"
            />
          )}
        </div>
      </div>

      {/* Controls & Arena */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          {!isRunning ? (
            <button
              onClick={startLoop}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white text-zinc-950 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              <Play className="w-5 h-5 fill-current" />
              INITIATE NEURAL LOOP
            </button>
          ) : (
            <button
              onClick={stopLoop}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 text-white border border-zinc-800 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
            >
              <Square className="w-5 h-5 fill-current" />
              EMERGENCY KILL SWITCH
            </button>
          )}
        </div>

        {/* Arena Viewport */}
        <div className="h-40 bg-zinc-900/50 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col shadow-inner">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
          
          <div className="p-3 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/80 backdrop-blur-sm z-10">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Arena Viewport</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 font-mono">X: 124.2 Y: 88.1</span>
              <Cpu className="w-3 h-3 text-zinc-600" />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8 text-center relative">
            <AnimatePresence mode="wait">
              {currentPuzzle ? (
                <motion.div
                  key={currentPuzzle}
                  initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                  className="space-y-2"
                >
                  <div className="text-white text-3xl font-black tracking-tighter uppercase italic">
                    {currentPuzzle.split(' - ')[0]}
                  </div>
                  <div className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-bold">
                    Sector: {currentPuzzle.split(' - ')[1]}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                  <div className="text-zinc-700 text-[10px] uppercase tracking-[0.3em] font-bold">
                    Waiting for Neural Spawn...
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-auto pt-4 border-t border-zinc-900 flex justify-between items-center text-[9px] text-zinc-600 font-bold tracking-widest uppercase">
        <div className="flex gap-4">
          <span>OS: SPROCKET_v0.4.2</span>
          <span className="text-zinc-700">ENCRYPTION: AES-256-GCM</span>
        </div>
        <div className="flex gap-4">
          <span className={isRunning ? 'text-zinc-400' : ''}>TEMP: 42°C</span>
          <span>MEM: 8.4GB/12GB</span>
        </div>
      </div>
    </div>
  );
}
