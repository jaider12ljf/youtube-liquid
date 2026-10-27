package com.jaider.youtubeliquid;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * Recibe la respuesta de Google en un servidor local de un solo uso (http://127.0.0.1:puerto),
 * como pide el flujo OAuth para apps instaladas. Luego trae la app al frente.
 */
@CapacitorPlugin(name = "LoopbackAuth")
public class LoopbackAuthPlugin extends Plugin {
    private ServerSocket server;
    private PluginCall waiting;
    private String received;

    private static final String PAGE = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
        + "<title>Listo</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui;background:#fff;color:#1d1d1f'>"
        + "<div style='text-align:center;padding:32px'><h1 style='font-size:26px;margin:0 0 8px'>Listo</h1>"
        + "<p style='color:#6e6e73;margin:0'>Ya puedes volver a YouTube.</p></div>";

    @PluginMethod
    public void listen(PluginCall call) {
        try {
            closeServer();
            received = null;
            server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
            final ServerSocket s = server;
            new Thread(() -> accept(s), "oauth-loopback").start();
            JSObject r = new JSObject();
            r.put("port", s.getLocalPort());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo abrir el puerto local: " + e.getMessage());
        }
    }

    @PluginMethod
    public void result(PluginCall call) {
        if (received != null) { deliver(call); return; }
        call.setKeepAlive(true);
        if (waiting != null) waiting.reject("cancelado");
        waiting = call;
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        closeServer();
        if (waiting != null) { waiting.reject("cancelado"); waiting.setKeepAlive(false); waiting = null; }
        call.resolve();
    }

    private void accept(ServerSocket s) {
        String path = null;
        try (Socket client = s.accept()) {
            client.setSoTimeout(10000);
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
            String line = in.readLine();
            String[] parts = line == null ? new String[0] : line.split(" ");
            path = parts.length > 1 ? parts[1] : "/";
            byte[] body = PAGE.getBytes(StandardCharsets.UTF_8);
            OutputStream out = client.getOutputStream();
            out.write(("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: " + body.length
                + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(body);
            out.flush();
        } catch (Exception ignored) {
            // cerrado por cancelar u otro error: se informa como ruta vacía
        } finally {
            closeServer();
        }
        final String got = path == null ? "/?error=cancelado" : path;
        getActivity().runOnUiThread(() -> {
            received = got;
            Intent i = new Intent(getContext(), getActivity().getClass());
            i.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            if (waiting != null) { deliver(waiting); waiting.setKeepAlive(false); waiting = null; }
        });
    }

    private void deliver(PluginCall call) {
        JSObject r = new JSObject();
        r.put("path", received);
        received = null;
        call.resolve(r);
    }

    private void closeServer() {
        try { if (server != null) server.close(); } catch (Exception ignored) { }
        server = null;
    }
}
