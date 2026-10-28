# Anna MC Velocity Status Bridge

This is source code for a small Velocity plugin that reports aggregate network player counts and ping status for the configured backend names `lifesteal` and `practice`. It does not transmit player names, chat, IPs, or credentials.

## Requirements
- Velocity 3.4.x
- Java 17+
- A Vercel deployment with the Anna MC `/api/status/update` endpoint
- Neon schema updated with `database/schema.sql`

## Secure configuration

1. Generate a random token of at least 32 characters using a password manager.
2. In Vercel Project → Settings → Environment Variables, add `VELOCITY_STATUS_TOKEN` with that token (Production), then redeploy.
3. In the Velocity hosting panel, set these environment variables for the proxy container:
   - `ANNA_STATUS_ENDPOINT=https://YOUR-VERCEL-DOMAIN/api/status/update`
   - `ANNA_STATUS_TOKEN=THE_SAME_RANDOM_TOKEN`
4. Restart Velocity after setting the variables.

Never put the token in website JavaScript, commit it to GitHub, or share it in screenshots. If the hosting panel cannot set container environment variables, do not paste the token into public files; ask the host for a private environment variable or secret-file option.

## Build from Android-friendly browser IDE or computer

Open this folder in GitHub Codespaces (or another Gradle environment), then run:

```bash
cd velocity-status-bridge
gradle shadowJar
```

The output should be `build/libs/anna-velocity-status-bridge-1.0.0.jar`. Upload that JAR to the Velocity proxy's `plugins` directory and restart the proxy. Check Velocity logs for “status bridge enabled”.

If the host does not provide Gradle globally, use the Gradle wrapper in a Codespace (create it with `gradle wrapper`, then run `./gradlew shadowJar`).

## Verify
- Run the SQL from the current `database/schema.sql` in Neon.
- Wait up to 30 seconds after Velocity starts.
- Open `https://YOUR-VERCEL-DOMAIN/api/status`. It should return `configured: true`, a recent timestamp, and counts.
- The home page reads `/api/status`; it displays “Status unavailable” until a fresh authenticated update is received.
- If the feed is stale after 90 seconds, the API deliberately reports servers offline rather than showing old counts.

## Notes
The plugin checks the exact Velocity backend keys `lifesteal` and `practice`, matching the provided `velocity.toml`. Lobby is intentionally not shown as a game mode on the website. The network-wide max-player capacity is not currently published, so the API uses 0 for that optional field.
