package com.sky.gym;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

/**
 * Suena la alarma (con volumen que va subiendo y vibración) hasta que en AlarmaActivity
 * se deja presionado el botón 10 segundos. Se apaga sola a los 15 minutos.
 */
public class AlarmaServicio extends Service {
    static final String CANAL = "alarma_gym";
    static final String CANAL_RESPALDO = "alarma_gym_respaldo";
    static final String ACCION_DETENER = "com.sky.gym.DETENER";
    static final int NOTIF_ID = 77;
    private static final long AUTO_APAGADO_MS = 15 * 60 * 1000L;

    static volatile boolean sonando = false;
    static volatile String etiquetaActual = "Alarma de gym";

    private MediaPlayer player;
    private Ringtone ringtone;
    private Vibrator vibrador;
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int volumenOriginal = -1;
    private float volumen = 0.3f;

    private final Runnable subirVolumen = new Runnable() {
        @Override
        public void run() {
            if (player == null) return;
            volumen = Math.min(1f, volumen + 0.07f);
            try {
                player.setVolume(volumen, volumen);
            } catch (Exception ignored) {
                // nada
            }
            if (volumen < 1f) handler.postDelayed(this, 2000);
        }
    };

    private final Runnable autoApagar = this::detener;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACCION_DETENER.equals(intent.getAction())) {
            detener();
            return START_NOT_STICKY;
        }
        if (intent == null) {
            // Android reinició el servicio: solo vuelve a sonar si la alarma no se apagó y fue hace poco
            long desde = getSharedPreferences("alarmas", Context.MODE_PRIVATE).getLong("sonandoDesde", 0);
            if (desde == 0 || System.currentTimeMillis() - desde > AUTO_APAGADO_MS) {
                stopSelf();
                return START_NOT_STICKY;
            }
        }
        String etiqueta = intent != null ? intent.getStringExtra("etiqueta") : null;
        if (etiqueta != null && !etiqueta.isEmpty()) etiquetaActual = etiqueta;
        crearCanal(this);
        Notification n = notificacion(this, etiquetaActual);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) {
            notificacionRespaldo(this, etiquetaActual);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!sonando) {
            sonando = true;
            if (intent != null) {
                getSharedPreferences("alarmas", Context.MODE_PRIVATE).edit().putLong("sonandoDesde", System.currentTimeMillis()).apply();
            }
            despertar();
            sonar();
            vibrar();
            handler.postDelayed(autoApagar, AUTO_APAGADO_MS);
        }
        abrirPantalla();
        return START_STICKY;
    }

    static Notification notificacion(Context c, String etiqueta) {
        Intent pantalla = new Intent(c, AlarmaActivity.class);
        pantalla.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent pi = PendingIntent.getActivity(c, 1, pantalla, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = new Notification.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_notificacion)
            .setContentTitle(etiqueta)
            .setContentText("Abre y mantén presionado el botón 10 segundos para apagarla")
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    static void crearCanal(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Alarma de gym", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("La alarma que se apaga dejando presionado 10 segundos");
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(true);
        nm.createNotificationChannel(ch);
    }

    /** Plan B si Android no deja prender el servicio: notificación que repite el sonido. */
    static void notificacionRespaldo(Context c, String etiqueta) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (nm.getNotificationChannel(CANAL_RESPALDO) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL_RESPALDO, "Alarma de gym (respaldo)", NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(Alarmas.tono(c), new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[] {0, 800, 600, 800});
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
        Intent pantalla = new Intent(c, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(c, 2, pantalla, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL_RESPALDO)
            .setSmallIcon(R.drawable.ic_notificacion)
            .setContentTitle(etiqueta)
            .setContentText("¡Hora del gym!")
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true)
            .setAutoCancel(true)
            .build();
        n.flags |= Notification.FLAG_INSISTENT;
        try {
            nm.notify(NOTIF_ID + 1, n);
        } catch (SecurityException ignored) {
            // sin permiso de notificaciones
        }
    }

    private void despertar() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "gym:alarma");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(AUTO_APAGADO_MS + 60000);
    }

    private void sonar() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        // Que el volumen de alarma esté por lo menos al 80 %
        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (am != null) {
            try {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int actual = am.getStreamVolume(AudioManager.STREAM_ALARM);
                int minimo = (int) Math.ceil(max * 0.8);
                if (actual < minimo) {
                    volumenOriginal = actual;
                    am.setStreamVolume(AudioManager.STREAM_ALARM, minimo, 0);
                }
            } catch (Exception ignored) {
                // algunos teléfonos no dejan cambiarlo en No molestar
            }
        }
        Uri uri = Alarmas.tono(this);
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.setVolume(volumen, volumen);
            player.prepare();
            player.start();
            handler.postDelayed(subirVolumen, 2000);
        } catch (Exception e) {
            liberarPlayer();
            try {
                ringtone = RingtoneManager.getRingtone(this, uri != null ? uri : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
                if (ringtone != null) {
                    ringtone.setAudioAttributes(attrs);
                    if (Build.VERSION.SDK_INT >= 28) ringtone.setLooping(true);
                    ringtone.play();
                }
            } catch (Exception ignored) {
                // sin sonido: queda la vibración
            }
        }
    }

    @SuppressWarnings("deprecation")
    private void vibrar() {
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrador = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vibrador = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrador == null || !vibrador.hasVibrator()) return;
            AudioAttributes attrs = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();
            vibrador.vibrate(VibrationEffect.createWaveform(new long[] {0, 900, 700}, 0), attrs);
        } catch (Exception ignored) {
            // nada
        }
    }

    private void abrirPantalla() {
        try {
            Intent i = new Intent(this, AlarmaActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            startActivity(i);
        } catch (Exception ignored) {
            // Android puede bloquearlo en segundo plano: para eso está la notificación de pantalla completa
        }
    }

    private void liberarPlayer() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
                // nada
            }
            player.release();
            player = null;
        }
    }

    private void detener() {
        sonando = false;
        getSharedPreferences("alarmas", Context.MODE_PRIVATE).edit().putLong("sonandoDesde", 0).apply();
        handler.removeCallbacksAndMessages(null);
        liberarPlayer();
        if (ringtone != null) {
            try {
                ringtone.stop();
            } catch (Exception ignored) {
                // nada
            }
            ringtone = null;
        }
        if (vibrador != null) {
            vibrador.cancel();
            vibrador = null;
        }
        if (volumenOriginal >= 0) {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            try {
                if (am != null) am.setStreamVolume(AudioManager.STREAM_ALARM, volumenOriginal, 0);
            } catch (Exception ignored) {
                // nada
            }
            volumenOriginal = -1;
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (sonando) detener();
        super.onDestroy();
    }
}
