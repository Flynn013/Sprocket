import { InferenceRouter, ModelType } from './InferenceRouter';
import { vaultGardener } from '../engine/VaultGardener';

export interface Puzzle {
  id: string;
  type: 'logic' | 'math' | 'dom';
  content: string;
  expectedAnswer: string;
}

export class DangerRoomEngine {
  private isRunning = false;
  private currentPuzzle: Puzzle | null = null;

  async startContinuousLoop(modelType: ModelType, onUpdate: (telemetry: string) => void) {
    this.isRunning = true;
    onUpdate(`[SYSTEM] Danger Room initialized. Model: ${modelType}`);

    while (this.isRunning) {
      this.currentPuzzle = this.generatePuzzle();
      onUpdate(`[PUZZLE] Spawned: ${this.currentPuzzle.type} - ${this.currentPuzzle.id}`);
      
      const systemPrompt = `You are an expert solver in the Danger Room. 
      Solve the following puzzle. You MUST provide a detailed Chain-of-Thought (CoT) 
      explaining your reasoning before giving the final answer. 
      Format: 
      Reasoning: <your CoT>
      Answer: <final answer>`;

      try {
        const response = await InferenceRouter.route(modelType, {
          systemPrompt,
          userPrompt: this.currentPuzzle.content,
          onToken: (token) => onUpdate(`[THINKING] ${token}`)
        });

        const isCorrect = response.toLowerCase().includes(this.currentPuzzle.expectedAnswer.toLowerCase());
        
        if (isCorrect) {
          onUpdate(`[SUCCESS] Puzzle ${this.currentPuzzle.id} solved correctly.`);
          // Save CoT to BrainBucket for Student RAG
          const title = `CoT_${this.currentPuzzle.type}_${this.currentPuzzle.id}`;
          await vaultGardener.write_vault_neuron(title, response);
          onUpdate(`[VAULT] Saved reasoning to BrainBucket: ${title}`);
        } else {
          onUpdate(`[FAILURE] Incorrect answer. Expected: ${this.currentPuzzle.expectedAnswer}`);
        }

        // Small delay to prevent thermal throttling
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        onUpdate(`[ERROR] Loop interrupted: ${error}`);
        this.isRunning = false;
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  private generatePuzzle(): Puzzle {
    const types: ('logic' | 'math' | 'dom')[] = ['logic', 'math', 'dom'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = Math.random().toString(36).substring(7);

    switch (type) {
      case 'math':
        const a = Math.floor(Math.random() * 100);
        const b = Math.floor(Math.random() * 100);
        return { id, type, content: `What is ${a} + ${b}?`, expectedAnswer: (a + b).toString() };
      case 'logic':
        return { id, type, content: "If all A are B, and some B are C, are all A necessarily C?", expectedAnswer: "No" };
      case 'dom':
        return { id, type, content: "In a list of 5 items, which index is the 3rd item (0-indexed)?", expectedAnswer: "2" };
    }
  }
}

export const dangerRoomEngine = new DangerRoomEngine();
