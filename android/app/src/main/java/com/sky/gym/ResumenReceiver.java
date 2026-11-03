package com.sky.gym;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** A la hora del resumen: muestra la notificación del día y programa la de mañana. */
public class ResumenReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Resumen.mostrar(context);
        Resumen.programar(context);
    }
}
