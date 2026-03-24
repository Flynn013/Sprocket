import { pipeline, env } from '@xenova/transformers';

// Disable local model check for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;
let rootDir: FileSystemDirectoryHandle | null = null;
let vectorsDir: FileSystemDirectoryHandle | null = null;

async function init() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  if (!rootDir) {
    rootDir = await navigator.storage.getDirectory();
    vectorsDir = await rootDir.getDirectoryHandle('vectors', { create: true });
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
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

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  try {
    await init();
    
    if (type === 'getEmbedding') {
      const output = await extractor(payload.text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      self.postMessage({ id, result: embedding });
    } else if (type === 'saveVector') {
      const { title, embedding } = payload;
      const fileHandle = await vectorsDir!.getFileHandle(`${title}.bin`, { create: true });
      // Use synchronous access handle for native-speed disk access
      const accessHandle = await (fileHandle as any).createSyncAccessHandle();
      const float32Array = new Float32Array(embedding);
      const buffer = new Uint8Array(float32Array.buffer);
      accessHandle.write(buffer, { at: 0 });
      accessHandle.flush();
      accessHandle.close();
      self.postMessage({ id, result: true });
    } else if (type === 'embed_and_save') {
      const { text, vectorPath } = payload;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const embeddingArray = Array.from(output.data) as number[];
      
      const fileHandle = await vectorsDir!.getFileHandle(vectorPath, { create: true });
      const accessHandle = await (fileHandle as any).createSyncAccessHandle();
      const float32Array = new Float32Array(embeddingArray);
      const buffer = new Uint8Array(float32Array.buffer);
      accessHandle.write(buffer, { at: 0 });
      accessHandle.flush();
      accessHandle.close();
      
      self.postMessage({ id, result: true, vectorPath });
    } else if (type === 'vectorSearch') {
      const { query, topK } = payload;
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const queryEmbedding = Array.from(output.data) as number[];
      
      const results: { title: string; score: number }[] = [];
      
      // @ts-ignore
      for await (const [name, handle] of vectorsDir!.entries()) {
        if (handle.kind === 'file' && name.endsWith('.bin')) {
          const fileHandle = await vectorsDir!.getFileHandle(name);
          const accessHandle = await (fileHandle as any).createSyncAccessHandle();
          const fileSize = accessHandle.getSize();
          const buffer = new Uint8Array(fileSize);
          accessHandle.read(buffer, { at: 0 });
          accessHandle.close();
          
          const float32Array = new Float32Array(buffer.buffer);
          const embedding = Array.from(float32Array);
          
          const score = cosineSimilarity(queryEmbedding, embedding);
          results.push({ title: name.replace('.bin', ''), score });
        }
      }
      
      results.sort((a, b) => b.score - a.score);
      self.postMessage({ id, result: results.slice(0, topK) });
    }
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};
