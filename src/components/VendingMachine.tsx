import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Download, 
  CheckCircle2, 
  Cpu, 
  HardDrive, 
  Info, 
  Zap, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { vendingMachineEngine, ModelSnack } from '../engine/VendingMachineEngine';

export const VendingMachine: React.FC = () => {
  const [snacks, setSnacks] = useState<ModelSnack[]>(vendingMachineEngine.getSnacks());
  const [vendingId, setVendingId] = useState<string | null>(null);
  const [vendingStatus, setVendingStatus] = useState<string>("");
  const [vendingProgress, setVendingProgress] = useState<number>(0);

  useEffect(() => {
    const updateSnacks = () => setSnacks([...vendingMachineEngine.getSnacks()]);
    window.addEventListener('vending-machine-updated', updateSnacks);
    return () => window.removeEventListener('vending-machine-updated', updateSnacks);
  }, []);

  const handleVend = async (snackId: string) => {
    if (vendingId) return;
    
    setVendingId(snackId);
    setVendingStatus("Initializing Vending Machine...");
    setVendingProgress(0);

    try {
      await vendingMachineEngine.vend(snackId, (progress, text) => {
        setVendingProgress(progress);
        setVendingStatus(text);
      });
      setVendingStatus("Vending Successful! Snack is in the tray.");
      setTimeout(() => {
        setVendingId(null);
        setVendingStatus("");
        setVendingProgress(0);
      }, 3000);
    } catch (error) {
      setVendingStatus("Vending Error: Machine Jammed.");
      setTimeout(() => {
        setVendingId(null);
        setVendingStatus("");
        setVendingProgress(0);
      }, 5000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#151619] text-white p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-white" />
            Vending Machine
          </h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Local Model Stockpile</p>
        </div>
        <div className="bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-400 uppercase">System Online</span>
        </div>
      </div>

      {/* Vending Status Display */}
      <AnimatePresence>
        {vendingId && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-4 bg-white/5 border border-white/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-white uppercase flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Vending in Progress...
              </span>
              <span className="text-xs font-mono text-white">{vendingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${vendingProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-zinc-400 truncate">{vendingStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Grid */}
      <div className="grid grid-cols-1 gap-4">
        {snacks.map((snack) => (
          <motion.div
            key={snack.id}
            whileHover={{ scale: 1.01 }}
            className={`p-4 rounded-xl border transition-colors ${
              snack.isStocked 
                ? 'bg-zinc-800/30 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{snack.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{snack.description}</p>
              </div>
              {snack.isStocked ? (
                <div className="bg-white/10 text-white p-1.5 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <button
                  onClick={() => handleVend(snack.id)}
                  disabled={!!vendingId}
                  className={`p-1.5 rounded-lg transition-colors ${
                    vendingId 
                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase mb-1">
                  <Cpu className="w-3 h-3" />
                  VRAM
                </div>
                <div className="text-xs font-mono">{snack.vram}</div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase mb-1">
                  <HardDrive className="w-3 h-3" />
                  Size
                </div>
                <div className="text-xs font-mono">{snack.size}</div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase mb-1">
                  <Zap className="w-3 h-3" />
                  Type
                </div>
                <div className="text-xs font-mono">{snack.type}</div>
              </div>
            </div>

            {snack.isStocked && (
              <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase">
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                In Stock & Ready for Inference
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Hardware Warning */}
      <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-zinc-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Hardware Advisory</h4>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              Vending models consumes significant bandwidth and storage. Ensure you are on a stable connection. 
              Running large models (8B+) requires at least 8GB of system RAM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
