package com.sky.gym;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

/**
 * Resumen del día: una notificación cada mañana (5:00 si no cambias la hora) con lo que toca en el gym,
 * la escuela, la agenda, el servicio social y los pendientes. La web calcula los textos de los
 * próximos 7 días y aquí se guardan; a la hora se muestra el de ese día aunque la app esté cerrada.
 * Formato: {"activo":true,"hora":"05:00","dias":{"2026-11-03":{"titulo":"…","texto":"…"}}}
 */
final class Resumen {
    static final String ACCION = "com.sky.gym.RESUMEN";
    static final String CANAL = "resumen_dia";
    private static final String PREFS = "resumen";
    private static final int CODIGO = 7070;
    private static final int ID_NOTIF = 7071;
    private static final int CODIGO_ABRIR = 7072;

    private Resumen() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void guardar(Context c, JSONObject o) {
        JSONObject dias = o.optJSONObject("dias");
        prefs(c).edit()
            .putBoolean("activo", o.optBoolean("activo", true))
            .putString("hora", o.optString("hora", "05:00"))
            .putString("dias", dias != null ? dias.toString() : "{}")
            .apply();
        programar(c);
    }

    private static PendingIntent intent(Context c) {
        Intent i = new Intent(c, ResumenReceiver.class);
        i.setAction(ACCION);
        return PendingIntent.getBroadcast(c, CODIGO, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Siguiente vez a esa hora: hoy si todavía no pasa; si ya pasó, mañana. */
    static long siguiente(String hora, long ahora) {
        int h = 5;
        int m = 0;
        try {
            String[] hm = hora.split(":");
            h = Integer.parseInt(hm[0].trim());
            m = hm.length > 1 ? Integer.parseInt(hm[1].trim()) : 0;
        } catch (RuntimeException ignored) {
            // hora rara: se queda a las 5:00
        }
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(ahora);
        cal.set(Calendar.HOUR_OF_DAY, h);
        cal.set(Calendar.MINUTE, m);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= ahora + 1000) cal.add(Calendar.DAY_OF_YEAR, 1);
        return cal.getTimeInMillis();
    }

    /** Cancela y vuelve a programar. Regresa cuándo llega (ms) o 0 si está apagado. */
    static long programar(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;
        PendingIntent pi = intent(c);
        am.cancel(pi);
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("activo", false)) {
            p.edit().putLong("proximo", 0).apply();
            return 0;
        }
        long cuando = siguiente(p.getString("hora", "05:00"), System.currentTimeMillis());
        try {
            if (Alarmas.puedeExactas(c)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
        }
        p.edit().putLong("proximo", cuando).apply();
        return cuando;
    }

    static long proximo(Context c) {
        return prefs(c).getLong("proximo", 0);
    }

    private static String hoyClave() {
        Calendar cal = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d-%02d",
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
    }

    /** Muestra la notificación con el resumen de hoy. Regresa false si Android no la dejó salir. */
    static boolean mostrar(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return false;
        if (nm.getNotificationChannel(CANAL) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Resumen del día", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Lo que toca hoy: gym, escuela, agenda y pendientes.");
            nm.createNotificationChannel(ch);
        }
        String titulo = "Tu día en Gymori";
        String texto = "Abre Gymori para ver tu rutina, tu agenda y tus pendientes de hoy.";
        try {
            JSONObject dias = new JSONObject(prefs(c).getString("dias", "{}"));
            JSONObject d = dias.optJSONObject(hoyClave());
            if (d != null) {
                titulo = d.optString("titulo", titulo);
                texto = d.optString("texto", texto);
            }
        } catch (JSONException ignored) {
            // se queda el texto genérico
        }
        Intent abrir = new Intent(c, MainActivity.class);
        abrir.putExtra("ver", "hoy");
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, CODIGO_ABRIR, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        int salto = texto.indexOf('\n');
        Notification n = new Notification.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_notificacion)
            .setContentTitle(titulo)
            .setContentText(salto > 0 ? texto.substring(0, salto) : texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setShowWhen(true)
            .build();
        try {
            nm.notify(ID_NOTIF, n);
            return nm.areNotificationsEnabled();
        } catch (SecurityException e) {
            return false;
        }
    }
}
