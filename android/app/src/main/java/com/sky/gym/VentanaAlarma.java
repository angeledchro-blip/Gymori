package com.sky.gym;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Ventana emergente de la alarma: sale encima de cualquier app con el mismo disco de 10 segundos.
 * Necesita el permiso "Mostrar sobre otras apps" (en Xiaomi: "Mostrar ventanas emergentes").
 * Es el plan B cuando Android o HyperOS no dejan abrir la pantalla de la alarma: así, aunque estés
 * medio dormido, al prender o desbloquear el teléfono ves qué es lo que está sonando y lo apagas ahí.
 */
final class VentanaAlarma {
    private static final int FONDO = 0xF217110D;
    private static final int HUESO = 0xFFEFE6D6;
    private static final int POLVO = 0xFFB6A795;
    private static final int OLIVO = 0xFFAAB757;
    private static final int MOSTAZA = 0xFFDBA43F;

    private static final Handler handler = new Handler(Looper.getMainLooper());
    private static View vista;
    private static TextView hora;
    private static final SimpleDateFormat formato = new SimpleDateFormat("HH:mm", Locale.getDefault());

    private static final Runnable reloj = new Runnable() {
        @Override
        public void run() {
            if (vista == null) return;
            if (!AlarmaServicio.sonando) {
                quitar(vista.getContext());
                return;
            }
            if (hora != null) hora.setText(formato.format(new Date()));
            handler.postDelayed(this, 1000);
        }
    };

    private VentanaAlarma() {}

    static boolean puede(Context c) {
        return Settings.canDrawOverlays(c);
    }

    static boolean visible() {
        return vista != null;
    }

    /** Muestra la ventana si la alarma sigue sonando y su pantalla completa no está a la vista. */
    static void mostrar(Context c) {
        handler.post(() -> {
            if (vista != null || !AlarmaServicio.sonando || AlarmaActivity.visible || !puede(c)) return;
            Context app = c.getApplicationContext();
            WindowManager wm = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
            if (wm == null) return;
            View v = construir(app);
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.CENTER;
            try {
                wm.addView(v, lp);
                vista = v;
                handler.post(reloj);
            } catch (RuntimeException e) {
                vista = null;
                hora = null;
            }
        });
    }

    static void quitar(Context c) {
        handler.post(() -> {
            handler.removeCallbacks(reloj);
            if (vista == null) return;
            WindowManager wm = (WindowManager) c.getApplicationContext().getSystemService(Context.WINDOW_SERVICE);
            try {
                if (wm != null) wm.removeView(vista);
            } catch (RuntimeException ignored) {
                // ya no estaba
            }
            vista = null;
            hora = null;
        });
    }

    private static View construir(Context c) {
        float d = c.getResources().getDisplayMetrics().density;
        LinearLayout raiz = new LinearLayout(c);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setGravity(Gravity.CENTER);
        raiz.setBackgroundColor(FONDO);
        raiz.setPadding((int) (24 * d), (int) (32 * d), (int) (24 * d), (int) (32 * d));
        // Que no se cierre tocando afuera: toda la pantalla es de la ventana
        raiz.setClickable(true);

        raiz.addView(texto(c, "⏰ Está sonando tu alarma de Gymori", 18, MOSTAZA, Typeface.create("sans-serif-condensed", Typeface.BOLD)));
        raiz.addView(texto(c, AlarmaServicio.etiquetaActual, 24, HUESO, Typeface.create("sans-serif-condensed", Typeface.BOLD)));
        hora = texto(c, formato.format(new Date()), 76, HUESO, Typeface.create("sans-serif-condensed", Typeface.BOLD));
        raiz.addView(hora);
        String msg = Alarmas.mensaje(c);
        if (msg != null && !msg.isEmpty()) raiz.addView(texto(c, msg, 18, OLIVO, Typeface.create("sans-serif-condensed", Typeface.BOLD)));

        BotonSostener boton = new BotonSostener(c);
        int lado = (int) (230 * d);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(lado, lado);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        lp.topMargin = (int) (24 * d);
        raiz.addView(boton, lp);
        boton.setAlCompletar(() -> apagar(c));

        TextView ayuda = texto(c, "Deja presionado el disco 10 segundos para apagarla. Si lo sueltas, vuelve a empezar.", 15, POLVO, Typeface.DEFAULT);
        ayuda.setPadding(0, (int) (18 * d), 0, 0);
        raiz.addView(ayuda);
        return raiz;
    }

    private static TextView texto(Context c, String t, int sp, int color, Typeface tipo) {
        TextView v = new TextView(c);
        v.setText(t);
        v.setTextColor(color);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        v.setTypeface(tipo);
        v.setGravity(Gravity.CENTER);
        v.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return v;
    }

    private static void apagar(Context c) {
        AlarmaServicio.apagarYa(c);
        quitar(c);
        Intent app = new Intent(c, MainActivity.class);
        app.putExtra("alarma_apagada", true);
        app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            c.startActivity(app);
        } catch (RuntimeException ignored) {
            // si Android no deja abrir la app, la alarma igual ya se apagó
        }
    }
}
