package com.jaider.youtubeliquid;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LoopbackAuthPlugin.class);
        super.onCreate(savedInstanceState);
        // el siguiente video de la lista arranca solo (reproducción automática)
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
