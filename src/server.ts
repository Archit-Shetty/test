import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { connectToDatabase } from "./lib/db";

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

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getTwitchAccessToken(env: any): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  try {
    const clientId = env?.TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID;
    const clientSecret = env?.TWITCH_CLIENT_SECRET || process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!response.ok) throw new Error("Twitch handshake failed");
    const data = await response.json();

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000;
    return cachedToken;
  } catch (err) {
    return null;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // --- 📡 ROUTE A: IGDB SECURE GAME LOOKUPS SEARCH ROUTE ---
    if (url.pathname === '/api/search-games') {
      try {
        const query = url.searchParams.get('q');
        if (!query) return new Response(JSON.stringify({ error: "Missing parameter q" }), { status: 400 });

        const accessToken = await getTwitchAccessToken(env);
        const clientId = (env as any)?.TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID;

        if (!accessToken || !clientId) return new Response(JSON.stringify({ error: "Twitch pipeline crash" }), { status: 500 });

        const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain',
          },
          body: `search "${query}"; fields name, cover.url, genres.name, summary, first_release_date; limit 6;`
        });

        const rawGames = await igdbResponse.json();
        const polishedGames = rawGames.map((game: any) => {
          let absoluteCoverUrl = "";
          if (game.cover?.url) {
            const rawUrl = game.cover.url;
            const completeLink = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
            absoluteCoverUrl = completeLink.replace('t_thumb', 't_cover_big');
          }

          return {
            title: game.name,
            coverUrl: absoluteCoverUrl, 
            thumbnail: absoluteCoverUrl,
            description: game.summary || "No description cataloged in archives.",
            genres: game.genres ? game.genres.map((g: any) => g.name) : ["PC Game"],
            year: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined
          };
        });

        return new Response(JSON.stringify(polishedGames), { status: 200, headers: { "content-type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // --- 🏴‍☠️ ROUTE B: DEEP TWO-STEP FITGIRL REPACK SCRAPER ---
    if (url.pathname === '/api/scrape-repack') {
      try {
        const titleQuery = url.searchParams.get('title');
        if (!titleQuery) return new Response(JSON.stringify({ error: "Missing title parameter" }), { status: 400 });

        // STEP 1: Query FitGirl's internal WordPress search layout loop
        const fitgirlSearchUrl = `https://fitgirl-repacks.site/?s=${encodeURIComponent(titleQuery)}`;
        const searchResponse = await fetch(fitgirlSearchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!searchResponse.ok) throw new Error("FitGirl site search loop blocked or timed out");
        const searchHtml = await searchResponse.text();

        // Regex to extract the first matching post's direct article URL page link
        const entryTitleRegex = /<h1 class="entry-title"><a href="([^"]+)"/g;
        const articleLinks = [...searchHtml.matchAll(entryTitleRegex)].map(l => l[1]);

        if (articleLinks.length === 0) {
          return new Response(JSON.stringify({ found: false }), { status: 200, headers: { "content-type": "application/json" } });
        }

        // STEP 2: Follow the link into the specific post page to find the deep embedded magnet content
        const targetPostUrl = articleLinks[0];
        const postResponse = await fetch(targetPostUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!postResponse.ok) throw new Error("Failed to follow target repack article details link");
        const postHtml = await postResponse.text();

        // Parse deep magnet matches out of the main post wrapper content fields
        const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/g;
        const deepMagnets = [...postHtml.matchAll(magnetRegex)].map(m => m[1]);

        if (deepMagnets.length > 0) {
          return new Response(JSON.stringify({
            found: true,
            magnet: deepMagnets[0],
            pageUrl: targetPostUrl
          }), { status: 200, headers: { "content-type": "application/json" } });
        }

        return new Response(JSON.stringify({ found: false }), { status: 200, headers: { "content-type": "application/json" } });
      } catch (err: any) {
        console.error("Scraper Engine Failure:", err.message);
        return new Response(JSON.stringify({ found: false, error: err.message }), { status: 500 });
      }
    }

    // --- 🗄️ ROUTE C: FETCH MEDIA ITEMS FROM DATABASE COLLECTIONS ---
    if (url.pathname === '/api/vault' && request.method === 'GET') {
      try {
        const { db } = await connectToDatabase();
        const games = await db.collection("games").find({}).toArray();
        const movies = await db.collection("movies").find({}).toArray();
        const playlists = await db.collection("playlists").find({}).toArray();

        return new Response(JSON.stringify({ games, movies, playlists }), { status: 200, headers: { "content-type": "application/json" } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // --- 💾 ROUTE D: PERSIST NEW ITEM ENTRY TO DATABASE COLLECTION ---
    if (url.pathname === '/api/vault' && request.method === 'POST') {
      try {
        const { db } = await connectToDatabase();
        const body = await request.json();
        const { type, data } = body;

        if (!type || !data) return new Response(JSON.stringify({ error: "Invalid payload parameters" }), { status: 400 });

        const collectionName = type === "game" ? "games" : type === "movie" ? "movies" : "playlists";
        const result = await db.collection(collectionName).insertOne({
          ...data,
          id: Math.random().toString(36).slice(2, 10),
          loggedAt: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, insertedId: result.insertedId }), { status: 201, headers: { "content-type": "application/json" } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // --- 🗑️ ROUTE E: CLEAN REMOVAL HANDLER INTERCEPTOR ---
    if (url.pathname === '/api/vault' && request.method === 'DELETE') {
      try {
        const { db } = await connectToDatabase();
        const body = await request.json();
        const { type, id } = body;

        if (!type || !id) return new Response(JSON.stringify({ error: "Missing identity parsing strings" }), { status: 400 });

        const collectionName = type === "game" ? "games" : type === "movie" ? "movies" : "playlists";
        await db.collection(collectionName).deleteOne({ id: id });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
    }
  },
};