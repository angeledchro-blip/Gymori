package com.sky.gym;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/**
 * Guarda las alarmas y las programa con AlarmManager.setAlarmClock (la forma más confiable:
 * Android la trata como despertador, sale el relojito arriba y no la duerme el ahorro de batería).
 * Formato de cada alarma: {"id":"gym","hora":"05:00","dias":[1,3,5],"etiqueta":"Gym","activa":true}
 * dias: 1 = lunes … 7 = domingo. Sin días = suena una sola vez.
 */
final class Alarmas {
    static final String ACCION = "com.sky.gym.ALARMA";
    private static final String PREFS = "alarmas";
    private static final int CODIGO_PRUEBA = 9090;

    private Alarmas() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray leer(Context c) {
        try {
            return new JSONArray(prefs(c).getString("lista", "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static void guardar(Context c, JSONArray lista) {
        prefs(c).edit().putString("lista", lista.toString()).apply();
    }

    static JSONObject buscar(Context c, String id) {
        JSONArray l = leer(c);
        for (int i = 0; i < l.length(); i++) {
            JSONObject a = l.optJSONObject(i);
            if (a != null && id != null && id.equals(a.optString("id"))) return a;
        }
        return null;
    }

    static boolean puedeExactas(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    private static int codigo(String id) {
        return (id == null ? 0 : id.hashCode()) & 0x0fffffff;
    }

    private static PendingIntent intentAlarma(Context c, String id, boolean prueba, int flagsExtra) {
        Intent i = new Intent(c, AlarmaReceiver.class);
        i.setAction(ACCION);
        i.putExtra("id", id);
        i.putExtra("prueba", prueba);
        int cod = prueba ? CODIGO_PRUEBA : codigo(id);
        return PendingIntent.getBroadcast(c, cod, i, PendingIntent.FLAG_IMMUTABLE | flagsExtra);
    }

    private static PendingIntent intentMostrar(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.putExtra("ver", "alarmas");
        return PendingIntent.getActivity(c, 4040, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Próxima vez que debe sonar una alarma (milisegundos), o 0 si está apagada. */
    static long siguiente(JSONObject a, long ahora) {
        if (a == null || !a.optBoolean("activa", true)) return 0;
        String[] hm = a.optString("hora", "05:00").split(":");
        int h;
        int m;
        try {
            h = Integer.parseInt(hm[0].trim());
            m = hm.length > 1 ? Integer.parseInt(hm[1].trim()) : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
        Set<Integer> dias = new HashSet<>();
        JSONArray d = a.optJSONArray("dias");
        if (d != null) for (int i = 0; i < d.length(); i++) dias.add(d.optInt(i));
        for (int i = 0; i <= 8; i++) {
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(ahora);
            cal.add(Calendar.DAY_OF_YEAR, i);
            cal.set(Calendar.HOUR_OF_DAY, h);
            cal.set(Calendar.MINUTE, m);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            if (cal.getTimeInMillis() <= ahora + 1000) continue;
            // DAY_OF_WEEK: domingo = 1 … sábado = 7  →  lunes = 1 … domingo = 7
            int iso = ((cal.get(Calendar.DAY_OF_WEEK) + 5) % 7) + 1;
            if (dias.isEmpty() || dias.contains(iso)) return cal.getTimeInMillis();
        }
        return 0;
    }

    /** Cancela todo y vuelve a programar. Regresa la próxima alarma (ms) o 0. */
    static long programarTodas(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;
        SharedPreferences p = prefs(c);
        // cancela las que estaban programadas
        Set<String> antes = p.getStringSet("programadas", new HashSet<>());
        for (String id : antes) {
            PendingIntent viejo = intentAlarma(c, id, false, PendingIntent.FLAG_NO_CREATE);
            if (viejo != null) {
                am.cancel(viejo);
                viejo.cancel();
            }
        }
        JSONArray lista = leer(c);
        Set<String> nuevas = new HashSet<>();
        long proxima = 0;
        long ahora = System.currentTimeMillis();
        for (int i = 0; i < lista.length(); i++) {
            JSONObject a = lista.optJSONObject(i);
            long t = siguiente(a, ahora);
            if (t <= 0) continue;
            String id = a.optString("id");
            programar(c, am, intentAlarma(c, id, false, PendingIntent.FLAG_UPDATE_CURRENT), t);
            nuevas.add(id);
            if (proxima == 0 || t < proxima) proxima = t;
        }
        p.edit().putStringSet("programadas", nuevas).putLong("proxima", proxima).apply();
        return proxima;
    }

    private static void programar(Context c, AlarmManager am, PendingIntent pi, long cuando) {
        try {
            if (puedeExactas(c)) {
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(cuando, intentMostrar(c)), pi);
                return;
            }
        } catch (SecurityException e) {
            // sin permiso de alarma exacta: se usa la inexacta de abajo
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
    }

    static long proxima(Context c) {
        return prefs(c).getLong("proxima", 0);
    }

    /** Después de sonar: si era de una sola vez se apaga; luego se programa la siguiente. */
    static void despuesDeSonar(Context c, String id) {
        JSONArray lista = leer(c);
        boolean cambio = false;
        for (int i = 0; i < lista.length(); i++) {
            JSONObject a = lista.optJSONObject(i);
            if (a == null || !a.optString("id").equals(id)) continue;
            JSONArray dias = a.optJSONArray("dias");
            if (dias == null || dias.length() == 0) {
                try {
                    a.put("activa", false);
                    cambio = true;
                } catch (JSONException ignored) {
                    // nada
                }
            }
        }
        if (cambio) guardar(c, lista);
        programarTodas(c);
    }

    static void programarPrueba(Context c, int segundos) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long cuando = System.currentTimeMillis() + Math.max(3, segundos) * 1000L;
        programar(c, am, intentAlarma(c, "prueba", true, PendingIntent.FLAG_UPDATE_CURRENT), cuando);
    }

    // ---------- Tono y mensaje ----------

    static Uri tono(Context c) {
        String guardado = prefs(c).getString("tono", null);
        if (guardado != null) return Uri.parse(guardado);
        Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        return u;
    }

    static void guardarTono(Context c, Uri u) {
        prefs(c).edit().putString("tono", u == null ? null : u.toString()).apply();
    }

    static String nombreTono(Context c) {
        String guardado = prefs(c).getString("tono", null);
        if (guardado == null) return "Tono de alarma del teléfono";
        try {
            Ringtone r = RingtoneManager.getRingtone(c, Uri.parse(guardado));
            String t = r != null ? r.getTitle(c) : null;
            return t != null ? t : "Tono elegido";
        } catch (Exception e) {
            return "Tono elegido";
        }
    }

    static String mensaje(Context c) {
        return prefs(c).getString("mensaje", "");
    }

    static void guardarMensaje(Context c, String m) {
        prefs(c).edit().putString("mensaje", m == null ? "" : m).apply();
    }

    static String etiqueta(Context c, String id) {
        if ("prueba".equals(id)) return "Prueba de alarma";
        JSONObject a = buscar(c, id);
        String e = a != null ? a.optString("etiqueta", "") : "";
        return e.isEmpty() ? "Alarma de gym" : e;
    }
}
