import { sprocketEngine, InitProgressReport } from "./SprocketEngine";

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
      id: "llama-3-8b.gguf",
      name: "Llama 3 8B (Native)",
      description: "Meta's high-reasoning workhorse. Best for deep logic and coding. Runs natively via JNI.",
      vram: "4.0 GB",
      size: "4.2 GB",
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
    this.snacks.forEach(snack => {
      const stocked = localStorage.getItem(`stocked_${snack.id}`);
      if (stocked === 'true') {
        snack.isStocked = true;
        snack.progress = 100;
      }
    });
    window.dispatchEvent(new CustomEvent('vending-machine-updated'));
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
