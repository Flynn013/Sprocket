import { pipeline, env } from '@xenova/transformers';

// Disable local model check for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

export class EmbeddingEngine {
  private extractor: any = null;
  private isInitializing = false;

  async init() {
    if (this.extractor || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // Use a small, efficient model for local embeddings
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (error) {
      console.error("Failed to initialize EmbeddingEngine:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingEngine = new EmbeddingEngine();
