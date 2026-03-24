import { sprocketEngine } from '../engine/SprocketEngine';
import { sendMessage } from '../lib/gemini';
import SprocketEnginePlugin from '../plugins/SprocketEngine';
import { Capacitor } from '@capacitor/core';

export type ModelType = 'cloud-teacher' | 'local-student' | 'native-pro';

export interface InferenceRequest {
  systemPrompt: string;
  userPrompt: string;
  onToken: (token: string) => void;
}

export class InferenceRouter {
  static async route(type: ModelType, request: InferenceRequest): Promise<string> {
    const { systemPrompt, userPrompt, onToken } = request;

    if (type === 'native-pro' && Capacitor.isNativePlatform()) {
      return this.runNativeInference(systemPrompt, userPrompt, onToken);
    }

    if (type === 'cloud-teacher') {
      return this.runCloudInference(systemPrompt, userPrompt, onToken);
    }

    return this.runLocalInference(systemPrompt, userPrompt, onToken);
  }

  private static async runCloudInference(sys: string, user: string, onToken: (t: string) => void): Promise<string> {
    // Using our existing Gemini integration as the "Teacher"
    const response = await sendMessage(user, [], { googleSearch: true, readWebpage: false }, sys, undefined, 'gemini', undefined, onToken);
    return response.text;
  }

  private static async runLocalInference(sys: string, user: string, onToken: (t: string) => void): Promise<string> {
    if (!sprocketEngine.isInitialized) {
      await sprocketEngine.init();
    }
    return await sprocketEngine.runAgentLoop(sys, [{ role: 'user', content: user }], onToken);
  }

  private static async runNativeInference(sys: string, user: string, onToken: (t: string) => void): Promise<string> {
    let fullText = "";
    const listener = await SprocketEnginePlugin.addListener('token', (data) => {
      fullText += data.chunk;
      onToken(fullText);
    });

    try {
      await SprocketEnginePlugin.prompt({
        systemPrompt: sys,
        userPrompt: user,
        modelPath: '/sdcard/Download/sprocket-models/llama-3-8b.gguf'
      });
      // In a real implementation, we'd wait for a 'complete' event
      return fullText;
    } finally {
      listener.remove();
    }
  }
}
