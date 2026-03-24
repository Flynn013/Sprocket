export class EmbeddingEngine {
  private worker: Worker | null = null;
  private messageId = 0;
  private callbacks: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();

  async init() {
    if (this.worker) return;
    
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const callback = this.callbacks.get(id);
      if (callback) {
        if (error) callback.reject(new Error(error));
        else callback.resolve(result);
        this.callbacks.delete(id);
      }
    };
  }

  private postMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.callbacks.set(id, { resolve, reject });
      this.worker?.postMessage({ id, type, payload });
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    await this.init();
    return this.postMessage('getEmbedding', { text });
  }

  async saveVector(title: string, embedding: number[]): Promise<boolean> {
    await this.init();
    return this.postMessage('saveVector', { title, embedding });
  }

  async embedAndSave(text: string, vectorPath: string): Promise<any> {
    await this.init();
    return this.postMessage('embed_and_save', { text, vectorPath });
  }

  async vectorSearch(query: string, topK: number = 3): Promise<{ title: string; score: number }[]> {
    await this.init();
    return this.postMessage('vectorSearch', { query, topK });
  }
}

export const embeddingEngine = new EmbeddingEngine();
