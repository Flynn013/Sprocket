package com.sprocket.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LlamaCPP")
public class LlamaCPPPlugin extends Plugin {

    static {
        System.loadLibrary("llamacpp_jni");
    }

    private native String runInferenceJNI(String modelPath, String systemPrompt, String userPrompt, String responseFormat);

    @PluginMethod
    public void prompt(PluginCall call) {
        String modelPath = call.getString("modelPath");
        String systemPrompt = call.getString("systemPrompt");
        String userPrompt = call.getString("userPrompt");
        String responseFormat = call.getString("responseFormat", "text");

        if (modelPath == null || userPrompt == null) {
            call.reject("Must provide modelPath and userPrompt");
            return;
        }

        // Run inference in a background thread
        new Thread(() -> {
            try {
                String response = runInferenceJNI(modelPath, systemPrompt != null ? systemPrompt : "", userPrompt, responseFormat);
                
                JSObject ret = new JSObject();
                ret.put("response", response);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Inference failed", e);
            }
        }).start();
    }

    // Called from JNI to emit tokens back to JS
    public void onToken(String token) {
        JSObject ret = new JSObject();
        ret.put("chunk", token);
        notifyListeners("token", ret);
    }
}
