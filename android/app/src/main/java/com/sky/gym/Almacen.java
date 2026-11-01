package com.sky.gym;

import android.content.Context;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Guarda los datos de la app (perfil, entrenos, comidas, pesos…) en archivos privados de la app.
 * Así no importa si la web se abrió desde Cloudflare o desde la copia del APK: los datos son los mismos.
 */
final class Almacen {
    private static final Pattern CLAVE = Pattern.compile("^[A-Za-z0-9_-]{1,40}$");
    private static final Object CANDADO = new Object();

    private Almacen() {}

    private static File carpeta(Context c) {
        File d = new File(c.getFilesDir(), "datos");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    static String leer(Context c, String clave) {
        if (clave == null || !CLAVE.matcher(clave).matches()) return null;
        synchronized (CANDADO) {
            File f = new File(carpeta(c), clave + ".json");
            if (!f.exists()) return null;
            try (InputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return out.toString(StandardCharsets.UTF_8.name());
            } catch (IOException e) {
                return null;
            }
        }
    }

    static boolean guardar(Context c, String clave, String valor) {
        if (clave == null || !CLAVE.matcher(clave).matches() || valor == null) return false;
        synchronized (CANDADO) {
            File dir = carpeta(c);
            File tmp = new File(dir, clave + ".tmp");
            File f = new File(dir, clave + ".json");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(valor.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            } catch (IOException e) {
                return false;
            }
            // Escritura atómica: si el teléfono se apaga a la mitad, no se pierde el archivo anterior
            return tmp.renameTo(f);
        }
    }

    static void borrar(Context c, String clave) {
        if (clave == null || !CLAVE.matcher(clave).matches()) return;
        synchronized (CANDADO) {
            new File(carpeta(c), clave + ".json").delete();
        }
    }
}
