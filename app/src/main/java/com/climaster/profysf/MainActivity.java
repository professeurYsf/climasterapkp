package com.climaster.profysf;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.Collections;

public class MainActivity extends AppCompatActivity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final String HOST = "appassets.androidplatform.net";

    // ---- AdMob ----
    private static final String REWARDED_ID = "ca-app-pub-1867364821804175/5435633735";
    private static final String INTERSTITIAL_ID = "ca-app-pub-1867364821804175/4071627355";
    /** Appareil de test du développeur : il reçoit des pubs de test (jamais de vraies pubs sur cet appareil). */
    private static final String TEST_DEVICE = "65247E18382BEB9CE65A68FC1D00DC55";
    private static final long REWARD_WAIT_MS = 8000;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private View statusBg;
    private WebView web;
    private int topInset = 0;
    private String topColor = "";

    private boolean adsStarted = false;
    private RewardedAd rewarded;
    private boolean rewardedLoading = false;
    private boolean waitingReward = false;
    private boolean earned = false;
    private InterstitialAd interstitial;
    private boolean interstitialLoading = false;
    private final Runnable rewardTimeout = () -> {
        if (waitingReward) {
            waitingReward = false;
            js("window.onAdFail&&window.onAdFail()");
        }
    };

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        root = new FrameLayout(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        statusBg = new View(this);
        root.addView(statusBg, new FrameLayout.LayoutParams(-1, 0, Gravity.TOP));
        setContentView(root);

        // Marges système (barres, encoche, clavier) appliquées nativement : l'interface web s'adapte à tout écran.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            topInset = bars.top;
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) statusBg.getLayoutParams();
            lp.height = bars.top;
            statusBg.setLayoutParams(lp);
            return WindowInsetsCompat.CONSUMED;
        });
        applyBars("#0B2545"); // l'accueil est bleu foncé
        hideSystemBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100); // la taille de police système ne casse pas la mise en page
        s.setSupportMultipleWindows(false);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) { }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);

        // Bouton Retour : l'application web revient d'un écran ; sur l'accueil elle demande « Quitter ? »
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript("(function(){return window.__back?window.__back():false})()",
                        v -> { if (!"true".equals(v)) finish(); });
            }
        });

        startAds();
    }

    // ------------------------------------------------------------------ barres système
    private boolean isNight() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private void applyBars(String hex) {
        topColor = hex == null ? "" : hex;
        int defBg = getResources().getColor(R.color.bg);
        root.setBackgroundColor(defBg);
        int top = defBg;
        if (!topColor.isEmpty()) {
            try { top = Color.parseColor(topColor); } catch (Exception ignored) { }
        }
        statusBg.setBackgroundColor(top);
        boolean lightTop = ((Color.red(top) * 299 + Color.green(top) * 587 + Color.blue(top) * 114) / 1000) > 150;
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), root);
        c.setAppearanceLightStatusBars(lightTop);
        c.setAppearanceLightNavigationBars(!isNight());
    }

    /** Plein écran immersif : barre d'état et de navigation masquées (réapparaissent par glissement). */
    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), root);
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyBars(topColor);
    }

    // ------------------------------------------------------------------ pont JS <-> Android
    private class Bridge {
        @JavascriptInterface public void showRewardedAd() { ui.post(MainActivity.this::showRewarded); }
        @JavascriptInterface public void showInterstitial() { ui.post(MainActivity.this::showInter); }
        @JavascriptInterface public void exitApp() { ui.post(MainActivity.this::finishAndRemoveTask); }
        @JavascriptInterface public void setTop(String hex) { ui.post(() -> applyBars(hex)); }
    }

    private void js(String code) {
        ui.post(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    // ------------------------------------------------------------------ AdMob
    private void startAds() {
        final ConsentInformation ci = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        ci.requestConsentInfoUpdate(this, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(this, err -> { if (ci.canRequestAds()) initAds(); }),
                err -> { if (ci.canRequestAds()) initAds(); });
        if (ci.canRequestAds()) initAds();
    }

    private void initAds() {
        if (adsStarted) return;
        adsStarted = true;
        MobileAds.setRequestConfiguration(new RequestConfiguration.Builder()
                .setTestDeviceIds(Collections.singletonList(TEST_DEVICE)).build());
        MobileAds.initialize(this, status -> { loadRewarded(); loadInterstitial(); });
    }

    private void loadRewarded() {
        if (!adsStarted || rewarded != null || rewardedLoading) return;
        rewardedLoading = true;
        RewardedAd.load(this, REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedLoading = false;
                rewarded = ad;
                if (waitingReward) { ui.removeCallbacks(rewardTimeout); presentRewarded(); }
            }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) {
                rewardedLoading = false;
                rewarded = null;
                if (waitingReward) {
                    ui.removeCallbacks(rewardTimeout);
                    waitingReward = false;
                    js("window.onAdFail&&window.onAdFail()");
                }
            }
        });
    }

    private void showRewarded() {
        if (!adsStarted) { initAdsIfPossible(); }
        if (rewarded != null) { presentRewarded(); return; }
        waitingReward = true;
        ui.removeCallbacks(rewardTimeout);
        ui.postDelayed(rewardTimeout, REWARD_WAIT_MS);
        loadRewarded();
        if (!adsStarted) { // SDK pas prêt (consentement refusé / pas initialisé) : échec immédiat
            ui.removeCallbacks(rewardTimeout);
            waitingReward = false;
            js("window.onAdFail&&window.onAdFail()");
        }
    }

    private void initAdsIfPossible() {
        ConsentInformation ci = UserMessagingPlatform.getConsentInformation(this);
        if (ci.canRequestAds()) initAds();
    }

    private void presentRewarded() {
        final RewardedAd ad = rewarded;
        waitingReward = false;
        rewarded = null;
        if (ad == null) { js("window.onAdFail&&window.onAdFail()"); return; }
        earned = false;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() {
                js(earned ? "window.onAdReward&&window.onAdReward()" : "window.onAdSkip&&window.onAdSkip()");
                earned = false;
                loadRewarded();
            }
            @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) {
                js("window.onAdFail&&window.onAdFail()");
                loadRewarded();
            }
        });
        ad.show(this, item -> earned = true);
    }

    private void loadInterstitial() {
        if (!adsStarted || interstitial != null || interstitialLoading) return;
        interstitialLoading = true;
        InterstitialAd.load(this, INTERSTITIAL_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull InterstitialAd ad) { interstitialLoading = false; interstitial = ad; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { interstitialLoading = false; interstitial = null; }
        });
    }

    private void showInter() {
        if (interstitial == null) { loadInterstitial(); return; }
        final InterstitialAd ad = interstitial;
        interstitial = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { loadInterstitial(); }
            @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { loadInterstitial(); }
        });
        ad.show(this);
    }

    // ------------------------------------------------------------------ cycle de vie
    @Override protected void onSaveInstanceState(@NonNull Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() {
        ui.removeCallbacksAndMessages(null);
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }
}
