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
        const query = url.searchParams.get('query') || url.searchParams.get('q');
        if (!query) return new Response(JSON.stringify({ error: "Missing parameter q or query" }), { status: 400 });

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

    // --- 🎬 ROUTE B: TMDB DUAL-FALLBACK MOVIE SEARCH PROXY ---
    if (url.pathname === '/api/search-movies') {
      try {
        const query = url.searchParams.get('query') || url.searchParams.get('q');
        if (!query) return new Response(JSON.stringify({ error: "Missing query parameters" }), { status: 400 });

        const rawToken = (env as any)?.TMDB_ACCESS_TOKEN || process.env.TMDB_ACCESS_TOKEN;
        const tmdbToken = rawToken ? String(rawToken).replace(/[\r\n"']/g, '').trim() : "";

        if (!tmdbToken || tmdbToken.length < 10) {
          return new Response(JSON.stringify({ error: "TMDb access token is unreadable or missing from environment." }), { status: 500 });
        }

        // 🏷️ TMDb Static Genre Dictionary Matrix
        const TMDB_GENRES: Record<number, string> = {
          28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
          80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
          14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
          9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
          53: "Thriller", 10752: "War", 37: "Western"
        };

        let tmdbResponse: Response | null = null;
        let fetchError: Error | null = null;

        try {
          tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${tmdbToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (err: any) {
          fetchError = err;
        }

        if (!tmdbResponse || !tmdbResponse.ok) {
          try {
            tmdbResponse = await fetch(
              `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${tmdbToken}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (mirrorErr: any) {
            return new Response(JSON.stringify({ error: "Network pipeline blocked" }), { status: 502 });
          }
        }

        if (!tmdbResponse.ok) {
          return new Response(JSON.stringify({ error: `Upstream error status ${tmdbResponse.status}` }), { status: tmdbResponse.status });
        }

        const data = await tmdbResponse.json();
        const polishedMovies = (data.results || []).slice(0, 6).map((movie: any) => {
          // Look up the matching strings from the genre_ids array returned by TMDb
          const resolvedGenres = movie.genre_ids && movie.genre_ids.length > 0
            ? movie.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean)
            : ["Cinema"];

          return {
            title: movie.title,
            coverUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview || "No synopsis cataloged in archives.",
            genres: resolvedGenres // Now returns full genre name arrays!
          };
        });

        return new Response(JSON.stringify(polishedMovies), { 
          status: 200, 
          headers: { "content-type": "application/json" } 
        });

      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // --- 🎵 ROUTE C1: FAILSAFE OPEN THEME SOUNDTRACK AUDIO LOOKUPS ---
    if (url.pathname === '/api/search-tracks') {
      try {
        const query = url.searchParams.get('query') || url.searchParams.get('q');
        if (!query) return new Response(JSON.stringify({ error: "Missing query parameter" }), { status: 400 });

        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`;
        const response = await fetch(searchUrl);
        
        if (!response.ok) throw new Error("Audio repository gateway issue");
        const json = await response.json();

        const formattedTracks = (json.results || []).map((track: any) => ({
          trackId: track.trackId,
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName,
          // Pristine, high-quality 30-second preview audio streaming source
          previewUrl: track.previewUrl,
          thumbnail: track.artworkUrl60
        }));

        return new Response(JSON.stringify(formattedTracks), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // --- 🎵 ROUTE C2: PLAYLIST TRACK MODIFICATION HANDLER ---
    if (url.pathname === '/api/vault/playlists/tracks' && request.method === 'POST') {
      try {
        const { db } = await connectToDatabase();
        const body = await request.json();
        const { playlistId, action, track, trackId } = body;

        if (!playlistId) return new Response(JSON.stringify({ error: "Missing playlist identifier" }), { status: 400 });

        if (action === "add") {
          // Push a brand new song element into the playlist's track array storage
          await db.collection("playlists").updateOne(
            { id: playlistId },
            { $push: { tracks: { ...track, trackId: Math.random().toString(36).slice(2, 10) } } } as any
          );
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === "remove") {
          // Pull a song out of the playlist's track array layout natively via MongoDB query blocks casting as any to satisfy index definitions
          await db.collection("playlists").updateOne(
            { id: playlistId },
            { $pull: { tracks: { trackId: trackId } } } as any
          );
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Invalid layout action string" }), { status: 400 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // --- 🎵 ROUTE C3: SPOTIFY & YOUTUBE PLAYLIST IMPORTER PROXY ---
    if (url.pathname === '/api/jukebox/import') {
      try {
        const playlistUrl = url.searchParams.get('url');
        if (!playlistUrl) return new Response(JSON.stringify({ error: "Missing playlist source target url path" }), { status: 400 });

        // 🟢 INTERCEPT PLATFORM A: SPOTIFY DIRECT INGESTION
        if (playlistUrl.includes('spotify.com')) {
          const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
          if (!playlistIdMatch) return new Response(JSON.stringify({ error: "Unreadable Spotify ID format" }), { status: 400 });
          const playlistId = playlistIdMatch[1];

          const clientId = (env as any)?.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
          const clientSecret = (env as any)?.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET;

          if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({ error: "Credentials missing inside .env configurations" }), { status: 500 });
          }

          // Automated client credential token signature handshake loop execution
          const authRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
          });
          const authData = await authRes.json();
          const token = authData.access_token;

          // Fetch the tracks directly from Spotify catalog channels
          const trackRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!trackRes.ok) return new Response(JSON.stringify({ error: "Upstream profile query denied" }), { status: 401 });
          const spotData = await trackRes.json();

          const importedPlaylist = {
            name: spotData.name,
            description: spotData.description || "Imported catalog mix.",
            coverUrl: spotData.images?.[0]?.url || "",
            sourceUrl: playlistUrl,
            tracks: (spotData.tracks?.items || []).map((item: any) => ({
              trackId: Math.random().toString(36).slice(2, 10),
              title: item.track?.name || "Unknown title",
              artist: item.track?.artists?.map((a: any) => a.name).join(', ') || "Unknown artist",
              album: item.track?.album?.name || "Unknown Album",
              coverUrl: item.track?.album?.images?.[0]?.url || "",
              source: "spotify"
            }))
          };

          return new Response(JSON.stringify(importedPlaylist), { status: 200, headers: { "content-type": "application/json" } });
        }

        // 🔴 INTERCEPT PLATFORM B: YOUTUBE MUSIC METADATA INGESTION
        if (playlistUrl.includes('youtube.com') || playlistUrl.includes('youtu.be')) {
          const ytListIdMatch = playlistUrl.match(/[&?]list=([^&]+)/);
          if (!ytListIdMatch) return new Response(JSON.stringify({ error: "Missing identity parameter listing block context" }), { status: 400 });
          const listId = ytListIdMatch[1];

          // Querying via open metadata extraction blocks seamlessly without hitting authentication deadends
          const ytScrapeRes = await fetch(`https://images${Math.floor(Math.random() * 3) + 1}-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=${encodeURIComponent(`https://www.youtube.com/playlist?list=${listId}`)}`);
          const html = await ytScrapeRes.text();

          // Regex arrays mapping structural script outputs injected inside YouTube document assets
          const cleanScriptMatch = html.match(/var ytInitialData = ({.*?});/);
          if (!cleanScriptMatch) return new Response(JSON.stringify({ error: "Target data cluster array parsing blocked" }), { status: 500 });
          const ytJson = JSON.parse(cleanScriptMatch[1]);

          const sidebar = ytJson.sidebar?.playlistSidebarRenderer?.items || [];
          const metadata = sidebar[0]?.playlistSidebarPrimaryInfoRenderer;
          const plTitle = metadata?.title?.runs?.[0]?.text || "YouTube Mix Playlist";
          const plCover = metadata?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || "";

          const tabsRows = ytJson.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];

          const parsedYtTracks = tabsRows.map((videoItem: any) => {
            const vData = videoItem.playlistVideoRenderer;
            if (!vData) return null;
            return {
              trackId: Math.random().toString(36).slice(2, 10),
              title: vData.title?.runs?.[0]?.text || "Unknown clip",
              artist: vData.shortBylineText?.runs?.[0]?.text || "Soundtrack",
              album: "YouTube Video Mix",
              coverUrl: vData.thumbnail?.thumbnails?.[0]?.url || "",
              source: "youtube"
            };
          }).filter(Boolean);

          const importedYtPlaylist = {
            name: plTitle,
            description: "Synchronized long-form YouTube stream set.",
            coverUrl: plCover,
            sourceUrl: playlistUrl,
            tracks: parsedYtTracks
          };

          return new Response(JSON.stringify(importedYtPlaylist), { status: 200, headers: { "content-type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Unsupported platform layout string target" }), { status: 400 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // --- 🏴‍☠️ ROUTE D: DEEP TWO-STEP FITGIRL REPACK SCRAPER ---
    if (url.pathname === '/api/scrape-repack') {
      try {
        const titleQuery = url.searchParams.get('title');
        if (!titleQuery) return new Response(JSON.stringify({ error: "Missing title parameter" }), { status: 400 });

        const fitgirlSearchUrl = `https://fitgirl-repacks.site/?s=${encodeURIComponent(titleQuery)}`;
        const searchResponse = await fetch(fitgirlSearchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!searchResponse.ok) throw new Error("FitGirl site search loop blocked or timed out");
        const searchHtml = await searchResponse.text();

        const entryTitleRegex = /<h1 class="entry-title"><a href="([^"]+)"/g;
        const articleLinks = [...searchHtml.matchAll(entryTitleRegex)].map(l => l[1]);

        if (articleLinks.length === 0) {
          return new Response(JSON.stringify({ found: false }), { status: 200, headers: { "content-type": "application/json" } });
        }

        const targetPostUrl = articleLinks[0];
        const postResponse = await fetch(targetPostUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!postResponse.ok) throw new Error("Failed to follow target repack article details link");
        const postHtml = await postResponse.text();

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

    // --- 🗄️ ROUTE E: FETCH MEDIA ITEMS FROM DATABASE COLLECTIONS ---
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

    // --- 💾 ROUTE F: PERSIST NEW ITEM ENTRY TO DATABASE COLLECTION ---
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

    // --- 🗑️ ROUTE G: CLEAN REMOVAL HANDLER INTERCEPTOR ---
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