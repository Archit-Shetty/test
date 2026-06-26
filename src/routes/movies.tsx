import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Movie } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, ExternalLink, Check, Film, Plus, ImageOff, Trash2, ArrowLeft, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movie Theatre · Media Vault" },
      { name: "description", content: "Private digital archive of logged movies, personal reviews, and scores." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { movies, removeMovie } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);

  // States for the cinematic projector transition
  const [isProjecting, setIsProjecting] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  
  const targetImageRef = useRef<HTMLDivElement | null>(null);

  const getMovieGlowClass = (ratingStr: string) => {
    if (!ratingStr) return "group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] border-white/10";
    const num = parseFloat(ratingStr);
    if (isNaN(num)) return "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] border-white/10";
    
    if (num >= 9) return "group-hover:shadow-[0_0_35px_rgba(234,179,8,0.45)] border-amber-500/30"; 
    if (num >= 7) return "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.45)] border-cyan-500/30"; 
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
    setShowFullView(false);
    setSelected(null);
    setFlyStyle({});
  };

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
              <p className="text-sm text-zinc-300 mt-1">Private digital archive of logged movies, personal reviews, and scores.</p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-white font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] border-none">
              <Plus className="h-4 w-4 mr-1.5" /> Log Movie
            </Button>
          </header>

          {movies.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} label="movie" />
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
                className="absolute top-6 left-6 flex items-center gap-2 text-xs font-display tracking-widest text-zinc-400 hover:text-cyan-400 transition-colors group uppercase"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> exit theatre
              </button>

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 mt-8">
                {/* Landing Anchor Frame */}
                <div 
                  ref={targetImageRef}
                  className="w-[240px] h-[320px] rounded-xl border border-white/10 bg-zinc-950 overflow-hidden shadow-[0_2px_25px_rgba(0,0,0,0.8)]"
                >
                  {!isProjecting && (
                    selected.coverUrl ? (
                      <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover animate-fade-in duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 bg-zinc-900"><ImageOff className="h-10 w-10" /></div>
                    )
                  )}
                </div>

                {/* Info Text Meta Compartment */}
                <div className={`flex flex-col justify-between space-y-6 transition-all duration-300 ${isProjecting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline gap-3.5">
                      <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight">{selected.title}</h2>
                      {selected.year && (
                        <span className="flex items-center gap-1 text-sm font-mono text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 text-cyan-500/70" /> {selected.year}
                        </span>
                      )}
                      {selected.rating && (
                        <span className="px-2 py-0.5 text-xs font-display font-black tracking-wider bg-gradient-to-r from-cyan-400 to-blue-600 text-white rounded-md shadow-md shadow-cyan-500/10">
                          ★ SCORE: {selected.rating}
                        </span>
                      )}
                    </div>
                    
                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-zinc-800 bg-zinc-900/40 text-zinc-300 px-2 py-0.5">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {selected.description && (
                      <div className="space-y-1">
                        <div className="font-display text-[9px] tracking-widest text-zinc-500 uppercase">// LOGLINE</div>
                        <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/20 p-4 rounded-xl border border-white/5 shadow-inner">
                          {selected.description}
                        </p>
                      </div>
                    )}

                    {selected.review && (
                      <div className="space-y-1">
                        <div className="font-display text-[10px] tracking-widest text-cyan-400 font-bold">// PERSONAL REVIEW</div>
                        <p className="text-sm text-zinc-300 italic whitespace-pre-wrap border-l-2 border-cyan-400 pl-4 bg-cyan-950/5 py-2 rounded-r">
                          "{selected.review}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Management Tray */}
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-white/5">
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
      </div>

      <AddMediaDialog kind="movie" open={addOpen} onOpenChange={setAddOpen} />
    </VaultShell>
  );
}

/**
 * 💡 CINEMA CARD: Spotlight Vignette Overlay
 */
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

        {/* Shifting Spotlight Lens Flare */}
        <div 
          style={{
            background: lightCoords.active 
              ? `radial-gradient(circle at ${lightCoords.x}% ${lightCoords.y}%, rgba(6, 182, 212, 0.15) 0%, transparent 60%)`
              : "none",
          }}
          className="absolute inset-0 pointer-events-none z-20"
        />
        
        {movie.rating && (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <span className="px-1.5 py-0.5 text-[9px] font-display font-bold tracking-wider bg-zinc-950/90 text-cyan-400 border border-cyan-500/20 rounded shadow-md inline-block">
              ★ {movie.rating}
            </span>
          </div>
        )}
      </div>
      <div className="font-display text-xs font-semibold leading-tight line-clamp-2 text-zinc-300 group-hover:text-white transition-colors">{movie.title}</div>
    </div>
  );
}

/**
 * 📽️ INTERACTIVE PROJECTOR BACKGROUND COMPONENT
 * Renders an active cinema environment. The lightcone originates from top-center 
 * and pans across the screen layout to directly follow the user's cursor vectors,
 * dynamically texturing volumetric smoke and high-density silver halide dust particles.
 */
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

    // Default mouse coordinates initialization to center viewport frame
    mouseRef.current = { x: width / 2, y: height * 0.7 };

    // Initialize cinema projector dust motes
    const motes: Array<{ x: number; y: number; vx: number; vy: number; radius: number; baseAlpha: number; phase: number }> = [];
    const totalMotes = 65;

    for (let i = 0; i < totalMotes; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.2 + 0.1), // Float up towards warmth
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
      
      // Clean deep dark backing plate layout
      ctx.fillStyle = "#020105";
      ctx.fillRect(0, 0, width, height);

      const sourceX = width / 2;
      const sourceY = -20; // Origin point of structural theater projector lamp element
      const target = mouseRef.current;

      // 1. 📽️ VOLUMETRIC PROJECTOR BEAM DRAWING
      // Creates a sweeping cone out from the top-center directly to the user's mouse position
      const angle = Math.atan2(target.y - sourceY, target.x - sourceX);
      const coneLength = Math.max(width, height) * 1.2;
      const coneSpread = 0.22; // Radians wide

      const leftAngle = angle - coneSpread;
      const rightAngle = angle + coneSpread;

      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(sourceX + Math.cos(leftAngle) * coneLength, sourceY + Math.sin(leftAngle) * coneLength);
      ctx.lineTo(sourceX + Math.cos(rightAngle) * coneLength, sourceY + Math.sin(rightAngle) * coneLength);
      ctx.closePath();

      // Dual-gradient masking structure to simulate realistic volumetric lighting drop-off
      const lightGradient = ctx.createRadialGradient(sourceX, sourceY, 20, sourceX, sourceY, coneLength * 0.8);
      lightGradient.addColorStop(0, "rgba(6, 182, 212, 0.18)"); // Neon cyan lamp core
      lightGradient.addColorStop(0.3, "rgba(59, 130, 246, 0.06)"); // Deep movie blue bleed
      lightGradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = lightGradient;
      ctx.fill();

      // 2. 💨 INTERACTIVE SMOKE EDDIES
      // Layers procedural sinus-wave highlights across the beam vector paths
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let j = 1; j <= 3; j++) {
        const offsetTick = tick * (0.4 / j);
        const swirlX = sourceX + (target.x - sourceX) * 0.5 + Math.sin(offsetTick) * 120;
        const swirlY = sourceY + (target.y - sourceY) * 0.5 + Math.cos(offsetTick * 0.8) * 80;

        const smokeGrad = ctx.createRadialGradient(swirlX, swirlY, 10, swirlX, swirlY, 250 * j);
        smokeGrad.addColorStop(0, `rgba(6, 182, 212, ${0.03 / j})`);
        smokeGrad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = smokeGrad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      // 3. ✨ DUST MOTES DYNAMICS
      // Only lights up particles that are physically inside the projector's light cone geometry path
      motes.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        m.phase += 0.01;

        // Reset tracking positions if boundary loop limits trigger
        if (m.y < 0) { m.y = height; m.x = Math.random() * width; }
        if (m.x < 0) m.x = width;
        if (m.x > width) m.x = 0;

        // Check math modeling boundaries to see if item intersects our polygon lightcone
        const moteAngle = Math.atan2(m.y - sourceY, m.x - sourceX);
        let diff = moteAngle - angle;
        
        // Normalize radian deviations
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const isInsideCone = Math.abs(diff) < coneSpread;
        
        // Compute brightness multiplier tracking if inside cone path or not
        const sineWaveAlpha = m.baseAlpha + Math.sin(m.phase) * 0.15;
        const targetAlpha = isInsideCone ? sineWaveAlpha : sineWaveAlpha * 0.12;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        
        // High intensity silver tint within lighting cones, dark blue ghosting elsewhere
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