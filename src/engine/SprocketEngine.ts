import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

export class SprocketEngine {
  private engine: MLCEngine | null = null;
  private modelId: string;
  private isInitializing: boolean = false;

  constructor(modelId: string = "Llama-3.1-8B-Instruct-q4f16_1-MLC") {
    this.modelId = modelId;
  }

  get isInitialized(): boolean {
    return this.engine !== null;
  }

  async init(onProgress?: (progress: InitProgressReport) => void, modelId?: string) {
    if (modelId && modelId !== this.modelId) {
      this.modelId = modelId;
      if (this.engine) {
        await this.engine.unload();
        this.engine = null;
      }
    }
    if (this.engine || this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: onProgress,
      });
    } catch (error) {
      console.error("Failed to initialize MLCEngine:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async chatCompletion(request: any) {
    if (!this.engine) {
      throw new Error("Engine not initialized. Call init() first.");
    }
    return await this.engine.chat.completions.create(request);
  }

  async runAgentLoop(
    systemPrompt: string,
    messages: { role: "user" | "assistant" | "system"; content: string }[],
    onUpdate: (text: string) => void,
    tools?: any[]
  ) {
    if (!this.engine) {
      throw new Error("Engine not initialized. Call init() first.");
    }

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages as any,
        stream: true,
        tools: tools,
      });

      let fullResponse = "";
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          onUpdate(fullResponse);
        }
      }

      return fullResponse;
    } catch (error) {
      console.error("Inference error:", error);
      throw error;
    }
  }

  async reset() {
    if (this.engine) {
      await this.engine.resetChat();
    }
  }

  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }
}

export const sprocketEngine = new SprocketEngine();
