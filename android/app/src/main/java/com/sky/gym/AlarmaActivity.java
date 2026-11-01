package com.sky.gym;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Pantalla de la alarma. Sale encima del bloqueo y solo se apaga dejando presionado
 * el disco 10 segundos. Los botones de volumen y de atrás no hacen nada.
 */
public class AlarmaActivity extends Activity {
    private static final int TIERRA = 0xFF17110D;
    private static final int HUESO = 0xFFEFE6D6;
    private static final int POLVO = 0xFFB6A795;
    private static final int OLIVO = 0xFFAAB757;
    private static final int MOSTAZA = 0xFFDBA43F;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView hora;
    private final SimpleDateFormat formato = new SimpleDateFormat("HH:mm", Locale.getDefault());

    private final Runnable reloj = new Runnable() {
        @Override
        public void run() {
            if (hora != null) hora.setText(formato.format(new Date()));
            if (!AlarmaServicio.sonando) {
                finish();
                return;
            }
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (!AlarmaServicio.sonando) {
            finish();
            return;
        }
        float d = getResources().getDisplayMetrics().density;

        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setGravity(Gravity.CENTER_HORIZONTAL);
        raiz.setBackgroundColor(TIERRA);
        raiz.setPadding((int) (24 * d), (int) (56 * d), (int) (24 * d), (int) (40 * d));

        TextView titulo = texto(AlarmaServicio.etiquetaActual, 22, MOSTAZA, Typeface.create("sans-serif-condensed", Typeface.BOLD));
        raiz.addView(titulo);

        hora = texto(formato.format(new Date()), 96, HUESO, Typeface.create("sans-serif-condensed", Typeface.BOLD));
        raiz.addView(hora);

        String msg = Alarmas.mensaje(this);
        if (msg != null && !msg.isEmpty()) {
            TextView mensaje = texto(msg, 20, OLIVO, Typeface.create("sans-serif-condensed", Typeface.BOLD));
            raiz.addView(mensaje);
        }

        LinearLayout.LayoutParams espacio = new LinearLayout.LayoutParams(1, 0, 1f);
        raiz.addView(new android.view.View(this), espacio);

        BotonSostener boton = new BotonSostener(this);
        int lado = (int) (270 * d);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(lado, lado);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        raiz.addView(boton, lp);
        boton.setAlCompletar(this::apagar);

        TextView ayuda = texto("Deja presionado el disco 10 segundos para apagarla. Si lo sueltas, vuelve a empezar.", 16, POLVO, Typeface.DEFAULT);
        ayuda.setPadding(0, (int) (20 * d), 0, 0);
        raiz.addView(ayuda);

        LinearLayout.LayoutParams espacio2 = new LinearLayout.LayoutParams(1, 0, 0.6f);
        raiz.addView(new android.view.View(this), espacio2);

        setContentView(raiz, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private TextView texto(String t, int sp, int color, Typeface tipo) {
        TextView v = new TextView(this);
        v.setText(t);
        v.setTextColor(color);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        v.setTypeface(tipo);
        v.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        v.setLayoutParams(lp);
        return v;
    }

    private void apagar() {
        Intent detener = new Intent(this, AlarmaServicio.class);
        detener.setAction(AlarmaServicio.ACCION_DETENER);
        try {
            startService(detener);
        } catch (Exception ignored) {
            // nada
        }
        Intent app = new Intent(this, MainActivity.class);
        app.putExtra("alarma_apagada", true);
        app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            startActivity(app);
        } catch (Exception ignored) {
            // nada
        }
        finish();
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.post(reloj);
    }

    @Override
    protected void onPause() {
        handler.removeCallbacks(reloj);
        super.onPause();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int k = event.getKeyCode();
        if (k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN || k == KeyEvent.KEYCODE_VOLUME_MUTE
            || k == KeyEvent.KEYCODE_BACK) {
            return true; // con volumen o atrás no se apaga
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // no se puede salir con atrás
    }
}
