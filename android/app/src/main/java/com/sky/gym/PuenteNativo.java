package com.sky.gym;

import android.Manifest;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Lo que la web puede pedirle a Android (window.GymNativo): guardar datos, alarmas, permisos,
 * vibración, pantalla encendida y guardar respaldos. Los métodos corren en un hilo aparte;
 * lo que toca la pantalla se manda al hilo principal.
 */
public class PuenteNativo {
    static final int CODIGO_NOTIF = 21;
    static final int CODIGO_TONO = 22;

    private final MainActivity act;
    private final Context ctx;
    private final JSONArray eventos = new JSONArray();

    PuenteNativo(MainActivity act) {
        this.act = act;
        this.ctx = act.getApplicationContext();
    }

    // ---------- Eventos de Android → web ----------

    synchronized void encolar(String nombre, String datos) {
        try {
            JSONObject e = new JSONObject();
            e.put("nombre", nombre);
            if (datos != null) e.put("datos", datos);
            eventos.put(e);
        } catch (JSONException ignored) {
            // nada
        }
    }

    @JavascriptInterface
    public synchronized String consumirEventos() {
        String s = eventos.toString();
        while (eventos.length() > 0) eventos.remove(0);
        return s;
    }

    // ---------- Datos ----------

    @JavascriptInterface
    public String leer(String clave) {
        return Almacen.leer(ctx, clave);
    }

    @JavascriptInterface
    public boolean guardar(String clave, String valor) {
        return Almacen.guardar(ctx, clave, valor);
    }

    @JavascriptInterface
    public void borrar(String clave) {
        Almacen.borrar(ctx, clave);
    }

    // ---------- Alarmas ----------

    @JavascriptInterface
    public String alarmasLeer() {
        try {
            JSONObject r = new JSONObject();
            r.put("alarmas", Alarmas.leer(ctx));
            r.put("proxima", Alarmas.proxima(ctx));
            return r.toString();
        } catch (JSONException e) {
            return "{\"alarmas\":[],\"proxima\":0}";
        }
    }

    @JavascriptInterface
    public String alarmasGuardar(String json) {
        try {
            JSONArray lista = new JSONArray(json);
            Alarmas.guardar(ctx, lista);
            long proxima = Alarmas.programarTodas(ctx);
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("proxima", proxima);
            if (!Alarmas.puedeExactas(ctx)) r.put("aviso", "Sin permiso de alarmas exactas puede sonar unos minutos tarde.");
            return r.toString();
        } catch (JSONException e) {
            return "{\"error\":\"No se pudieron guardar las alarmas.\"}";
        }
    }

    @JavascriptInterface
    public String alarmaProbar(int segundos) {
        Alarmas.programarPrueba(ctx, segundos);
        return "{\"ok\":true}";
    }

    @JavascriptInterface
    public void mensajeAlarma(String texto) {
        Alarmas.guardarMensaje(ctx, texto);
    }

    // ---------- Resumen del día ----------

    @JavascriptInterface
    public String resumenGuardar(String json) {
        try {
            Resumen.guardar(ctx, new JSONObject(json));
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("proximo", Resumen.proximo(ctx));
            return r.toString();
        } catch (JSONException e) {
            return "{\"error\":\"No se pudo guardar el resumen.\"}";
        }
    }

    @JavascriptInterface
    public String resumenProbar() {
        return Resumen.mostrar(ctx) ? "{\"ok\":true}" : "{\"error\":\"Sin permiso de notificaciones.\"}";
    }

    @JavascriptInterface
    public void elegirTono() {
        act.runOnUiThread(() -> {
            Intent i = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
            i.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM);
            i.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Tono de la alarma");
            i.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false);
            i.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
            i.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Alarmas.tono(ctx));
            try {
                act.startActivityForResult(i, CODIGO_TONO);
            } catch (ActivityNotFoundException ignored) {
                // sin selector de tonos
            }
        });
    }

    @JavascriptInterface
    public String tonoActual() {
        return Alarmas.nombreTono(ctx);
    }

    // ---------- Permisos ----------

    @JavascriptInterface
    public String permisos() {
        try {
            JSONObject r = new JSONObject();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            boolean notif = Build.VERSION.SDK_INT >= 33
                ? ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                : nm != null && nm.areNotificationsEnabled();
            r.put("notificaciones", notif);
            r.put("alarmasExactas", Alarmas.puedeExactas(ctx));
            r.put("pantallaCompleta", Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            r.put("bateria", pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
            String marca = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase();
            r.put("xiaomi", marca.contains("xiaomi") || marca.contains("redmi") || marca.contains("poco"));
            r.put("camara", ctx.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED);
            r.put("sdk", Build.VERSION.SDK_INT);
            return r.toString();
        } catch (JSONException e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void pedirPermiso(String tipo) {
        act.runOnUiThread(() -> {
            String pkg = ctx.getPackageName();
            Uri paquete = Uri.parse("package:" + pkg);
            switch (tipo == null ? "" : tipo) {
                case "notificaciones":
                    if (Build.VERSION.SDK_INT >= 33) {
                        act.requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, CODIGO_NOTIF);
                    } else {
                        abrir(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg));
                    }
                    break;
                case "alarmasExactas":
                    if (Build.VERSION.SDK_INT >= 31) abrir(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, paquete));
                    break;
                case "pantallaCompleta":
                    if (Build.VERSION.SDK_INT >= 34) abrir(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, paquete));
                    break;
                case "bateria":
                    if (!abrir(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, paquete))) {
                        abrir(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
                    }
                    break;
                case "xiaomi":
                    Intent miui = new Intent("miui.intent.action.APP_PERM_EDITOR");
                    miui.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
                    miui.putExtra("extra_pkgname", pkg);
                    if (!abrir(miui)) {
                        Intent auto = new Intent();
                        auto.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                        if (!abrir(auto)) abrir(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, paquete));
                    }
                    break;
                default:
                    abrir(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, paquete));
            }
        });
    }

    private boolean abrir(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ---------- Varios ----------

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public void vibrar(int ms) {
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                v = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (v != null && v.hasVibrator()) v.vibrate(VibrationEffect.createOneShot(Math.max(10, Math.min(ms, 3000)), VibrationEffect.DEFAULT_AMPLITUDE));
        } catch (Exception ignored) {
            // nada
        }
    }

    @JavascriptInterface
    public void pantallaEncendida(boolean si) {
        act.runOnUiThread(() -> {
            if (si) act.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else act.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @JavascriptInterface
    public void abrirUrl(String url) {
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
        act.runOnUiThread(() -> abrir(new Intent(Intent.ACTION_VIEW, Uri.parse(url))));
    }

    @JavascriptInterface
    public String exportar(String nombre, String contenido) {
        String limpio = (nombre == null ? "gym-respaldo.json" : nombre).replaceAll("[^A-Za-z0-9._-]", "_");
        byte[] bytes = (contenido == null ? "" : contenido).getBytes(StandardCharsets.UTF_8);
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = ctx.getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, limpio);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GYM");
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return "No se pudo guardar el respaldo.";
                try (OutputStream out = cr.openOutputStream(uri)) {
                    if (out == null) return "No se pudo guardar el respaldo.";
                    out.write(bytes);
                }
                return "Respaldo guardado en Descargas/GYM/" + limpio;
            }
            File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) return "No se pudo guardar el respaldo.";
            File f = new File(dir, limpio);
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(bytes);
            }
            return "Respaldo guardado en " + f.getAbsolutePath();
        } catch (Exception e) {
            return "No se pudo guardar el respaldo: " + e.getMessage();
        }
    }

    @JavascriptInterface
    public String version() {
        return BuildConfig.VERSION_NAME;
    }

    @JavascriptInterface
    public String urlRemota() {
        return BuildConfig.WEB_URL;
    }

    @JavascriptInterface
    public String origen() {
        return act.usandoLocal() ? "local" : "remoto";
    }

    @JavascriptInterface
    public long proximaAlarma() {
        return Alarmas.proxima(ctx);
    }
}
