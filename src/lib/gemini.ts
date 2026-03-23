import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

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
  }
];

export async function sendMessage(
  message: string,
  history: Message[],
  tools: { googleSearch: boolean; readWebpage: boolean; goosePen?: boolean; memory?: boolean },
  systemInstruction?: string,
  callbacks?: ToolCallbacks,
  provider: 'gemini' | 'local' = 'gemini',
  localConfig?: { endpoint: string; model: string }
) {
  if (provider === 'local' && localConfig) {
    return sendLocalMessage(message, history, tools, systemInstruction, callbacks, localConfig);
  }

  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please check your environment configuration.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview"; // Use pro for better tool usage and reasoning
  
  const config: any = {};
  const activeTools: any[] = [];
  
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
      activeTools.push({ functionDeclarations: allFunctionDeclarations });
    }
  }

  if (activeTools.length > 0) {
    config.tools = activeTools;
  }

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message }] }
  ];

  let response = await ai.models.generateContent({
    model,
    contents,
    config
  });

  // Handle function calls
  while (response.functionCalls && response.functionCalls.length > 0) {
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
      model,
      contents,
      config
    });
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
  tools: { googleSearch: boolean; readWebpage: boolean; goosePen?: boolean; memory?: boolean },
  systemInstruction: string | undefined,
  callbacks: ToolCallbacks | undefined,
  localConfig: { endpoint: string; model: string }
) {
  const openAiMessages: any[] = [];
  if (systemInstruction) {
    openAiMessages.push({ role: 'system', content: systemInstruction });
  }

  for (const msg of history) {
    if (msg.role === 'user') {
      const textParts = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
      const functionResponses = msg.parts.filter(p => p.functionResponse);
      
      if (textParts) {
        openAiMessages.push({ role: 'user', content: textParts });
      }
      for (const fr of functionResponses) {
        openAiMessages.push({
          role: 'tool',
          tool_call_id: fr.functionResponse.name + '_call', // Mock ID
          name: fr.functionResponse.name,
          content: JSON.stringify(fr.functionResponse.response)
        });
      }
    } else if (msg.role === 'model') {
      const textParts = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
      const functionCalls = msg.parts.filter(p => p.functionCall);
      
      const messageObj: any = { role: 'assistant' };
      if (textParts) messageObj.content = textParts;
      if (functionCalls.length > 0) {
        messageObj.tool_calls = functionCalls.map(fc => ({
          id: fc.functionCall.name + '_call', // Mock ID
          type: 'function',
          function: {
            name: fc.functionCall.name,
            arguments: JSON.stringify(fc.functionCall.args)
          }
        }));
      }
      openAiMessages.push(messageObj);
    }
  }

  openAiMessages.push({ role: 'user', content: message });

  let allTools: FunctionDeclaration[] = [];
  if (tools.goosePen) allTools = [...allTools, ...goosePenTools];
  if (tools.memory) allTools = [...allTools, ...memoryTools];

  const openAiTools = allTools.length > 0 ? allTools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  })) : undefined;

  let currentMessages = [...openAiMessages];
  let finalResponseText = "";
  const newGeminiMessages: Message[] = [];

  while (true) {
    const response = await fetch(`${localConfig.endpoint.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: localConfig.model,
        messages: currentMessages,
        tools: openAiTools,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local LLM Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const responseMessage = data.choices[0].message;
    currentMessages.push(responseMessage);

    if (responseMessage.content) {
      finalResponseText += responseMessage.content;
    }

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const functionCallsForGeminiHistory: any[] = [];
      const functionResponsesForGeminiHistory: any[] = [];

      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name;
        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool arguments", toolCall.function.arguments);
        }
        
        functionCallsForGeminiHistory.push({
          functionCall: { name, args, ...(toolCall.id ? { id: toolCall.id } : {}) }
        });

        let result = "";
        try {
          if (name === 'writeFile' && callbacks?.writeFile) result = callbacks.writeFile(args.path, args.content);
          else if (name === 'readFile' && callbacks?.readFile) result = callbacks.readFile(args.path);
          else if (name === 'listDir' && callbacks?.listDir) result = callbacks.listDir(args.path);
          else if (name === 'runCommand' && callbacks?.runCommand) result = callbacks.runCommand(args.command);
          else if (name === 'browseUrl' && callbacks?.browseUrl) result = await callbacks.browseUrl(args.url);
          else if (name === 'saveMemory' && callbacks?.saveMemory) result = callbacks.saveMemory(args.fact);
          else result = `Error: Tool ${name} not found.`;
        } catch (err: any) {
          result = `Error: ${err.message}`;
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: result
        });

        functionResponsesForGeminiHistory.push({
          functionResponse: { name, response: { result }, ...(toolCall.id ? { id: toolCall.id } : {}) }
        });
      }

      newGeminiMessages.push({ role: 'model', parts: functionCallsForGeminiHistory });
      newGeminiMessages.push({ role: 'user', parts: functionResponsesForGeminiHistory });
      
    } else {
      break;
    }
  }

  return {
    text: finalResponseText,
    candidates: [],
    newMessages: newGeminiMessages
  };
}
