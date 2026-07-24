import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Game } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, ImageOff, Trash2, ArrowLeft, Plus, Volume2, RefreshCw, X, Music, Search, SlidersHorizontal, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Game Library · Media Vault" },
      { name: "description", content: "Personal PC game collection, repacks, and download configurations." },
    ],
  }),
  component: GamesPage,
});

let globalGameAudioInstance: HTMLAudioElement | null = null;

function playInstantGameTheme(url: string | undefined) {
  if (globalGameAudioInstance) {
    globalGameAudioInstance.pause();
    globalGameAudioInstance = null;
  }
  if (!url) return;

  const audio = new Audio(url);
  audio.volume = 0.0;
  audio.play().catch(() => console.log("User interaction required before browser audio triggers."));
  globalGameAudioInstance = audio;

  let currentVol = 0;
  const fadeIn = setInterval(() => {
    if (!globalGameAudioInstance || globalGameAudioInstance !== audio) {
      clearInterval(fadeIn);
      return;
    }
    currentVol = Math.min(currentVol + 0.05, 0.3);
    audio.volume = currentVol;
    if (currentVol >= 0.3) clearInterval(fadeIn);
  }, 50);

  setTimeout(() => {
    if (globalGameAudioInstance === audio) {
      let fadeOutVol = audio.volume;
      const fadeOut = setInterval(() => {
        fadeOutVol = Math.max(fadeOutVol - 0.04, 0);
        if (audio) audio.volume = fadeOutVol;
        if (fadeOutVol <= 0) {
          clearInterval(fadeOut);
          audio.pause();
          if (globalGameAudioInstance === audio) globalGameAudioInstance = null;
        }
      }, 50);
    }
  }, 15000);
}

function GamesPage() {
  const { games, removeGame, updateGame } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Game | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "title" | "recent">("recent");

  // Audio Edit State
  const [editingAudioGame, setEditingAudioGame] = useState<Game | null>(null);

  // Animation States
  const [isProjecting, setIsProjecting] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  
  const targetImageRef = useRef<HTMLDivElement | null>(null);

  // REAL-TIME SEARCH & SORT ENGINE
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchNotes = g.notes?.toLowerCase().includes(q);
        const matchTags = g.tags?.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchNotes || matchTags;
      })
      .sort((a, b) => {
        if (sortBy === "rating") {
          const rA = parseFloat(a.rating) || 0;
          const rB = parseFloat(b.rating) || 0;
          return rB - rA;
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        return 0; // Default order
      });
  }, [games, searchQuery, sortBy]);

  const getGameGlowClass = (ratingStr: string) => {
    if (!ratingStr) return "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] border-white/10";
    const num = parseFloat(ratingStr);
    if (isNaN(num)) return "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] border-white/10";
    
    if (num >= 9) return "group-hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] border-emerald-500/40"; 
    if (num >= 7) return "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] border-cyan-500/40"; 
    if (num >= 5) return "group-hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] border-amber-500/40";
    return "group-hover:shadow-[0_0_35px_rgba(244,63,94,0.35)] border-rose-500/30"; 
  };

  const handleGameSelect = (game: Game, cardElement: HTMLDivElement) => {
    setSelected(game);
    const startRect = cardElement.getBoundingClientRect();
    
    setFlyStyle({
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      width: `${startRect.width}px`,
      height: `${startRect.height}px`,
      zIndex: 50,
      transition: 'none',
    });

    setIsProjecting(true);
    setShowFullView(true);

    playInstantGameTheme(game.themeAudioUrl);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const targetRef = targetImageRef.current;
        if (targetRef) {
          const endRect = targetRef.getBoundingClientRect();
          
          setFlyStyle(prev => ({
            ...prev,
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', 
            top: `${endRect.top}px`,
            left: `${endRect.left}px`,
            width: `${endRect.width}px`,
            height: `${endRect.height}px`,
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.9)',
          }));
        }
      }, 30);
    });

    setTimeout(() => {
      setIsProjecting(false);
    }, 780);
  };

  const handleBackToLounge = () => {
    if (globalGameAudioInstance) {
      globalGameAudioInstance.pause();
      globalGameAudioInstance = null;
    }
    setShowFullView(false);
    setSelected(null);
    setFlyStyle({});
  };

  const handleRemoveAudio = async () => {
    if (!selected) return;
    if (globalGameAudioInstance) {
      globalGameAudioInstance.pause();
      globalGameAudioInstance = null;
    }
    await updateGame(selected.id, { themeAudioUrl: "", themeAudioTitle: "" });
    setSelected(prev => prev ? { ...prev, themeAudioUrl: "", themeAudioTitle: "" } : null);
    toast.success("Removed soundtrack theme");
  };

  useEffect(() => {
    return () => {
      if (globalGameAudioInstance) {
        globalGameAudioInstance.pause();
        globalGameAudioInstance = null;
      }
    };
  }, []);

  return (
    <VaultShell>
      <div className="relative min-h-screen overflow-hidden bg-[#05020a]">
        
        {/* PERMANENT FLOATING ACTION BUTTON */}
        {!showFullView && (
          <button
            onClick={() => setAddOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-black px-4 py-3.5 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-purple-300/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-display tracking-widest uppercase pr-1">Log Game</span>
          </button>
        )}

        {/* FLYING COVER TRANSITION */}
        {isProjecting && selected && (
          <div style={flyStyle} className="rounded-xl border border-white/20 bg-black overflow-hidden pointer-events-none">
            {selected.coverUrl ? (
              <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 bg-zinc-900/50"><ImageOff className="h-6 w-6" /></div>
            )}
          </div>
        )}

        {/* MAIN GALLERY GRID */}
        <div 
          className={`relative z-10 p-8 max-w-7xl mx-auto transition-all duration-500 ease-out ${
            isProjecting ? "opacity-20 blur-sm pointer-events-none" : "opacity-100 blur-none"
          } ${showFullView ? "hidden" : "block"}`}
        >
          {/* STICKY HEADER & CONTROL STRIP */}
          <header className="sticky top-4 z-30 border border-white/10 bg-black/60 backdrop-blur-3xl p-4 md:p-5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] mb-8 transition-all space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="font-display text-[10px] tracking-widest text-purple-400 mb-0.5 animate-pulse">// SYSTEM CORE MODULE 01</div>
                <h1 className="text-2xl font-display flex items-center gap-2 text-white">
                  <Gamepad2 className="h-6 w-6 text-purple-400 animate-pulse" />
                  Game Vault
                </h1>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter games by title, tags, setup notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-200 outline-none focus:border-purple-500/60 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white bg-transparent border-none cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort Toolbar */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                ARCHIVED ITEMS: <span className="text-purple-400 font-bold">{filteredGames.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-display uppercase tracking-wider rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="recent">Recently Logged</option>
                  <option value="rating">Highest Score</option>
                  <option value="title">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>
          </header>

          {filteredGames.length === 0 ? (
            games.length === 0 ? (
              <EmptyState onAdd={() => setAddOpen(true)} label="game" />
            ) : (
              <div className="border border-dashed border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-12 text-center space-y-2">
                <p className="text-sm text-zinc-400 font-display tracking-wider">No matching games found for active search query.</p>
                <button onClick={() => setSearchQuery("")} className="text-xs text-purple-400 underline uppercase tracking-wider bg-transparent border-none cursor-pointer">
                  Reset search
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {filteredGames.map((g) => (
                <GameSpotlightCard 
                  key={g.id} 
                  game={g}
                  onSelect={(el) => handleGameSelect(g, el)} 
                  glowClass={getGameGlowClass(g.rating)} 
                  hidden={isProjecting && selected?.id === g.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* FULL SCREEN DETAILED VIEW */}
        {showFullView && selected && (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-zinc-950/80 border border-white/10 backdrop-blur-3xl rounded-2xl p-6 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
              
              <button 
                onClick={handleBackToLounge}
                className="absolute top-6 left-6 flex items-center gap-2 text-xs font-display tracking-widest text-zinc-400 hover:text-purple-400 transition-colors group uppercase border-none bg-transparent outline-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> exit vault
              </button>

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 mt-8">
                <div 
                  ref={targetImageRef}
                  className="w-[240px] h-[320px] rounded-xl border border-white/10 bg-zinc-950 overflow-hidden shadow-[0_2px_25px_rgba(0,0,0,0.8)] relative group"
                >
                  {!isProjecting && (
                    selected.coverUrl ? (
                      <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover animate-fade-in duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 bg-zinc-900"><ImageOff className="h-10 w-10" /></div>
                    )
                  )}
                </div>

                <div className={`flex flex-col justify-between space-y-6 transition-all duration-300 ${isProjecting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
                  <div className="space-y-5">
                    
                    {/* Line 1: Game Title */}
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight leading-tight">{selected.title}</h2>
                    </div>

                    {/* Line 2: Rating & Theme Track Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {selected.rating && (() => {
                        const num = parseFloat(selected.rating);
                        let badgeColor = "from-zinc-800 to-zinc-900 border-zinc-700/50 text-zinc-400";
                        
                        if (!isNaN(num)) {
                          if (num >= 9.0) badgeColor = "from-emerald-950/80 to-teal-950/80 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                          else if (num >= 7.0) badgeColor = "from-cyan-950/80 to-blue-950/80 text-cyan-400 border-cyan-500/30";
                          else if (num >= 5.0) badgeColor = "from-amber-950/80 to-orange-950/80 text-amber-400 border-amber-500/30";
                          else badgeColor = "from-rose-950/80 to-red-950/80 text-rose-400 border-rose-500/30 animate-pulse";
                        }

                        return (
                          <span className={`px-2.5 py-1 text-xs font-display font-black tracking-widest border rounded-md bg-gradient-to-r shadow-md backdrop-blur-sm ${badgeColor}`}>
                            ★ SCORE: {selected.rating}
                          </span>
                        );
                      })()}
                      
                      {/* SOUNDTRACK SWAP / REMOVE CONTROL */}
                      {selected.themeAudioUrl ? (
                        <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-md text-purple-400 text-[10px] font-mono tracking-widest uppercase shadow-sm">
                          <Volume2 className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                          <span className="max-w-[140px] truncate">🎵 {selected.themeAudioTitle || "Theme Track"}</span>
                          <div className="flex items-center gap-1 pl-1 border-l border-purple-500/20">
                            <button onClick={() => { setEditingAudioGame(selected); setAddOpen(true); }} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer" title="Swap Audio Track">
                              <RefreshCw className="h-3 w-3" />
                            </button>
                            <button onClick={handleRemoveAudio} className="hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer" title="Remove Audio Track">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingAudioGame(selected); setAddOpen(true); }} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 px-2.5 py-1 rounded-md text-zinc-400 hover:text-purple-400 text-[10px] font-mono tracking-widest uppercase transition-colors cursor-pointer">
                          <Music className="h-3 w-3" /> Add Theme Music
                        </button>
                      )}
                    </div>
                    
                    {/* Line 3: Category Genres Badges */}
                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-zinc-800 bg-zinc-900/60 text-zinc-300 px-2 py-0.5">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Line 4: Game Overview */}
                    {selected.description && (
                      <div className="space-y-1">
                        <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase">// OVERVIEW</div>
                        <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/20 p-4 rounded-xl border border-white/5 shadow-inner font-sans">
                          {selected.description}
                        </p>
                      </div>
                    )}

                    {/* Line 5: Setup Notes */}
                    {selected.notes && (
                      <div className="space-y-1">
                        <div className="font-display text-[10px] tracking-widest text-purple-400 font-bold">// SETUP & INSTALL NOTES</div>
                        <p className="text-sm text-zinc-300 italic whitespace-pre-wrap border-l-2 border-purple-400 pl-4 bg-purple-950/5 py-2 rounded-r font-sans">
                          "{selected.notes}"
                        </p>
                      </div>
                    )}

                    {/* 🎮 Line 6: Magnet & Game Page Mirror Download Links */}
                    {(selected.magnet || selected.mirrorUrl) && (
                      <div className="space-y-2 pt-2">
                        <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                          <Download className="h-3 w-3 text-purple-400" /> DOWNLOAD & REPACK SOURCES
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                          {selected.magnet && (
                            <a
                              href={selected.magnet}
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/10 border border-purple-500/40 hover:border-purple-400 rounded-lg px-3.5 py-2 transition-all duration-200 shadow-md hover:scale-[1.02] text-xs font-display font-bold text-purple-300 hover:text-white uppercase tracking-wider"
                            >
                              <Download className="h-3.5 w-3.5 text-purple-400" /> Open Magnet Link
                            </a>
                          )}

                          {selected.mirrorUrl && (
                            <a
                              href={selected.mirrorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/15 to-indigo-500/5 border border-purple-500/30 hover:border-purple-400 rounded-lg px-3.5 py-2 transition-all duration-200 shadow-md hover:scale-[1.02] text-xs font-display font-bold text-purple-300 hover:text-white uppercase tracking-wider"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-purple-400" /> Open Game Page
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Actions Management Tray */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/10 text-xs font-display tracking-wider"
                      onClick={() => {
                        removeGame(selected.id);
                        handleBackToLounge();
                        toast.success("Removed game record");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> PURGE GAME DATA
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      <AddMediaDialog 
        kind="game" 
        open={addOpen} 
        onOpenChange={(val) => {
          setAddOpen(val);
          if (!val) setEditingAudioGame(null);
        }}
        targetGameToEditAudio={editingAudioGame}
      />
    </VaultShell>
  );
}

function GameSpotlightCard({ game, onSelect, glowClass, hidden }: { game: Game; onSelect: (el: HTMLDivElement) => void; glowClass: string; hidden: boolean }) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={cardRef}
      onClick={() => cardRef.current && onSelect(cardRef.current)}
      className={`group text-left flex flex-col gap-1.5 focus:outline-none cursor-pointer transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className={`relative aspect-[3/4] rounded-md border bg-zinc-950 overflow-hidden shadow-xl transition-all duration-300 ${glowClass}`}>
        <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/10 transition-colors duration-300" />

        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-900/30"><ImageOff className="h-6 w-6" /></div>
        )}

        {game.themeAudioUrl && (
          <div className="absolute top-2 right-2 z-30 p-1 bg-black/60 backdrop-blur-md rounded border border-white/5 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity">
            <Volume2 className="h-3 w-3" />
          </div>
        )}
        
        {game.rating && (() => {
          const num = parseFloat(game.rating);
          let gridBadgeColor = "from-zinc-800 to-zinc-900";
          if (!isNaN(num)) {
            if (num >= 9.0) gridBadgeColor = "from-emerald-600 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
            else if (num >= 7.0) gridBadgeColor = "from-cyan-500 to-blue-600";
            else if (num >= 5.0) gridBadgeColor = "from-amber-500 to-orange-500";
            else gridBadgeColor = "from-rose-600 to-red-700 animate-pulse";
          }
          return (
            <div className="absolute bottom-1.5 right-1.5 z-10">
              <span className={`px-1.5 py-0.5 text-[9px] font-display font-black tracking-wider bg-gradient-to-r border border-white/10 rounded shadow-lg inline-block backdrop-blur-[2px] ${gridBadgeColor}`}>
                ★ {game.rating}
              </span>
            </div>
          );
        })()}
      </div>
      <div className="font-display text-xs font-semibold leading-tight line-clamp-2 text-zinc-300 group-hover:text-white transition-colors">{game.title}</div>
    </div>
  );
}

function EmptyState({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <div className="border border-dashed border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-12 text-center space-y-3 relative z-10">
      <p className="text-sm text-zinc-400 font-display tracking-wider">Game vault has no logged records.</p>
      <Button onClick={onAdd} variant="outline" className="border-white/10 text-white hover:bg-white/10"><Plus className="h-4 w-4 mr-1.5" /> Log your first {label}</Button>
    </div>
  );
}