package com.kmarchais.orbit;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.CookieManager;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(AtlasGooglePlugin.class);
        super.onCreate(state);
        // The native asset origin and the HTTPS account API are different sites.
        // Session credentials remain in HttpOnly cookies, never JS storage.
        CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), true);
    }
}
