package de.gopa.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reicht den Text, der per "Teilen" (TikTok/Instagram) ankommt, an die Web-Oberfläche weiter. */
@CapacitorPlugin(name = "ShareIntent")
public class ShareIntentPlugin extends Plugin {
    static String pending = null;

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) {
            result.put("text", pending);
            pending = null;
        }
        call.resolve(result);
    }
}
