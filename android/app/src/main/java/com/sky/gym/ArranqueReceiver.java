package com.sky.gym;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Al prender el teléfono, actualizar la app o cambiar la hora, vuelve a programar las alarmas. */
public class ArranqueReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Alarmas.programarTodas(context);
    }
}
