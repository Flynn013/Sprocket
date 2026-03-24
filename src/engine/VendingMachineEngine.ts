import { prebuiltAppConfig, InitProgressReport } from "@mlc-ai/web-llm";
import { sprocketEngine } from "./SprocketEngine";

export interface ModelSnack {
  id: string;
  name: string;
  description: string;
  vram: string;
  size: string;
  type: 'LLM' | 'Embedding' | 'Vision';
  isStocked: boolean;
  progress: number;
}

class VendingMachineEngine {
  private snacks: ModelSnack[] = [
    {
      id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
      name: "Llama 3.1 8B",
      description: "Meta's high-reasoning workhorse. Best for deep logic and coding.",
      vram: "6.5 GB",
      size: "4.8 GB",
      type: 'LLM',
      isStocked: false,
      progress: 0
    },
    {
      id: "Gemma-2-2b-it-q4f16_1-MLC",
      name: "Gemma 2 2B",
      description: "Google's lightweight and punchy model. Perfect for fast UI tasks.",
      vram: "2.5 GB",
      size: "1.6 GB",
      type: 'LLM',
      isStocked: false,
      progress: 0
    },
    {
      id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
      name: "Phi-3 Mini",
      description: "Microsoft's tiny powerhouse. Excellent for logic and reasoning.",
      vram: "2.8 GB",
      size: "2.3 GB",
      type: 'LLM',
      isStocked: false,
      progress: 0
    },
    {
      id: "Qwen2-0.5B-Instruct-q4f16_1-MLC",
      name: "Qwen 0.5B",
      description: "The 'Micro-Snack'. Ultra-fast, runs on almost any hardware.",
      vram: "1.0 GB",
      size: "0.4 GB",
      type: 'LLM',
      isStocked: false,
      progress: 0
    },
    {
      id: "DeepSeek-V2-Lite-Chat-q4f16_1-MLC",
      name: "DeepSeek V2 Lite",
      description: "Efficient Mixture-of-Experts model. Great balance of speed and smarts.",
      vram: "4.5 GB",
      size: "3.2 GB",
      type: 'LLM',
      isStocked: false,
      progress: 0
    }
  ];

  constructor() {
    this.checkStock();
  }

  getSnacks() {
    return this.snacks;
  }

  async checkStock() {
    // Check if models are in IndexedDB cache
    // WebLLM uses a specific database name for its cache
    try {
      const dbName = "WebLLM_Cache";
      const request = indexedDB.open(dbName);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        // This is a simplified check. In reality, we'd look for specific model keys.
        // For now, we'll use a localStorage flag as a fallback for the UI.
        this.snacks.forEach(snack => {
          const stocked = localStorage.getItem(`stocked_${snack.id}`);
          if (stocked === 'true') {
            snack.isStocked = true;
            snack.progress = 100;
          }
        });
        window.dispatchEvent(new CustomEvent('vending-machine-updated'));
      };
    } catch (e) {
      console.warn("Failed to check IndexedDB stock:", e);
    }
    return this.snacks;
  }

  async vend(snackId: string, onProgress: (progress: number, text: string) => void) {
    const snack = this.snacks.find(s => s.id === snackId);
    if (!snack) return;

    try {
      // Use SprocketEngine to trigger the download/cache
      await sprocketEngine.init((report: InitProgressReport) => {
        snack.progress = report.progress * 100;
        onProgress(snack.progress, report.text);
      }, snackId);
      
      snack.isStocked = true;
      snack.progress = 100;
      localStorage.setItem(`stocked_${snack.id}`, 'true');
      window.dispatchEvent(new CustomEvent('vending-machine-updated'));
    } catch (error) {
      console.error("Vending failed:", error);
      throw error;
    }
  }
}

export const vendingMachineEngine = new VendingMachineEngine();
