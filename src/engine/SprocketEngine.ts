import { Capacitor } from '@capacitor/core';
import SprocketEnginePlugin from '../plugins/SprocketEngine';

export interface InitProgressReport {
  text: string;
  progress: number;
}

export class SprocketEngine {
  private _isInitialized: boolean = false;
  private modelPath: string;

  constructor(modelPath: string = "/sdcard/Download/sprocket-models/llama-3-8b.gguf") {
    this.modelPath = modelPath;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async init(onProgress?: (progress: InitProgressReport) => void, modelId?: string) {
    if (this._isInitialized) return;
    
    if (onProgress) {
      onProgress({ text: "Initializing native engine...", progress: 0.5 });
    }
    
    // In a real native plugin, we might load the model here.
    // For now, we just mark it as initialized.
    this._isInitialized = true;
    
    if (onProgress) {
      onProgress({ text: "Ready.", progress: 1.0 });
    }
  }

  async chatCompletion(request: any, onToken?: (token: string) => void) {
    if (!this._isInitialized) {
      throw new Error("Engine not initialized. Call init() first.");
    }

    const systemPrompt = request.messages.find((m: any) => m.role === 'system')?.content || "";
    const userPrompt = request.messages.filter((m: any) => m.role !== 'system').map((m: any) => m.content).join('\n');
    const responseFormat = request.response_format?.type === 'json_object' ? 'json_object' : 'text';

    return this.runInference(systemPrompt, userPrompt, responseFormat, onToken);
  }

  async runAgentLoop(
    systemPrompt: string,
    messages: { role: "user" | "assistant" | "system"; content: string }[],
    onUpdate: (text: string) => void,
    tools?: any[],
    responseFormat: string = "text"
  ) {
    if (!this._isInitialized) {
      throw new Error("Engine not initialized. Call init() first.");
    }

    const userPrompt = messages.map(m => m.content).join('\n');
    return this.runInference(systemPrompt, userPrompt, responseFormat, onUpdate);
  }

  private async runInference(systemPrompt: string, userPrompt: string, responseFormat: string = "text", onToken?: (token: string) => void) {
    let fullText = "";
    
    if (Capacitor.isNativePlatform()) {
      const listener = await SprocketEnginePlugin.addListener('token', (data) => {
        fullText += data.chunk;
        if (onToken) onToken(fullText);
      });

      try {
        const result = await SprocketEnginePlugin.prompt({
          systemPrompt,
          userPrompt,
          modelPath: this.modelPath,
          responseFormat
        });
        return result.response || fullText;
      } finally {
        listener.remove();
      }
    } else {
      // Simulated response for web
      const simulatedResponse = "[Simulated Local Response] Running in browser. Native Llama.cpp requires Android.";
      if (onToken) {
        for (let i = 0; i < simulatedResponse.length; i++) {
          await new Promise(r => setTimeout(r, 10));
          fullText += simulatedResponse[i];
          onToken(fullText);
        }
      } else {
        fullText = simulatedResponse;
      }
      return fullText;
    }
  }

  async reset() {
    // No-op for now
  }

  async unload() {
    this._isInitialized = false;
  }
}

export const sprocketEngine = new SprocketEngine();
