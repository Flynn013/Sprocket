import { Capacitor } from '@capacitor/core';

export interface NativeAction {
  type: 'click' | 'scroll' | 'type' | 'read_screen' | 'notify';
  payload: any;
}

export class NativeBridge {
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static async execute(action: NativeAction): Promise<any> {
    console.log(`[NativeBridge] Executing ${action.type}`, action.payload);
    
    if (!this.isNative()) {
      // Fallback to simulated behavior in browser
      switch (action.type) {
        case 'read_screen':
          return (window as any).__readScreen?.() || "Simulated screen content";
        case 'click':
          return (window as any).__peckElement?.(action.payload.elementId) || `Clicked ${action.payload.elementId}`;
        case 'notify':
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Sprocket', { body: action.payload.message });
          } else {
            console.log("Notification:", action.payload.message);
          }
          return "Notification sent";
        default:
          return `Action ${action.type} simulated`;
      }
    }

    // In a real Capacitor app, we would call a custom plugin here:
    // return await Capacitor.Plugins.SprocketNative.execute(action);
    return `Native action ${action.type} executed (Stub)`;
  }

  static async requestPermissions(): Promise<boolean> {
    if (!this.isNative()) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return true;
    }
    // return (await Capacitor.Plugins.SprocketNative.requestPermissions()).granted;
    return true;
  }
}
