package bond.annamc.statusbridge;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import org.slf4j.Logger;

import javax.inject.Inject;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Plugin(id = "anna-status-bridge", name = "AnnaStatusBridge", version = "1.0.0", description = "Publishes limited live network status to the Anna MC website", authors = {"Anna MC"})
public final class AnnaStatusBridge {
    private final ProxyServer proxy;
    private final Logger logger;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private String endpoint;
    private String token;

    @Inject
    public AnnaStatusBridge(ProxyServer proxy, Logger logger) {
        this.proxy = proxy;
        this.logger = logger;
    }

    @Subscribe
    public void onProxyInitialize(ProxyInitializeEvent event) {
        endpoint = System.getenv("ANNA_STATUS_ENDPOINT");
        token = System.getenv("ANNA_STATUS_TOKEN");
        if (endpoint == null || !endpoint.startsWith("https://") || token == null || token.length() < 32) {
            logger.warn("Status bridge disabled: set ANNA_STATUS_ENDPOINT (HTTPS URL ending /api/status/update) and ANNA_STATUS_TOKEN (32+ random characters) in the Velocity container environment.");
            return;
        }
        proxy.getScheduler().buildTask(this, this::publish).repeat(30, TimeUnit.SECONDS).schedule();
        publish();
        logger.info("Anna MC status bridge enabled; publishing only aggregate counts for LifeSteal and Practice.");
    }

    private void publish() {
        JsonObject root = new JsonObject();
        JsonObject network = new JsonObject();
        network.addProperty("online", true);
        network.addProperty("playersOnline", proxy.getPlayerCount());
        network.addProperty("maxPlayers", proxy.getConfiguration().getShowMaxPlayers());
        root.add("network", network);
        JsonObject servers = new JsonObject();
        servers.add("lifesteal", serverStatus("lifesteal"));
        servers.add("practice", serverStatus("practice"));
        root.add("servers", servers);
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json")
                .header("X-Anna-Status-Token", token)
                .POST(HttpRequest.BodyPublishers.ofString(root.toString()))
                .build();
        http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).thenAccept(response -> {
            if (response.statusCode() < 200 || response.statusCode() >= 300) logger.warn("Status update rejected with HTTP {}", response.statusCode());
        }).exceptionally(error -> { logger.warn("Status update failed: {}", error.getMessage()); return null; });
    }

    private JsonObject serverStatus(String name) {
        JsonObject out = new JsonObject();
        Optional<RegisteredServer> registered = proxy.getServer(name);
        if (registered.isEmpty()) {
            out.addProperty("online", false); out.addProperty("playersOnline", 0); out.addProperty("maxPlayers", 0); return out;
        }
        try {
            var ping = registered.get().ping().toCompletableFuture().get(4, TimeUnit.SECONDS);
            out.addProperty("online", true);
            if (ping.getPlayers().isPresent()) {
                out.addProperty("playersOnline", Math.max(0, ping.getPlayers().get().getOnline()));
                out.addProperty("maxPlayers", Math.max(0, ping.getPlayers().get().getMax()));
            } else { out.addProperty("playersOnline", registered.get().getPlayersConnected().size()); out.addProperty("maxPlayers", 0); }
        } catch (Exception e) {
            out.addProperty("online", false); out.addProperty("playersOnline", 0); out.addProperty("maxPlayers", 0);
        }
        return out;
    }
}
