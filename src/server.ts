import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// IGDB Token Caching Layer
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getTwitchAccessToken(env: any): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    // Falls back to global process environment if context wrapper binding variables aren't provided
    const clientId = env?.TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID;
    const clientSecret = env?.TWITCH_CLIENT_SECRET || process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing IGDB API keys. Please verify your environment config variables.");
      return null;
    }

    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!response.ok) throw new Error("Twitch OAuth token handshake failed");
    const data = await response.json();

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // 1-minute buffer
    return cachedToken;
  } catch (err) {
    console.error("Twitch Token Authentication Engine Error:", err);
    return null;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Securely Intercept IGDB Games lookup route requests before handling SSR
    if (url.pathname === '/api/search-games') {
      try {
        const query = url.searchParams.get('q');
        if (!query) {
          return new Response(JSON.stringify({ error: "Missing required q string parameter" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }

        const accessToken = await getTwitchAccessToken(env);
        const clientId = (env as any)?.TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID;

        if (!accessToken || !clientId) {
          return new Response(JSON.stringify({ error: "Twitch pipeline initialization failure" }), {
            status: 500,
            headers: { "content-type": "application/json" }
          });
        }

        const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain',
          },
          body: `search "${query}"; fields name, cover.url, genres.name, summary, first_release_date; limit 6;`
        });

        if (!igdbResponse.ok) {
          const errText = await igdbResponse.text();
          throw new Error(`IGDB Endpoint error: ${errText}`);
        }

        const rawGames = await igdbResponse.json();

        // Map IGDB structure cleanly into our existing WikiResult structure used by the frontend modal dialog fields
        const polishedGames = rawGames.map((game: any) => {
          const highResCover = game.cover?.url
            ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
            : "";

          return {
            title: game.name,
            thumbnail: highResCover,
            description: game.summary || "No description cataloged in archives.",
            genres: game.genres ? game.genres.map((g: any) => g.name) : ["PC Game"],
            year: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined
          };
        });

        return new Response(JSON.stringify(polishedGames), {
          status: 200,
          headers: { "content-type": "application/json" }
        });

      } catch (error: any) {
        console.error("IGDB Server Proxy Glitch:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "content-type": "application/json" }
        });
      }
    }

    // Pass everything else to the default TanStack application router engine
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};