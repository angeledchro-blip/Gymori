package com.sky.gym;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;

/**
 * Botón en forma de disco de pesas: hay que dejarlo presionado 10 segundos para apagar la alarma.
 * Si lo sueltas antes, regresa a cero. Cuenta con el reloj del sistema (no con animaciones),
 * así que funciona igual aunque tengas las animaciones del teléfono aceleradas o apagadas.
 */
public class BotonSostener extends View {

    public interface AlCompletar {
        void listo();
    }

    private static final long DURACION_MS = 10_000L;
    private static final int OLIVO = 0xFFAAB757;
    private static final int CUERO = 0xFF2C221B;
    private static final int BORDE = 0xFF3D3027;
    private static final int TIERRA = 0xFF17110D;
    private static final int HUESO = 0xFFEFE6D6;
    private static final int POLVO = 0xFFB6A795;

    private final Paint relleno = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint linea = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint arco = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint numero = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint texto = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF caja = new RectF();
    private float progreso = 0f;
    private boolean presionado = false;
    private boolean completado = false;
    private long inicio = 0;
    private int ultimoSegundo = -1;
    private AlCompletar alCompletar;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (!presionado || completado) return;
            long t = SystemClock.uptimeMillis() - inicio;
            progreso = Math.min(1f, t / (float) DURACION_MS);
            int s = (int) (t / 1000);
            if (s != ultimoSegundo) {
                ultimoSegundo = s;
                performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
            }
            invalidate();
            if (progreso >= 1f) {
                completado = true;
                presionado = false;
                performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
                if (alCompletar != null) alCompletar.listo();
            } else {
                postDelayed(this, 30);
            }
        }
    };

    public BotonSostener(Context c) {
        super(c);
        float d = getResources().getDisplayMetrics().density;
        linea.setStyle(Paint.Style.STROKE);
        linea.setStrokeWidth(2 * d);
        linea.setColor(BORDE);
        arco.setStyle(Paint.Style.STROKE);
        arco.setStrokeCap(Paint.Cap.ROUND);
        arco.setStrokeWidth(18 * d);
        arco.setColor(OLIVO);
        numero.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        numero.setColor(HUESO);
        numero.setTextAlign(Paint.Align.CENTER);
        texto.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        texto.setColor(POLVO);
        texto.setTextAlign(Paint.Align.CENTER);
        setContentDescription("Mantén presionado 10 segundos para apagar la alarma");
        setClickable(true);
        setHapticFeedbackEnabled(true);
    }

    public void setAlCompletar(AlCompletar a) {
        alCompletar = a;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        float w = getWidth();
        float h = getHeight();
        float cx = w / 2f;
        float cy = h / 2f;
        float r = Math.min(w, h) / 2f - arco.getStrokeWidth();
        // el disco
        relleno.setColor(CUERO);
        canvas.drawCircle(cx, cy, r, relleno);
        canvas.drawCircle(cx, cy, r * 0.93f, linea);
        canvas.drawCircle(cx, cy, r * 0.62f, linea);
        relleno.setColor(TIERRA);
        canvas.drawCircle(cx, cy, r * 0.2f, relleno);
        canvas.drawCircle(cx, cy, r * 0.2f, linea);
        // anillo de progreso
        float ra = r + arco.getStrokeWidth() / 2f - 2;
        caja.set(cx - ra, cy - ra, cx + ra, cy + ra);
        if (progreso > 0f) canvas.drawArc(caja, -90f, 360f * progreso, false, arco);
        // texto
        texto.setTextSize(Math.max(28f, r * 0.12f));
        if (progreso <= 0f) {
            numero.setTextSize(r * 0.3f);
            canvas.drawText("Mantén", cx, cy - r * 0.32f, numero);
            canvas.drawText("10 s", cx, cy + r * 0.5f, numero);
        } else {
            int restan = (int) Math.ceil((1f - progreso) * DURACION_MS / 1000f);
            numero.setTextSize(r * 0.5f);
            canvas.drawText(String.valueOf(Math.max(0, restan)), cx, cy - r * 0.26f, numero);
            canvas.drawText("no lo sueltes", cx, cy + r * 0.45f, texto);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (completado) return true;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                if (getParent() != null) getParent().requestDisallowInterceptTouchEvent(true);
                presionado = true;
                inicio = SystemClock.uptimeMillis();
                ultimoSegundo = -1;
                removeCallbacks(tick);
                post(tick);
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                presionado = false;
                removeCallbacks(tick);
                progreso = 0f;
                invalidate();
                return true;
            default:
                return true;
        }
    }

    @Override
    public boolean performClick() {
        return super.performClick();
    }

    @Override
    protected void onDetachedFromWindow() {
        removeCallbacks(tick);
        super.onDetachedFromWindow();
    }
}
