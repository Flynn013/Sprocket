import { sprocketEngine } from '../engine/SprocketEngine';
import { sendMessage } from '../lib/gemini';
import SprocketEnginePlugin from '../plugins/SprocketEngine';
import { Capacitor } from '@capacitor/core';

export type ModelType = 'cloud-teacher' | 'local-student' | 'native-pro';

export interface InferenceRequest {
  systemPrompt: string;
  userPrompt: string;
  onToken: (token: string) => void;
  enforceJson?: boolean;
}

export class InferenceRouter {
  static async route(type: ModelType, request: InferenceRequest): Promise<string> {
    const { systemPrompt, userPrompt, onToken, enforceJson = false } = request;

    if (type === 'native-pro' && Capacitor.isNativePlatform()) {
      return this.runNativeInference(systemPrompt, userPrompt, enforceJson, onToken);
    }

    if (type === 'cloud-teacher') {
      return this.runCloudInference(systemPrompt, userPrompt, enforceJson, onToken);
    }

    return this.runLocalInference(systemPrompt, userPrompt, enforceJson, onToken);
  }

  private static async runCloudInference(sys: string, user: string, enforceJson: boolean, onToken: (t: string) => void): Promise<string> {
    // Using our existing Gemini integration as the "Teacher"
    const response = await sendMessage(
      user, 
      [], 
      { 
        googleSearch: !enforceJson, // Turn off search in the Danger Room to isolate reasoning
        readWebpage: false,
        jsonMode: enforceJson
      }, 
      sys, 
      undefined, 
      'gemini', 
      undefined, 
      onToken
    );
    return response.text;
  }

  private static async runLocalInference(sys: string, user: string, enforceJson: boolean, onToken: (t: string) => void): Promise<string> {
    if (!sprocketEngine.isInitialized) {
      await sprocketEngine.init();
    }
    return await sprocketEngine.runAgentLoop(sys, [{ role: 'user', content: user }], onToken, undefined, enforceJson ? "json_object" : "text");
  }

  private static async runNativeInference(sys: string, user: string, enforceJson: boolean, onToken: (t: string) => void): Promise<string> {
    let fullText = "";
    const listener = await SprocketEnginePlugin.addListener('token', (data) => {
      fullText += data.chunk;
      onToken(fullText);
    });

    try {
      const result = await SprocketEnginePlugin.prompt({
        systemPrompt: sys,
        userPrompt: user,
        modelPath: '/sdcard/Download/sprocket-models/llama-3-8b.gguf',
        responseFormat: enforceJson ? "json_object" : "text"
      });
      return result.response || fullText;
    } finally {
      listener.remove();
    }
  }
}
