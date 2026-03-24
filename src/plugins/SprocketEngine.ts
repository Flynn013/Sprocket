import { registerPlugin } from '@capacitor/core';

export interface SprocketEnginePlugin {
  prompt(options: { systemPrompt: string; userPrompt: string; modelPath: string }): Promise<{ response: string }>;
  addListener(eventName: 'token', listenerFunc: (data: { chunk: string }) => void): Promise<any>;
}

const SprocketEngine = registerPlugin<SprocketEnginePlugin>('SprocketEngine');

export default SprocketEngine;
