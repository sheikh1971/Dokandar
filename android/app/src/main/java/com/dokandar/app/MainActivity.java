package com.dokandar.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // The app loads a remote URL, so there's a brief window before the page
        // paints. On Android 10+ in system dark mode, the WebView's own background
        // gets force-darkened to black during that window (and on any load error),
        // producing a black screen. Pin it to white so it always shows a light
        // background instead, matching the site's UI.
        webView.setBackgroundColor(Color.WHITE);

        // Also stop the system from algorithmically re-coloring the page's own
        // content to dark once it loads.
        WebSettings settings = webView.getSettings();
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }
    }
}
