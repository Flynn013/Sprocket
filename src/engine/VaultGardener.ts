import { sprocketEngine } from './SprocketEngine';
import { seedNeurons, seedSynapses } from './seedData';

export interface VaultGraph {
  nodes: { id: string; group: number }[];
  links: { source: string; target: string; value: number }[];
}

export class VaultGardener {
  private rootDir: FileSystemDirectoryHandle | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    try {
      this.rootDir = await navigator.storage.getDirectory();
      
      // Ensure directory structure
      await this.rootDir.getDirectoryHandle('sensory', { create: true });
      const neuronsDir = await this.rootDir.getDirectoryHandle('neurons', { create: true });
      await this.rootDir.getDirectoryHandle('synapses', { create: true });
      await this.rootDir.getDirectoryHandle('atlas', { create: true });
      
      this.isInitialized = true;

      // Check if vault is empty and pre-seed it
      let isEmpty = true;
      for await (const _ of (neuronsDir as any).values()) {
        isEmpty = false;
        break;
      }

      if (isEmpty) {
        console.log("Vault is empty. Pre-seeding with foundational knowledge...");
        for (const neuron of seedNeurons) {
          await this.write_vault_neuron(neuron.title, neuron.content);
        }
        for (const synapse of seedSynapses) {
          await this.createSynapse(synapse.source, synapse.target);
        }
        console.log("Pre-seeding complete.");
      }
    } catch (error) {
      console.error("Failed to initialize OPFS Vault:", error);
      throw error;
    }
  }

  async read_vault_file(path: string): Promise<string> {
    await this.init();
    try {
      const parts = path.split('/').filter(Boolean);
      let currentDir = this.rootDir!;
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i]);
      }
      
      const fileName = parts[parts.length - 1];
      const fileHandle = await currentDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      console.error(`Failed to read file ${path}:`, error);
      throw new Error(`File not found or unreadable: ${path}`);
    }
  }

  async write_vault_neuron(title: string, content: string): Promise<void> {
    await this.init();
    try {
      const neuronsDir = await this.rootDir!.getDirectoryHandle('neurons');
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
      const fileHandle = await neuronsDir.getFileHandle(safeTitle, { create: true });
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      await this.build_atlas();
      window.dispatchEvent(new CustomEvent('vault-updated'));
    } catch (error) {
      console.error(`Failed to write neuron ${title}:`, error);
      throw new Error(`Failed to write neuron: ${title}`);
    }
  }

  async list_vault_dir(path: string): Promise<string[]> {
    await this.init();
    try {
      const parts = path.split('/').filter(Boolean);
      let currentDir = this.rootDir!;
      
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part);
      }
      
      const entries: string[] = [];
      // @ts-ignore - TS doesn't fully support async iterators on OPFS handles yet
      for await (const [name, handle] of currentDir.entries()) {
        entries.push(`${name}${handle.kind === 'directory' ? '/' : ''}`);
      }
      return entries;
    } catch (error) {
      console.error(`Failed to list directory ${path}:`, error);
      throw new Error(`Directory not found or unreadable: ${path}`);
    }
  }

  async distillLog(logContent: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const safeTitle = `Log_Distillation_${timestamp.replace(/[:.]/g, '-')}`;
    
    let summary = "(Pending LLM Processing)";
    
    try {
      // Try to use local LLM first if it's initialized
      if (sprocketEngine.isInitialized) {
        const response = await sprocketEngine.chatCompletion({
          messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes log content into concise, meaningful insights. Extract key facts, decisions, and outcomes.' },
            { role: 'user', content: `Please summarize the following log content:\n\n${logContent}` }
          ],
          temperature: 0.3,
        });
        
        if (response.choices && response.choices.length > 0) {
          summary = response.choices[0].message.content || summary;
        }
      } else {
        // Fallback to Gemini if API key is available
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (apiKey) {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Please summarize the following log content into concise, meaningful insights. Extract key facts, decisions, and outcomes:\n\n${logContent}`
          });
          summary = response.text || summary;
        } else {
          summary = "No LLM available to process this log.";
        }
      }
    } catch (e) {
      console.error("Failed to distill log:", e);
      summary = `Error during distillation: ${e}`;
    }

    const content = `# Distilled Log\n\nDate: ${timestamp}\n\n## Summary\n${summary}\n\n## Raw Content\n${logContent}`;
    await this.write_vault_neuron(safeTitle, content);
  }

  async createSynapse(sourceTitle: string, targetTitle: string): Promise<void> {
    await this.init();
    try {
      const synapsesDir = await this.rootDir!.getDirectoryHandle('synapses');
      const safeSource = sourceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeTarget = targetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const synapseName = `${safeSource}_to_${safeTarget}.md`;
      
      const fileHandle = await synapsesDir.getFileHandle(synapseName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(`[[${sourceTitle}]] -> [[${targetTitle}]]`);
      await writable.close();
      
      // Rebuild the atlas after a new synapse is created
      await this.build_atlas();
      window.dispatchEvent(new CustomEvent('vault-updated'));
    } catch (error) {
      console.error(`Failed to create synapse:`, error);
      throw new Error(`Failed to create synapse`);
    }
  }

  async search_vault(keyword: string): Promise<string[]> {
    await this.init();
    try {
      const neuronsDir = await this.rootDir!.getDirectoryHandle('neurons');
      const results: string[] = [];
      
      // @ts-ignore
      for await (const [name, handle] of neuronsDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          const file = await handle.getFile();
          const text = await file.text();
          if (text.toLowerCase().includes(keyword.toLowerCase())) {
            results.push(name.replace('.md', ''));
          }
        }
      }
      return results;
    } catch (error) {
      console.error(`Failed to search vault for ${keyword}:`, error);
      return [];
    }
  }

  async get_backlinks(title: string): Promise<string[]> {
    // A backlink is simply any file that contains [[Title]]
    return this.search_vault(`[[${title}]]`);
  }

  async build_atlas(): Promise<void> {
    await this.init();
    try {
      const neuronsDir = await this.rootDir!.getDirectoryHandle('neurons');
      const atlasDir = await this.rootDir!.getDirectoryHandle('atlas');
      
      const graph: VaultGraph = { nodes: [], links: [] };
      const nodeSet = new Set<string>();
      
      // @ts-ignore
      for await (const [name, handle] of neuronsDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          const title = name.replace('.md', '');
          if (!nodeSet.has(title)) {
            graph.nodes.push({ id: title, group: 1 });
            nodeSet.add(title);
          }
          
          const file = await handle.getFile();
          const text = await file.text();
          
          // Extract all [[Wiki-Links]]
          const regex = /\[\[(.*?)\]\]/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const target = match[1];
            // Add target node if it doesn't exist yet
            if (!nodeSet.has(target)) {
              graph.nodes.push({ id: target, group: 2 });
              nodeSet.add(target);
            }
            graph.links.push({ source: title, target: target, value: 1 });
          }
        }
      }
      
      const fileHandle = await atlasDir.getFileHandle('graph.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(graph, null, 2));
      await writable.close();
    } catch (error) {
      console.error("Failed to build atlas:", error);
    }
  }

  async get_graph(): Promise<VaultGraph> {
    await this.init();
    try {
      const atlasDir = await this.rootDir!.getDirectoryHandle('atlas');
      const fileHandle = await atlasDir.getFileHandle('graph.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text) as VaultGraph;
    } catch (error) {
      // If graph doesn't exist, return empty
      return { nodes: [], links: [] };
    }
  }
}

export const vaultGardener = new VaultGardener();
