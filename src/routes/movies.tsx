import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Movie } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Trash2, ArrowLeft, Calendar, Film, Plus, Volume2, Tv, ExternalLink, Play, X } from "lucide-react";
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

// --- AUDIO INSTANCE & HOOK CONTROL ---
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
  const { movies, removeMovie } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);

  // States for the cinematic projector transition
  const [isProjecting, setIsProjecting] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  
  // State for YouTube Trailer Modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  const targetImageRef = useRef<HTMLDivElement | null>(null);

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
    setFlyStyle({});
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
      <div className="relative min-h-screen overflow-hidden bg-[#020105]">
        {/* 🎬 Live Interactive Projector Cone & Particle Environment */}
        <InteractiveProjectorBackground />

        {/* FLYING COVER TRANSITION ELEMENT */}
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
          <header className="flex items-end justify-between mb-8 border-b border-white/10 bg-black/50 backdrop-blur-2xl p-6 rounded-xl gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
            <div>
              <div className="font-display text-[10px] tracking-widest text-cyan-400 mb-1 animate-pulse">// SYSTEM CORE MODULE 02</div>
              <h1 className="text-3xl font-display flex items-center gap-3 text-white">
                <Film className="h-7 w-7 text-cyan-400 animate-pulse" />
                Movie Theatre
              </h1>
              <p className="text-sm text-zinc-300 mt-1">Private digital archive of logged movies, TV series, personal reviews, and scores.</p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-white font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] border-none">
              <Plus className="h-4 w-4 mr-1.5" /> Log Media
            </Button>
          </header>

          {movies.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} label="movie or TV series" />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {movies.map((m) => (
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

                {/* 🛠️ ALIGNED VERTICAL DETAILS CONSOLE */}
                <div className={`flex flex-col justify-between space-y-6 transition-all duration-300 ${isProjecting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
                  <div className="space-y-5">
                    
                    {/* Line 1: Movie Title */}
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight leading-tight">{selected.title}</h2>
                    </div>

                    {/* Line 2: Year & Heat-Score Rating & Theme Track Name */}
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
                      
                      {selected.themeAudioUrl && (
                        <span className="text-cyan-400 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1.5 animate-pulse bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 rounded-md max-w-xs truncate shadow-sm">
                          <Volume2 className="h-3.5 w-3.5 shrink-0" /> 
                          🎵 {selected.themeAudioTitle || "Theme Track Synced"}
                        </span>
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

                    {/* 📺 Line 6: Direct Streaming & Trailer Triggers */}
                    <div className="space-y-2 pt-2">
                      <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                        <Tv className="h-3 w-3 text-cyan-400" /> WATCH OPTIONS & MEDIA
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        {/* 🎬 WATCH TRAILER BUTTON */}
                        {selected.trailerKey && (
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
                        )}

                        {/* 🔍 GOOGLE STREAM FINDER LINK */}
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

        {/* 🍿 POPUP EMBEDDED YOUTUBE TRAILER MODAL */}
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

      <AddMediaDialog kind="movie" open={addOpen} onOpenChange={setAddOpen} />
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

function InteractiveProjectorBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    mouseRef.current = { x: width / 2, y: height * 0.7 };

    const motes: Array<{ x: number; y: number; vx: number; vy: number; radius: number; baseAlpha: number; phase: number }> = [];
    const totalMotes = 65;

    for (let i = 0; i < totalMotes; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.2 + 0.1),
        radius: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.5 + 0.1,
        phase: Math.random() * Math.PI * 2
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
      tick += 0.005;
      
      ctx.fillStyle = "#020105";
      ctx.fillRect(0, 0, width, height);

      const sourceX = width / 2;
      const sourceY = -20; 
      const target = mouseRef.current;

      const angle = Math.atan2(target.y - sourceY, target.x - sourceX);
      const coneLength = Math.max(width, height) * 1.2;
      const coneSpread = 0.22; 

      const leftAngle = angle - coneSpread;
      const rightAngle = angle + coneSpread;

      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(sourceX + Math.cos(leftAngle) * coneLength, sourceY + Math.sin(leftAngle) * coneLength);
      ctx.lineTo(sourceX + Math.cos(rightAngle) * coneLength, sourceY + Math.sin(rightAngle) * coneLength);
      ctx.closePath();

      const lightGradient = ctx.createRadialGradient(sourceX, sourceY, 20, sourceX, sourceY, coneLength * 0.8);
      lightGradient.addColorStop(0, "rgba(6, 182, 212, 0.18)"); 
      lightGradient.addColorStop(0.3, "rgba(59, 130, 246, 0.06)"); 
      lightGradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = lightGradient;
      ctx.fill();

      motes.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        m.phase += 0.01;

        if (m.y < 0) { m.y = height; m.x = Math.random() * width; }
        if (m.x < 0) m.x = width;
        if (m.x > width) m.x = 0;

        const moteAngle = Math.atan2(m.y - sourceY, m.x - sourceX);
        let diff = moteAngle - angle;
        
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const isInsideCone = Math.abs(diff) < coneSpread;
        
        const sineWaveAlpha = m.baseAlpha + Math.sin(m.phase) * 0.15;
        const targetAlpha = isInsideCone ? sineWaveAlpha : sineWaveAlpha * 0.12;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        
        ctx.fillStyle = isInsideCone 
          ? `rgba(207, 250, 254, ${targetAlpha})`
          : `rgba(59, 130, 246, ${targetAlpha * 0.4})`;
          
        ctx.fill();
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