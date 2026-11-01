package com.sky.gym;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Llega cuando toca la alarma: prende el servicio que suena y programa la siguiente. */
public class AlarmaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        boolean prueba = intent.getBooleanExtra("prueba", false);
        if (!prueba) Alarmas.despuesDeSonar(context, id);

        Intent servicio = new Intent(context, AlarmaServicio.class);
        servicio.putExtra("id", id);
        servicio.putExtra("etiqueta", Alarmas.etiqueta(context, id));
        try {
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(servicio);
            else context.startService(servicio);
        } catch (Exception e) {
            // Si Android no deja prender el servicio, al menos una notificación que suene
            AlarmaServicio.notificacionRespaldo(context, Alarmas.etiqueta(context, id));
        }
    }
}
