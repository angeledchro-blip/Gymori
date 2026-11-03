package com.sky.gym;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * La app es la web de Gymori dentro de un WebView más lo que la web no puede hacer sola
 * (alarma, permisos, guardar archivos). Primero intenta abrir la web del Worker de Cloudflare
 * (así los cambios llegan sin reinstalar); si no hay internet o el Worker no existe, abre la copia
 * de web/public que viene dentro del APK. Los datos viven en Android, así que son los mismos en ambos casos.
 */
public class MainActivity extends Activity {
    static final String HOST_LOCAL = "appassets.androidplatform.net";
    static final String URL_LOCAL = "https://" + HOST_LOCAL + "/index.html";
    private static final int CODIGO_PERMISOS_WEB = 7;
    private static final int CODIGO_ARCHIVO = 8;
    private static final long ESPERA_REMOTO_MS = 9000;
    private static final int FONDO = Color.parseColor("#17110D");

    private WebView web;
    private PuenteNativo puente;
    private PermissionRequest permisoPendiente;
    private ValueCallback<Uri[]> archivoPendiente;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private volatile boolean probandoRemoto = false;
    private volatile boolean local = false;
    private volatile boolean paginaLista = false;
    private String hostRemoto = null;

    private final Runnable rendirseRemoto = () -> {
        if (probandoRemoto) cargarLocal();
    };

    boolean usandoLocal() {
        return local;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            Uri u = Uri.parse(BuildConfig.WEB_URL);
            hostRemoto = BuildConfig.WEB_URL.isEmpty() ? null : u.getHost();
        } catch (Exception e) {
            hostRemoto = null;
        }

        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(FONDO);
        web = new WebView(this);
        web.setBackgroundColor(FONDO);
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(raiz);
        respetarBarrasDelSistema(raiz);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        puente = new PuenteNativo(this);
        web.addJavascriptInterface(puente, "GymNativo");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new ClienteChrome());

        manejarIntent(getIntent());
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            cargarInicio();
        }
        // por si se actualizó la app o se reinició el teléfono sin avisar
        new Thread(() -> Alarmas.programarTodas(getApplicationContext())).start();
    }

    // ---------- Qué página abrir ----------

    private void cargarInicio() {
        if (hostRemoto != null && hayInternet()) {
            probandoRemoto = true;
            local = false;
            web.loadUrl(BuildConfig.WEB_URL);
            handler.postDelayed(rendirseRemoto, ESPERA_REMOTO_MS);
        } else {
            cargarLocal();
        }
    }

    private void cargarLocal() {
        probandoRemoto = false;
        handler.removeCallbacks(rendirseRemoto);
        local = true;
        web.stopLoading();
        web.loadUrl(URL_LOCAL);
    }

    private boolean hayInternet() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities nc = cm.getNetworkCapabilities(n);
            return nc != null && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hostPermitido(String host) {
        return host != null && (host.equals(HOST_LOCAL) || host.equals(hostRemoto));
    }

    private class Cliente extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (!HOST_LOCAL.equals(u.getHost())) return null;
            return archivoLocal(u.getPath());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (hostPermitido(url.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, url));
            } catch (ActivityNotFoundException e) {
                // no hay app para abrirlo
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            paginaLista = false;
            Uri u = Uri.parse(url);
            local = HOST_LOCAL.equals(u.getHost());
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            Uri u = Uri.parse(url);
            if (probandoRemoto && hostRemoto != null && hostRemoto.equals(u.getHost())) {
                // Revisa que de verdad sea la app (y no una página de error de Cloudflare con código 200)
                view.evaluateJavascript("typeof window.__gym", tipo -> {
                    if (!probandoRemoto) return;
                    if ("\"string\"".equals(tipo)) {
                        probandoRemoto = false;
                        handler.removeCallbacks(rendirseRemoto);
                    } else {
                        cargarLocal();
                    }
                });
            }
            paginaLista = true;
            avisarEventos();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && !local) cargarLocal();
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            // Worker que todavía no existe (404) o caído (5xx): usa la copia del APK
            if (request.isForMainFrame() && !local && errorResponse.getStatusCode() >= 400) cargarLocal();
        }
    }

    // Sirve web/public desde los assets del APK en https://appassets.androidplatform.net/
    private WebResourceResponse archivoLocal(String ruta) {
        String path = ruta == null || ruta.isEmpty() || ruta.equals("/") ? "index.html" : ruta.substring(1);
        if (path.endsWith("/")) path = path + "index.html";
        Map<String, String> cabeceras = new HashMap<>();
        cabeceras.put("Cache-Control", "no-cache");
        cabeceras.put("Access-Control-Allow-Origin", "*");
        try {
            InputStream in = getAssets().open(path);
            String mime = mimeDe(path);
            boolean texto = mime.startsWith("text/") || mime.contains("json") || mime.contains("svg");
            return new WebResourceResponse(mime, texto ? "utf-8" : null, 200, "OK", cabeceras, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "No encontrado", cabeceras, new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeDe(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    // ---------- Cámara y archivos para la web ----------

    private class ClienteChrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> pedirPermisosWeb(request));
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (archivoPendiente != null) archivoPendiente.onReceiveValue(null);
            archivoPendiente = callback;
            try {
                Intent i = params.createIntent();
                startActivityForResult(i, CODIGO_ARCHIVO);
                return true;
            } catch (Exception e) {
                archivoPendiente = null;
                return false;
            }
        }
    }

    private void pedirPermisosWeb(PermissionRequest request) {
        Uri origen = request.getOrigin();
        if (origen == null || !hostPermitido(origen.getHost())) {
            request.deny();
            return;
        }
        boolean pideCamara = false;
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) pideCamara = true;
        }
        if (!pideCamara) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            if (permisoPendiente != null) permisoPendiente.deny();
            permisoPendiente = request;
            requestPermissions(new String[] {Manifest.permission.CAMERA}, CODIGO_PERMISOS_WEB);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CODIGO_PERMISOS_WEB) {
            PermissionRequest r = permisoPendiente;
            permisoPendiente = null;
            if (r == null) return;
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                r.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                r.deny();
            }
        } else if (requestCode == PuenteNativo.CODIGO_NOTIF) {
            emitir("permisos", null);
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CODIGO_ARCHIVO) {
            ValueCallback<Uri[]> cb = archivoPendiente;
            archivoPendiente = null;
            if (cb != null) cb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        } else if (requestCode == PuenteNativo.CODIGO_TONO && resultCode == RESULT_OK && data != null) {
            Uri tono = data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
            Alarmas.guardarTono(this, tono);
            emitir("tono", null);
        }
    }

    // ---------- Eventos para la web ----------

    void emitir(String nombre, String datos) {
        puente.encolar(nombre, datos);
        runOnUiThread(this::avisarEventos);
    }

    private void avisarEventos() {
        if (!paginaLista || web == null) return;
        web.evaluateJavascript(
            "(function(){if(!window.__nativo||!window.GymNativo)return;var l=JSON.parse(GymNativo.consumirEventos()||'[]');"
                + "l.forEach(function(e){window.__nativo(e.nombre,e.datos||null)});})()",
            null);
    }

    private void manejarIntent(Intent i) {
        if (i == null) return;
        if (i.getBooleanExtra("alarma_apagada", false)) {
            i.removeExtra("alarma_apagada");
            puente.encolar("alarmaApagada", null);
        }
        // Desde una notificación (resumen del día, alarma): abrir esa pantalla
        String ver = i.getStringExtra("ver");
        if (ver != null && ver.matches("[a-z]{1,20}")) {
            i.removeExtra("ver");
            puente.encolar("ver", org.json.JSONObject.quote(ver));
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        manejarIntent(intent);
        avisarEventos();
    }

    // ---------- Ciclo de vida ----------

    private void respetarBarrasDelSistema(View vista) {
        vista.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets b = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
            } else {
                @SuppressWarnings("deprecation")
                int l = insets.getSystemWindowInsetLeft();
                @SuppressWarnings("deprecation")
                int t = insets.getSystemWindowInsetTop();
                @SuppressWarnings("deprecation")
                int r = insets.getSystemWindowInsetRight();
                @SuppressWarnings("deprecation")
                int b = insets.getSystemWindowInsetBottom();
                v.setPadding(l, t, r, b);
            }
            return insets;
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        emitir("reanudar", null);
        // Si la alarma está sonando (por ejemplo, sin permiso de notificaciones), abrir la pantalla para apagarla
        if (AlarmaServicio.sonando) {
            try {
                startActivity(new Intent(this, AlarmaActivity.class));
            } catch (Exception ignored) {
                // nada
            }
        }
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Primero la web (cerrar una hoja abierta), luego el historial y al final salir
        web.evaluateJavascript("(function(){return !!(window.__atras && window.__atras());})()", valor -> {
            if ("true".equals(valor)) return;
            if (web.canGoBack()) web.goBack();
            else finish();
        });
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
