import { Link, Outlet, createRootRoute, HeadContent, Scripts, ScrollRestoration } from "@tanstack/react-router";
import { VaultProvider, useVault } from "@/lib/vault-store";
import { Toaster } from "@/components/ui/sonner";
import { Film, Gamepad2, Music, Home, Play, Pause, SkipForward, SkipBack, Disc, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

// 🎨 Pull down your Tailwind styles safely using an inline query parameter asset rule
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  // 🛡️ Binds the styling asset dynamically to the document head rendering layer
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootDocument,
  // 🛡️ Resolves TanStack Router's 404 warning by configuring an explicit fallback component bound cleanly
  notFoundComponent: RouteNotFoundBoundary,
});

// 🏢 The Shell Document container that handles server-side metadata injections for TanStack Start
function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#04020a] text-zinc-100 antialiased font-sans">
        <RootLayout />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <VaultProvider>
      <div className="min-h-screen flex flex-col relative">
        
        {/* Navigation Sidebar Hub Header row */}
        <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-display tracking-widest font-black uppercase text-white hover:text-cyan-400 transition-colors">
            <Home className="h-4 w-4" /> Vault.Core
          </Link>
          
          <div className="flex items-center gap-6 text-xs font-display tracking-wider uppercase font-bold">
            <Link to="/games" className="flex items-center gap-1.5 text-zinc-400 hover:text-pink-400 transition-colors [&.active]:text-pink-500">
              <Gamepad2 className="h-4 w-4" /> Games
            </Link>
            <Link to="/movies" className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors [&.active]:text-amber-500">
              <Film className="h-4 w-4" /> Cinema
            </Link>
            <Link to="/playlists" className="flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors [&.active]:text-cyan-500">
              <Music className="h-4 w-4" /> Jukebox
            </Link>
          </div>
        </nav>

        {/* Dynamic Route View injection viewport element */}
        <main className="flex-1 relative z-10">
          <Outlet />
        </main>

        {/* 🎧 GLOBAL UNINTERRUPTED MUSIC DECK DOCK CONTAINER */}
        <GlobalPersistentAudioDock />

        <Toaster theme="dark" position="bottom-right" richColors />
      </div>
    </VaultProvider>
  );
}

function GlobalPersistentAudioDock() {
  const { currentTrack, isPlaying, setIsPlaying, nextTrack, prevTrack, activePlaylist } = useVault();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setIframeUrl(null);
      return;
    }

    // 🟢 TRANSFORM SOURCE A: SPOTIFY DIRECT IFRAME GENERATION
    if (currentTrack.source === "spotify") {
      setIframeUrl(`https://open.spotify.com/embed/track/${currentTrack.trackId}?utm_source=generator&theme=0`);
    } 
    // 🔴 TRANSFORM SOURCE B: YOUTUBE DIRECT PIP EMBED GENERATION
    else if (currentTrack.source === "youtube") {
      setIframeUrl(`https://www.youtube.com/embed/${currentTrack.trackId}?autoplay=1&enablejsapi=1`);
    } else {
      setIframeUrl(null);
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] animate-in slide-in-from-bottom-6 duration-300">
      
      {/* Track Art & Data Layer */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative h-11 w-11 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center group">
          {currentTrack.coverUrl ? (
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.title} 
              className={`w-full h-full object-cover transition-transform duration-[4s] linear ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            />
          ) : (
            <Disc className={`h-5 w-5 text-zinc-500 ${isPlaying ? 'animate-spin' : ''}`} />
          )}
        </div>
        
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
            {currentTrack.title}
          </div>
          <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
            {currentTrack.artist} {activePlaylist && `• from "${activePlaylist.name}"`}
          </div>
        </div>
      </div>

      {/* Persistent Invisible Layer Iframe Player */}
      {iframeUrl && (
        <div className="w-0 h-0 opacity-0 absolute pointer-events-none">
          <iframe 
            src={iframeUrl}
            width="100%" 
            height="100%" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
          />
        </div>
      )}

      {/* Manual Layout Control Buttons Tray */}
      <div className="flex items-center gap-2 shrink-0">
        {activePlaylist && (
          <button onClick={prevTrack} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
        )}

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
        </button>

        {activePlaylist && (
          <button onClick={nextTrack} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        )}
      </div>

    </div>
  );
}

// 🛡️ CUSTOM 404 ROUTE NOT FOUND CONFIGURATION BOUNDARY
function RouteNotFoundBoundary() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <AlertTriangle className="h-10 w-10 text-cyan-400 animate-bounce" />
      <div className="space-y-1">
        <h2 className="text-xl font-display font-bold uppercase tracking-wider text-white">404 Route Mismatch</h2>
        <p className="text-xs text-zinc-400 max-w-sm">The index segment context you requested doesn't exist or failed to load fully inside TanStack's current router compilation pass tree.</p>
      </div>
      <Link to="/" className="px-4 py-2 rounded bg-zinc-900 border border-white/10 hover:border-cyan-500/30 text-xs font-display uppercase tracking-widest text-zinc-200 transition-colors">
        Return to Core Hub
      </Link>
    </div>
  );
}