import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { sprocketEngine } from '../engine/SprocketEngine';
import { PromptArchitect, ModelTier } from '../engine/PromptArchitect';

export type Message = {
  role: 'user' | 'model';
  parts: any[];
};

export interface ToolCallbacks {
  writeFile?: (path: string, content: string) => string;
  readFile?: (path: string) => string;
  listDir?: (path: string) => string;
  runCommand?: (command: string) => string;
  browseUrl?: (url: string) => Promise<string>;
  saveMemory?: (fact: string) => string;
  searchVault?: (keyword: string) => Promise<string>;
  readNeuron?: (title: string) => Promise<string>;
  writeNeuron?: (title: string, content: string) => Promise<string>;
  getBacklinks?: (title: string) => Promise<string>;
  createSynapse?: (sourceTitle: string, targetTitle: string) => Promise<string>;
  readScreen?: () => Promise<string>;
  peckElement?: (elementId: string) => Promise<string>;
  managePlan?: (action: 'create' | 'update' | 'read' | 'delete', id: string, plan?: any) => Promise<string>;
  listPlans?: () => Promise<string>;
  vectorSearch?: (query: string, topK?: number) => Promise<string>;
}

const memoryTools: FunctionDeclaration[] = [
  {
    name: 'saveMemory',
    description: 'Save a fact, preference, or important memory about the user. This will be persisted across sessions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, description: 'The fact or preference to remember (e.g., "User prefers dark mode", "User lives in New York")' }
      },
      required: ['fact']
    }
  },
  {
    name: 'searchVault',
    description: 'Search the local Obsidian-style vault for a keyword to retrieve relevant memories and knowledge.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: { type: Type.STRING, description: 'The keyword or phrase to search for in the vault.' }
      },
      required: ['keyword']
    }
  },
  {
    name: 'readNeuron',
    description: 'Read the content of a specific neuron (markdown file) from the vault.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'The exact title of the neuron to read (without .md extension).' }
      },
      required: ['title']
    }
  },
  {
    name: 'writeNeuron',
    description: 'Create or update a neuron (markdown file) in the vault to store knowledge. Use [[Wiki-Links]] in the content to reference other neurons.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'The title of the neuron (without .md extension).' },
        content: { type: Type.STRING, description: 'The markdown content of the neuron. Include [[Wiki-Links]] to connect ideas.' }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'getBacklinks',
    description: 'Find all other neurons in the vault that link to the specified neuron title.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'The title of the neuron to find backlinks for.' }
      },
      required: ['title']
    }
  },
  {
    name: 'createSynapse',
    description: 'Create a direct link (synapse) between two neurons in the vault graph.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceTitle: { type: Type.STRING, description: 'The title of the source neuron.' },
        targetTitle: { type: Type.STRING, description: 'The title of the target neuron to link to.' }
      },
      required: ['sourceTitle', 'targetTitle']
    }
  }
];

const goosePenTools: FunctionDeclaration[] = [
  {
    name: 'writeFile',
    description: 'Write content to a file in the virtual file system',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path, e.g., /home/user/notes.txt' },
        content: { type: Type.STRING, description: 'Content to write' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'readFile',
    description: 'Read content from a file in the virtual file system',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING }
      },
      required: ['path']
    }
  },
  {
    name: 'listDir',
    description: 'List files in a directory in the virtual file system',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING }
      },
      required: ['path']
    }
  },
  {
    name: 'runCommand',
    description: 'Run a shell command in the GoosePen terminal (e.g., ls, cat, echo, mkdir, touch, rm)',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'The shell command to execute' }
      },
      required: ['command']
    }
  },
  {
    name: 'browseUrl',
    description: 'Fetch and read the text content of a webpage in the simulated browser',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING }
      },
      required: ['url']
    }
  },
  {
    name: 'readScreen',
    description: 'Read the current UI elements visible in the PeckingStation viewport.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'peckElement',
    description: 'Tap or click an element in the PeckingStation by its ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementId: { type: Type.STRING, description: 'The ID of the element to peck/click.' }
      },
      required: ['elementId']
    }
  },
  {
    name: 'managePlan',
    description: 'Create, update, read, or delete a structured multi-step plan for complex tasks. Plans are stored in the vault.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['create', 'update', 'read', 'delete'], description: 'The action to perform on the plan.' },
        id: { type: Type.STRING, description: 'The unique ID of the plan (e.g., "research_ai_news").' },
        plan: { 
          type: Type.OBJECT, 
          description: 'The plan object (required for create/update). Should include "title", "steps" (array of {task, status}), and "status".',
          properties: {
            title: { type: Type.STRING },
            steps: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['pending', 'in-progress', 'completed', 'failed'] }
                }
              }
            },
            status: { type: Type.STRING, enum: ['active', 'completed', 'cancelled'] }
          }
        }
      },
      required: ['action', 'id']
    }
  },
  {
    name: 'vectorSearch',
    description: 'Perform a semantic search in the vault using embeddings. This is better than keyword search for finding related concepts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query or concept to find.' },
        topK: { type: Type.NUMBER, description: 'Number of results to return (default 5).' }
      },
      required: ['query']
    }
  }
];

export async function sendMessage(
  message: string,
  history: Message[],
  tools: { googleSearch: boolean; readWebpage: boolean; goosePen?: boolean; memory?: boolean; jsonMode?: boolean },
  systemInstruction?: string,
  callbacks?: ToolCallbacks,
  provider: 'gemini' | 'local' = 'gemini',
  localConfig?: { endpoint: string; model: string },
  onToken?: (token: string) => void
) {
  if (provider === 'local') {
    return sendLocalMessage(message, history, tools, systemInstruction, callbacks, localConfig || { endpoint: '', model: 'Llama-3.1-8B-Instruct-q4f16_1-MLC' }, onToken);
  }

  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please check your environment configuration.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-3.1-pro-preview"; // Use pro for better tool usage and reasoning
  const tier = PromptArchitect.getModelTier(modelId);
  
  const config: any = {};
  let activeTools: any[] = [];
  
  if (tools.jsonMode) {
    config.responseMimeType = "application/json";
  }
  
  if (tools.googleSearch) {
    activeTools.push({ googleSearch: {} });
  }
  
  if (tools.readWebpage) {
    activeTools.push({ urlContext: {} });
  } else {
    let allFunctionDeclarations: FunctionDeclaration[] = [];

    if (tools.goosePen) {
      allFunctionDeclarations = [...allFunctionDeclarations, ...goosePenTools];
    }

    if (tools.memory) {
      allFunctionDeclarations = [...allFunctionDeclarations, ...memoryTools];
    }

    if (allFunctionDeclarations.length > 0) {
      const filtered = PromptArchitect.filterTools(tier, allFunctionDeclarations);
      activeTools.push({ functionDeclarations: filtered });
    }
  }

  if (activeTools.length > 0) {
    config.tools = activeTools;
  }

  const finalInstruction = PromptArchitect.getSystemInstruction(tier, systemInstruction || "");
  if (finalInstruction) {
    config.systemInstruction = finalInstruction;
  }

  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message }] }
  ];

  let response = await ai.models.generateContent({
    model: modelId,
    contents,
    config
  });

  if (onToken && response.text) {
    onToken(response.text);
  }

  // Handle function calls
  let geminiHopCount = 0;
  const MAX_GEMINI_HOPS = 30;

  while (response.functionCalls && response.functionCalls.length > 0 && geminiHopCount < MAX_GEMINI_HOPS) {
    geminiHopCount++;
    const functionCall = response.functionCalls[0];
    const { name, args } = functionCall;
    
    let result = "";
    try {
      if (name === 'writeFile' && callbacks?.writeFile) {
        result = callbacks.writeFile(args.path as string, args.content as string);
      } else if (name === 'readFile' && callbacks?.readFile) {
        result = callbacks.readFile(args.path as string);
      } else if (name === 'listDir' && callbacks?.listDir) {
        result = callbacks.listDir(args.path as string);
      } else if (name === 'runCommand' && callbacks?.runCommand) {
        result = callbacks.runCommand(args.command as string);
      } else if (name === 'browseUrl' && callbacks?.browseUrl) {
        result = await callbacks.browseUrl(args.url as string);
      } else if (name === 'saveMemory' && callbacks?.saveMemory) {
        result = callbacks.saveMemory(args.fact as string);
      } else if (name === 'searchVault' && callbacks?.searchVault) {
        result = await callbacks.searchVault(args.keyword as string);
      } else if (name === 'readNeuron' && callbacks?.readNeuron) {
        result = await callbacks.readNeuron(args.title as string);
      } else if (name === 'writeNeuron' && callbacks?.writeNeuron) {
        result = await callbacks.writeNeuron(args.title as string, args.content as string);
      } else if (name === 'getBacklinks' && callbacks?.getBacklinks) {
        result = await callbacks.getBacklinks(args.title as string);
      } else if (name === 'createSynapse' && callbacks?.createSynapse) {
        result = await callbacks.createSynapse(args.sourceTitle as string, args.targetTitle as string);
      } else if (name === 'readScreen' && callbacks?.readScreen) {
        result = await callbacks.readScreen();
      } else if (name === 'peckElement' && callbacks?.peckElement) {
        result = await callbacks.peckElement(args.elementId as string);
      } else if (name === 'managePlan' && callbacks?.managePlan) {
        result = await callbacks.managePlan(args.action as any, args.id as string, args.plan);
      } else if (name === 'listPlans' && callbacks?.listPlans) {
        result = await callbacks.listPlans();
      } else if (name === 'vectorSearch' && callbacks?.vectorSearch) {
        result = await callbacks.vectorSearch(args.query as string, args.topK as number);
      } else {
        result = `Error: Tool ${name} not found or not implemented.`;
      }
    } catch (err: any) {
      result = `Error executing ${name}: ${err.message}`;
    }

    // Append the model's function call to history
    const modelParts: any[] = [];
    if (response.text) {
      modelParts.push({ text: response.text });
    }
    modelParts.push({ functionCall: { name, args, ...((functionCall as any).id ? { id: (functionCall as any).id } : {}) } });

    contents.push({
      role: 'model',
      parts: modelParts
    });

    // Append the function response to history
    contents.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name,
          response: { result },
          ...((functionCall as any).id ? { id: (functionCall as any).id } : {})
        }
      }]
    });

    // Call the model again with the function response
    response = await ai.models.generateContent({
      model: modelId,
      contents,
      config
    });
    if (onToken && response.text) {
      onToken(response.text);
    }
  }

  // Update the history array in place so the caller gets the updated history
  // Actually, the caller manages its own history, so we should return the new messages
  // that were added during the function calling loop.
  const newMessages = contents.slice(history.length + 1) as Message[]; // Skip the original user message
  
  return {
    text: response.text,
    candidates: response.candidates,
    newMessages // The caller can append these to their history state
  };
}

async function sendLocalMessage(
  message: string,
  history: Message[],
  tools: { googleSearch: boolean; readWebpage: boolean; goosePen?: boolean; memory?: boolean; jsonMode?: boolean },
  systemInstruction: string | undefined,
  callbacks: ToolCallbacks | undefined,
  localConfig: { endpoint: string; model: string },
  onToken?: (token: string) => void
) {
  const tier = PromptArchitect.getModelTier(localConfig.model);
  const finalInstruction = PromptArchitect.getSystemInstruction(tier, systemInstruction || "");

  let fullUserPrompt = "";
  for (const msg of history) {
    if (msg.role === 'user') {
      const textParts = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
      if (textParts) fullUserPrompt += `User: ${textParts}\n`;
    } else if (msg.role === 'model') {
      const textParts = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
      if (textParts) fullUserPrompt += `Assistant: ${textParts}\n`;
    }
  }
  fullUserPrompt += `User: ${message}\n`;

  let finalResponseText = "";
  const newGeminiMessages: Message[] = [];

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const SprocketEnginePlugin = (await import('../plugins/SprocketEngine')).default;
      
      const listener = await SprocketEnginePlugin.addListener('token', (data) => {
        finalResponseText += data.chunk;
        if (onToken) onToken(finalResponseText);
      });

      try {
        const result = await SprocketEnginePlugin.prompt({
          systemPrompt: finalInstruction,
          userPrompt: fullUserPrompt,
          modelPath: '/sdcard/Download/sprocket-models/llama-3-8b.gguf',
          responseFormat: tools.jsonMode ? "json_object" : "text"
        });
        finalResponseText = result.response || finalResponseText;
      } finally {
        listener.remove();
      }
    } else {
      // Fallback for web preview
      finalResponseText = "[Simulated Local Response] This is a simulated response because the app is running in a web browser. The native Llama.cpp engine requires an Android device.";
      if (onToken) {
        for (let i = 0; i < finalResponseText.length; i++) {
          await new Promise(r => setTimeout(r, 10));
          onToken(finalResponseText.substring(0, i + 1));
        }
      }
    }
  } catch (error: any) {
    console.error("Local inference failed:", error);
    finalResponseText = `Error running local inference: ${error.message}`;
  }

  return {
    text: finalResponseText,
    candidates: [],
    newMessages: newGeminiMessages
  };
}
