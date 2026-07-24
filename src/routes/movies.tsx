import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Movie } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Trash2, ArrowLeft, Calendar, Film, Plus, Volume2, Tv, ExternalLink, Play, X, Music, RefreshCw, Sparkles, Search, SlidersHorizontal, CheckCircle2, Bookmark } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movie Theatre · Media Vault" },
      { name: "description", content: "Private digital archive of logged movies, TV series, personal reviews, and scores." },
    ],
  }),
  component: MoviesPage,
});

let globalMovieAudioInstance: HTMLAudioElement | null = null;

function playInstantMovieTheme(url: string | undefined) {
  if (globalMovieAudioInstance) {
    globalMovieAudioInstance.pause();
    globalMovieAudioInstance = null;
  }
  if (!url) return;

  const audio = new Audio(url);
  audio.volume = 0.0;
  audio.play().catch(() => console.log("User interaction required before browser audio triggers."));
  globalMovieAudioInstance = audio;

  let currentVol = 0;
  const fadeIn = setInterval(() => {
    if (!globalMovieAudioInstance || globalMovieAudioInstance !== audio) {
      clearInterval(fadeIn);
      return;
    }
    currentVol = Math.min(currentVol + 0.05, 0.3);
    audio.volume = currentVol;
    if (currentVol >= 0.3) clearInterval(fadeIn);
  }, 50);

  setTimeout(() => {
    if (globalMovieAudioInstance === audio) {
      let fadeOutVol = audio.volume;
      const fadeOut = setInterval(() => {
        fadeOutVol = Math.max(fadeOutVol - 0.04, 0);
        if (audio) audio.volume = fadeOutVol;
        if (fadeOutVol <= 0) {
          clearInterval(fadeOut);
          audio.pause();
          if (globalMovieAudioInstance === audio) globalMovieAudioInstance = null;
        }
      }, 50);
    }
  }, 15000);
}

function MoviesPage() {
  const { movies, removeMovie, updateMovie } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);

  // 📌 BATCH 2: FILTER & SORT STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "watched" | "watchlist">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "movie" | "tv">("all");
  const [sortBy, setSortBy] = useState<"rating" | "year" | "recent">("recent");

  // Audio Edit State
  const [editingAudioMovie, setEditingAudioMovie] = useState<Movie | null>(null);

  // Cinematic States
  const [isProjecting, setIsProjecting] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  
  // YouTube Trailer Player & Swap State
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isFetchingTrailer, setIsFetchingTrailer] = useState(false);
  const [showReplaceTrailerPrompt, setShowReplaceTrailerPrompt] = useState(false);
  const [customTrailerInput, setCustomTrailerInput] = useState("");

  const targetImageRef = useRef<HTMLDivElement | null>(null);

  // 📌 BATCH 2: REAL-TIME FILTERING & SORTING ENGINE
  const filteredMovies = useMemo(() => {
    return movies
      .filter((m) => {
        // Text Search (title, tags, review)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title.toLowerCase().includes(q);
          const matchReview = m.review?.toLowerCase().includes(q);
          const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchReview && !matchTags) return false;
        }

        // Status Filter
        const movieStatus = m.status || "watched";
        if (statusFilter === "watched" && movieStatus !== "watched") return false;
        if (statusFilter === "watchlist" && movieStatus !== "watchlist") return false;

        // Category Filter
        const tags = m.tags?.map((t) => t.toLowerCase()) || [];
        const isTV = tags.includes("tv series") || tags.includes("tv");
        if (categoryFilter === "tv" && !isTV) return false;
        if (categoryFilter === "movie" && isTV) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") {
          const rA = parseFloat(a.rating) || 0;
          const rB = parseFloat(b.rating) || 0;
          return rB - rA;
        }
        if (sortBy === "year") {
          return (b.year || 0) - (a.year || 0);
        }
        // Recent
        return new Date(b.loggedAt || 0).getTime() - new Date(a.loggedAt || 0).getTime();
      });
  }, [movies, searchQuery, statusFilter, categoryFilter, sortBy]);

  const getMovieGlowClass = (ratingStr: string) => {
    if (!ratingStr) return "group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] border-white/10";
    const num = parseFloat(ratingStr);
    if (isNaN(num)) return "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] border-white/10";
    
    if (num >= 9) return "group-hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] border-emerald-500/40"; 
    if (num >= 7) return "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] border-cyan-500/40"; 
    if (num >= 5) return "group-hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] border-amber-500/40";
    return "group-hover:shadow-[0_0_35px_rgba(244,63,94,0.35)] border-rose-500/30"; 
  };

  const handleMovieSelect = (movie: Movie, cardElement: HTMLDivElement) => {
    setSelected(movie);
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

    playInstantMovieTheme(movie.themeAudioUrl);

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
    if (globalMovieAudioInstance) {
      globalMovieAudioInstance.pause();
      globalMovieAudioInstance = null;
    }
    setShowFullView(false);
    setSelected(null);
    setShowTrailerModal(false);
    setShowReplaceTrailerPrompt(false);
    setFlyStyle({});
  };

  // 📌 BATCH 2: TOGGLE WATCH STATE ACTION
  const handleToggleWatchState = async () => {
    if (!selected) return;
    const nextStatus = (selected.status || "watched") === "watched" ? "watchlist" : "watched";
    await updateMovie(selected.id, { status: nextStatus });
    setSelected((prev) => (prev ? { ...prev, status: nextStatus } : null));
    toast.success(`Marked as ${nextStatus === "watchlist" ? "Watchlist" : "Watched"}`);
  };

  const handleInjectTrailerForSelected = async () => {
    if (!selected) return;
    setIsFetchingTrailer(true);
    try {
      const res = await fetch(`/api/get-trailer?title=${encodeURIComponent(selected.title)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.trailerKey) {
          await updateMovie(selected.id, { trailerKey: data.trailerKey });
          setSelected(prev => prev ? { ...prev, trailerKey: data.trailerKey } : null);
          toast.success("Updated trailer key!");
        } else {
          toast.error("No trailer found");
        }
      }
    } catch {
      toast.error("Trailer lookup failed");
    } finally {
      setIsFetchingTrailer(false);
      setShowReplaceTrailerPrompt(false);
    }
  };

  const extractYTKey = (input: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[2].length === 11) ? match[2] : input.trim();
  };

  const handleCustomTrailerSave = async () => {
    if (!selected || !customTrailerInput.trim()) return;
    const key = extractYTKey(customTrailerInput);
    await updateMovie(selected.id, { trailerKey: key });
    setSelected(prev => prev ? { ...prev, trailerKey: key } : null);
    toast.success("Trailer key updated!");
    setCustomTrailerInput("");
    setShowReplaceTrailerPrompt(false);
  };

  const handleRemoveTrailer = async () => {
    if (!selected) return;
    await updateMovie(selected.id, { trailerKey: "" });
    setSelected(prev => prev ? { ...prev, trailerKey: "" } : null);
    toast.success("Removed trailer link");
  };

  const handleRemoveAudio = async () => {
    if (!selected) return;
    if (globalMovieAudioInstance) {
      globalMovieAudioInstance.pause();
      globalMovieAudioInstance = null;
    }
    await updateMovie(selected.id, { themeAudioUrl: "", themeAudioTitle: "" });
    setSelected(prev => prev ? { ...prev, themeAudioUrl: "", themeAudioTitle: "" } : null);
    toast.success("Removed soundtrack theme");
  };

  useEffect(() => {
    return () => {
      if (globalMovieAudioInstance) {
        globalMovieAudioInstance.pause();
        globalMovieAudioInstance = null;
      }
    };
  }, []);

  return (
    <VaultShell>
      <div className="relative min-h-screen overflow-hidden bg-[#030208]">
        {/* 🌌 Cosmic Starfield Background */}
        <InteractiveCosmicBackground />

        {/* PERMANENT FLOATING ACTION BUTTON */}
        {!showFullView && (
          <button
            onClick={() => setAddOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-white font-black px-4 py-3.5 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-300/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-display tracking-widest uppercase pr-1">Log Media</span>
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

        {/* MAIN THEATRE GALLERY GRID */}
        <div 
          className={`relative z-10 p-8 max-w-7xl mx-auto transition-all duration-500 ease-out ${
            isProjecting ? "opacity-20 blur-sm pointer-events-none" : "opacity-100 blur-none"
          } ${showFullView ? "hidden" : "block"}`}
        >
          {/* 📌 BATCH 2: INTEGRATED HEADER SEARCH & CONTROL STRIP */}
          <header className="sticky top-4 z-30 border border-white/10 bg-black/60 backdrop-blur-3xl p-4 md:p-5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] mb-8 transition-all space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="font-display text-[10px] tracking-widest text-cyan-400 mb-0.5 animate-pulse">// SYSTEM CORE MODULE 02</div>
                <h1 className="text-2xl font-display flex items-center gap-2 text-white">
                  <Film className="h-6 w-6 text-cyan-400 animate-pulse" />
                  Movie Theatre
                </h1>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by title, actor, review, genre tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-200 outline-none focus:border-cyan-500/60 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white bg-transparent border-none cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs & Sorting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Watch State Filter Pills */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      statusFilter === "all" ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    All ({movies.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("watched")}
                    className={`px-3 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      statusFilter === "watched" ? "bg-emerald-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Watched
                  </button>
                  <button
                    onClick={() => setStatusFilter("watchlist")}
                    className={`px-3 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      statusFilter === "watchlist" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Watchlist
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-2.5 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      categoryFilter === "all" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setCategoryFilter("movie")}
                    className={`px-2.5 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      categoryFilter === "movie" ? "bg-zinc-800 text-amber-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Movies
                  </button>
                  <button
                    onClick={() => setCategoryFilter("tv")}
                    className={`px-2.5 py-1 text-[10px] font-display uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      categoryFilter === "tv" ? "bg-zinc-800 text-pink-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    TV Series
                  </button>
                </div>
              </div>

              {/* Sort Selection */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-display uppercase tracking-wider rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="recent">Recently Logged</option>
                  <option value="rating">Highest Score</option>
                  <option value="year">Newest Year</option>
                </select>
              </div>
            </div>
          </header>

          {filteredMovies.length === 0 ? (
            movies.length === 0 ? (
              <EmptyState onAdd={() => setAddOpen(true)} label="movie or TV series" />
            ) : (
              <div className="border border-dashed border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-12 text-center space-y-2">
                <p className="text-sm text-zinc-400 font-display tracking-wider">No matching records found for active filters.</p>
                <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="text-xs text-cyan-400 underline uppercase tracking-wider bg-transparent border-none cursor-pointer">
                  Reset filters
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {filteredMovies.map((m) => (
                <TheatreSpotlightCard 
                  key={m.id} 
                  movie={m}
                  onSelect={(el) => handleMovieSelect(m, el)} 
                  glowClass={getMovieGlowClass(m.rating)} 
                  hidden={isProjecting && selected?.id === m.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* CINEMATIC FULL SCREEN DETAILED THEATRE ROW CONTAINER */}
        {showFullView && selected && (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-zinc-950/80 border border-white/10 backdrop-blur-3xl rounded-2xl p-6 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
              
              <button 
                onClick={handleBackToLounge}
                className="absolute top-6 left-6 flex items-center gap-2 text-xs font-display tracking-widest text-zinc-400 hover:text-cyan-400 transition-colors group uppercase border-none bg-transparent outline-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> exit theatre
              </button>

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 mt-8">
                {/* Landing Anchor Frame */}
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

                {/* ALIGNED VERTICAL DETAILS CONSOLE */}
                <div className={`flex flex-col justify-between space-y-6 transition-all duration-300 ${isProjecting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
                  <div className="space-y-5">
                    
                    {/* Line 1: Movie Title & Watch State Toggle Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight leading-tight">{selected.title}</h2>

                      {/* 📌 BATCH 2: WATCH STATE QUICK TOGGLE SWITCH */}
                      <button
                        onClick={handleToggleWatchState}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display tracking-wider uppercase transition-all shadow-md cursor-pointer ${
                          (selected.status || "watched") === "watchlist"
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30"
                            : "bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        {(selected.status || "watched") === "watchlist" ? (
                          <>
                            <Bookmark className="h-3.5 w-3.5" /> Plan to Watch
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Watched
                          </>
                        )}
                      </button>
                    </div>

                    {/* Line 2: Year & Heat-Score Rating & Theme Track Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {selected.year && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-zinc-800 bg-zinc-900/40 rounded-md text-zinc-300 shadow-sm">
                          <Calendar className="h-3.5 w-3.5 text-cyan-500/70" /> {selected.year}
                        </span>
                      )}

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
                        <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-md text-cyan-400 text-[10px] font-mono tracking-widest uppercase shadow-sm">
                          <Volume2 className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                          <span className="max-w-[140px] truncate">🎵 {selected.themeAudioTitle || "Theme Track"}</span>
                          <div className="flex items-center gap-1 pl-1 border-l border-cyan-500/20">
                            <button onClick={() => { setEditingAudioMovie(selected); setAddOpen(true); }} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer" title="Swap Audio Track">
                              <RefreshCw className="h-3 w-3" />
                            </button>
                            <button onClick={handleRemoveAudio} className="hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer" title="Remove Audio Track">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingAudioMovie(selected); setAddOpen(true); }} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 px-2.5 py-1 rounded-md text-zinc-400 hover:text-cyan-400 text-[10px] font-mono tracking-widest uppercase transition-colors cursor-pointer">
                          <Music className="h-3 w-3" /> Add Theme Music
                        </button>
                      )}
                    </div>
                    
                    {/* Line 3: Category Genres Badges Matrix */}
                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-zinc-800 bg-zinc-900/60 text-zinc-300 px-2 py-0.5">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Line 4: Synopsis Logline */}
                    {selected.description && (
                      <div className="space-y-1">
                        <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase">// LOGLINE</div>
                        <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/20 p-4 rounded-xl border border-white/5 shadow-inner font-sans">
                          {selected.description}
                        </p>
                      </div>
                    )}

                    {/* Line 5: Reflective Review Commentary Block */}
                    {selected.review && (
                      <div className="space-y-1">
                        <div className="font-display text-[10px] tracking-widest text-cyan-400 font-bold">// PERSONAL REFLECTION REVIEW</div>
                        <p className="text-sm text-zinc-300 italic whitespace-pre-wrap border-l-2 border-cyan-400 pl-4 bg-cyan-950/5 py-2 rounded-r font-sans">
                          "{selected.review}"
                        </p>
                      </div>
                    )}

                    {/* 📺 Line 6: Direct Streaming & Trailer SWAP / REMOVE Actions */}
                    <div className="space-y-2 pt-2">
                      <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                        <Tv className="h-3 w-3 text-cyan-400" /> WATCH OPTIONS & MEDIA
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        {selected.trailerKey ? (
                          <div className="flex items-center gap-1.5">
                            {/* WATCH TRAILER */}
                            <button
                              onClick={() => {
                                if (globalMovieAudioInstance) {
                                  globalMovieAudioInstance.pause();
                                }
                                setShowTrailerModal(true);
                              }}
                              className="group/link flex items-center gap-2 bg-gradient-to-r from-red-600/20 to-rose-600/10 border border-red-500/40 hover:border-red-400 rounded-lg px-3.5 py-2 transition-all duration-200 shadow-md hover:scale-[1.02] cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                                <Play className="h-3 w-3 fill-current ml-0.5" />
                              </div>
                              <span className="text-[11px] font-display font-bold text-red-300 group-hover/link:text-white transition-colors uppercase tracking-wider">
                                Watch Trailer
                              </span>
                            </button>

                            {/* SWAP TRAILER BUTTON */}
                            <button 
                              onClick={() => setShowReplaceTrailerPrompt(true)} 
                              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer" 
                              title="Swap / Replace Trailer"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>

                            {/* REMOVE TRAILER BUTTON */}
                            <button 
                              onClick={handleRemoveTrailer} 
                              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer" 
                              title="Purge Trailer Link"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isFetchingTrailer}
                            onClick={handleInjectTrailerForSelected}
                            className="group/link flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 hover:border-red-500/40 rounded-lg px-3.5 py-2 transition-all duration-200 cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-[11px] font-display font-bold text-zinc-300 group-hover/link:text-red-400 transition-colors uppercase tracking-wider">
                              {isFetchingTrailer ? "Locating Trailer..." : "Auto-Inject Trailer"}
                            </span>
                          </button>
                        )}

                        {/* GOOGLE STREAM FINDER LINK */}
                        <a
                          href={`https://www.google.com/search?q=where+to+watch+${encodeURIComponent(selected.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link flex items-center gap-2 bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border border-cyan-500/30 hover:border-cyan-400 rounded-lg px-3.5 py-2 transition-all duration-200 shadow-md hover:scale-[1.02]"
                        >
                          <div className="w-5 h-5 rounded bg-cyan-400 text-black flex items-center justify-center font-black text-[9px] shrink-0">G</div>
                          <span className="text-[11px] font-display font-bold text-cyan-300 group-hover/link:text-white transition-colors">
                            Google Stream Finder
                          </span>
                          <ExternalLink className="h-3 w-3 text-cyan-400/70 group-hover/link:text-cyan-300 transition-colors" />
                        </a>
                      </div>
                    </div>

                  </div>

                  {/* Actions Management Tray */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/10 text-xs font-display tracking-wider"
                      onClick={() => {
                        removeMovie(selected.id);
                        handleBackToLounge();
                        toast.success("Removed archive record");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> PURGE FILM DATA
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SWAP TRAILER MODAL PROMPT */}
        {showReplaceTrailerPrompt && selected && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-sm font-display tracking-widest text-cyan-400 uppercase">Swap YouTube Trailer</h3>
              <p className="text-xs text-zinc-400">Paste a new YouTube video URL or ID below, or auto-fetch using YouTube search.</p>
              
              <input
                type="text"
                placeholder="e.g. https://www.youtube.com/watch?v=d9MyW72ELq0"
                value={customTrailerInput}
                onChange={(e) => setCustomTrailerInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-cyan-500"
              />

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleCustomTrailerSave} disabled={!customTrailerInput.trim()} className="bg-cyan-500 text-black hover:bg-cyan-600 font-bold text-xs uppercase tracking-wider">
                  Save Custom Trailer Link
                </Button>
                <Button onClick={handleInjectTrailerForSelected} disabled={isFetchingTrailer} variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs uppercase tracking-wider">
                  {isFetchingTrailer ? "Scraping..." : "Auto-Fetch & Replace via YouTube"}
                </Button>
                <Button onClick={() => setShowReplaceTrailerPrompt(false)} variant="ghost" className="text-zinc-500 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP EMBEDDED YOUTUBE TRAILER MODAL */}
        {showTrailerModal && selected?.trailerKey && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <button
                onClick={() => setShowTrailerModal(false)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 text-zinc-400 hover:text-white hover:bg-black border border-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${selected.trailerKey}?autoplay=1&rel=0`}
                title={`${selected.title} Trailer`}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

      </div>

      <AddMediaDialog 
        kind="movie" 
        open={addOpen} 
        onOpenChange={(val) => {
          setAddOpen(val);
          if (!val) setEditingAudioMovie(null);
        }}
        targetMovieToEditAudio={editingAudioMovie}
      />
    </VaultShell>
  );
}

function TheatreSpotlightCard({ movie, onSelect, glowClass, hidden }: { movie: Movie; onSelect: (el: HTMLDivElement) => void; glowClass: string; hidden: boolean }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [lightCoords, setLightCoords] = useState({ x: 50, y: 50, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLightCoords({ x, y, active: true });
  };

  const isWatchlist = movie.status === "watchlist";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLightCoords(prev => ({ ...prev, active: false }))}
      onClick={() => cardRef.current && onSelect(cardRef.current)}
      className={`group text-left flex flex-col gap-1.5 focus:outline-none cursor-pointer transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className={`relative aspect-[3/4] rounded-md border bg-zinc-950 overflow-hidden shadow-xl transition-all duration-300 ${glowClass}`}>
        <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/10 transition-colors duration-300" />

        {movie.coverUrl ? (
          <img src={movie.coverUrl} alt={movie.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-900/30"><ImageOff className="h-6 w-6" /></div>
        )}

        <div 
          style={{
            background: lightCoords.active 
              ? `radial-gradient(circle at ${lightCoords.x}% ${lightCoords.y}%, rgba(6, 182, 212, 0.15) 0%, transparent 60%)`
              : "none",
          }}
          className="absolute inset-0 pointer-events-none z-20"
        />

        {/* 📌 BATCH 2: WATCHLIST RIBBON TAG */}
        {isWatchlist && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1 bg-amber-500/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-display font-black text-black tracking-wider uppercase shadow-md">
            <Bookmark className="h-2.5 w-2.5 fill-current" /> Watchlist
          </div>
        )}

        {movie.themeAudioUrl && (
          <div className="absolute top-2 right-2 z-30 p-1 bg-black/60 backdrop-blur-md rounded border border-white/5 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
            <Volume2 className="h-3 w-3" />
          </div>
        )}
        
        {movie.rating && (() => {
          const num = parseFloat(movie.rating);
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
                ★ {movie.rating}
              </span>
            </div>
          );
        })()}
      </div>
      <div className="font-display text-xs font-semibold leading-tight line-clamp-2 text-zinc-300 group-hover:text-white transition-colors">{movie.title}</div>
    </div>
  );
}

function InteractiveCosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars: Array<{ x: number; y: number; vx: number; vy: number; radius: number; baseAlpha: number; color: string }> = [];
    const starColors = ["#06b6d4", "#3b82f6", "#818cf8", "#e0e7ff", "#f43f5e"];
    const totalStars = 100;

    for (let i = 0; i < totalStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.2,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    let tick = 0;
    const render = () => {
      tick += 0.002;
      
      ctx.fillStyle = "#030208";
      ctx.fillRect(0, 0, width, height);

      const neb1X = width * 0.3 + Math.sin(tick) * 80;
      const neb1Y = height * 0.3 + Math.cos(tick * 0.8) * 60;
      const grad1 = ctx.createRadialGradient(neb1X, neb1Y, 50, neb1X, neb1Y, width * 0.5);
      grad1.addColorStop(0, "rgba(6, 182, 212, 0.08)");
      grad1.addColorStop(0.5, "rgba(59, 130, 246, 0.03)");
      grad1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const neb2X = width * 0.7 + Math.cos(tick * 0.6) * 90;
      const neb2Y = height * 0.7 + Math.sin(tick * 0.9) * 70;
      const grad2 = ctx.createRadialGradient(neb2X, neb2Y, 50, neb2X, neb2Y, width * 0.5);
      grad2.addColorStop(0, "rgba(129, 140, 248, 0.06)");
      grad2.addColorStop(0.5, "rgba(236, 72, 153, 0.02)");
      grad2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      const mouse = mouseRef.current;
      stars.forEach((star) => {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 180;
        
        let currentAlpha = star.baseAlpha;
        let currentRadius = star.radius;

        if (dist < maxDist) {
          const factor = (1 - dist / maxDist);
          currentAlpha = Math.min(1, star.baseAlpha + factor * 0.6);
          currentRadius = star.radius + factor * 1.5;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}

function EmptyState({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <div className="border border-dashed border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-12 text-center space-y-3 relative z-10">
      <p className="text-sm text-zinc-400 font-display tracking-wider">Theatre collection has no logged records.</p>
      <Button onClick={onAdd} variant="outline" className="border-white/10 text-white hover:bg-white/10"><Plus className="h-4 w-4 mr-1.5" /> Log your first {label}</Button>
    </div>
  );
}