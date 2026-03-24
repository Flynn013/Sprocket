import { Type, FunctionDeclaration } from "@google/genai";

export type ModelTier = 'lite' | 'standard' | 'premium';

export class PromptArchitect {
  static getModelTier(modelId: string): ModelTier {
    const id = modelId.toLowerCase();
    if (id.includes('1b') || id.includes('tiny') || id.includes('nano')) return 'lite';
    if (id.includes('8b') || id.includes('7b') || id.includes('flash')) return 'standard';
    return 'premium';
  }

  static getSystemInstruction(tier: ModelTier, baseInstruction: string): string {
    const common = `\n\n[AGENTIC GUIDELINES]\n- Be persistent. If a tool fails, try another way.\n- For complex tasks, use 'managePlan' to track progress.\n- Use the BrainBucket (Vault) to store and retrieve long-term knowledge.`;
    
    if (tier === 'lite') {
      return `${baseInstruction}\n\n[LITE MODE OPTIMIZATION]\n- Keep your reasoning concise.\n- Focus on one tool call at a time.\n- Always explain your next step clearly before calling a tool.${common}`;
    }
    
    if (tier === 'standard') {
      return `${baseInstruction}\n\n[STANDARD MODE OPTIMIZATION]\n- You can chain multiple tool calls if they are independent.\n- Use the Vault to build a knowledge graph of your findings.${common}`;
    }
    
    return `${baseInstruction}\n\n[PREMIUM MODE OPTIMIZATION]\n- Use advanced reasoning and planning.\n- Synthesize information from multiple sources (Browser, VFS, Vault) before responding.\n- Proactively suggest improvements to the user's workflow.${common}`;
  }

  static filterTools(tier: ModelTier, allTools: FunctionDeclaration[]): FunctionDeclaration[] {
    if (tier === 'lite') {
      // Lite models struggle with too many tools. Keep only the essentials.
      const essentials = ['writeFile', 'readFile', 'runCommand', 'saveMemory', 'searchVault', 'managePlan'];
      return allTools.filter(t => essentials.includes(t.name));
    }
    return allTools;
  }
}
