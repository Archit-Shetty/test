import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Game } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Check, Gamepad2, Plus, ImageOff, Trash2, ArrowLeft, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games Lounge · Media Vault" },
      { name: "description", content: "Private archive of game entries with covers, magnet links and mirrors." },
    ],
  }),
  component: GamesPage,
});

// 🎧 Centralized player reference to seamlessly manage crossing fades and prevent overlapping audio streams
let globalThemeAudioInstance: HTMLAudioElement | null = null;

function playInstantThemePlayer(url: string | undefined) {
  if (globalThemeAudioInstance) {
    globalThemeAudioInstance.pause();
    globalThemeAudioInstance = null;
  }
  if (!url) return;

  const audio = new Audio(url);
  audio.volume = 0.0; // Start at full silence for a clean fade-in sequence
  audio.play().catch(() => console.log("Interactivity audio click interaction token required"));
  globalThemeAudioInstance = audio;

  // Smoothly scale audio gain up safely behind layout effects over 1 second
  let currentVolume = 0;
  const fadeInterval = setInterval(() => {
    if (!globalThemeAudioInstance || globalThemeAudioInstance !== audio) {
      clearInterval(fadeInterval);
      return;
    }
    currentVolume = Math.min(currentVolume + 0.05, 0.28); // Lock ambient backplane layer at 28% max gain volume
    audio.volume = currentVolume;
    if (currentVolume >= 0.28) clearInterval(fadeInterval);
  }, 50);

  // Auto fade-out and stop track cleanly after exactly 15 seconds
  setTimeout(() => {
    if (globalThemeAudioInstance === audio) {
      let fadeOutVol = audio.volume;
      const fadeOutInterval = setInterval(() => {
        fadeOutVol = Math.max(fadeOutVol - 0.04, 0);
        if (audio) audio.volume = fadeOutVol;
        if (fadeOutVol <= 0) {
          clearInterval(fadeOutInterval);
          audio.pause();
          if (globalThemeAudioInstance === audio) globalThemeAudioInstance = null;
        }
      }, 50);
    }
  }, 15000);
}

function GamesPage() {
  const { games, removeGame } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Game | null>(null);
  const [copied, setCopied] = useState(false);

  // States for the cinematic direct-flight expansion sequence
  const [isJumping, setIsJumping] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  
  const globalStateRef = useRef({ forceHyperDrive: false });
  const targetImageRef = useRef<HTMLDivElement | null>(null);

  const copyMagnet = async (magnet: string) => {
    try {
      await navigator.clipboard.writeText(magnet);
      setCopied(true);
      toast.success("Magnet copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard blocked");
    }
  };

  // 🚀 PIXEL-PERFECT DIRECT FLIGHT MATCHING ENGINE + INTEGRATED AUDIO TRIGGER
  const handleGameSelect = (game: Game, cardElement: HTMLDivElement) => {
    setSelected(game);
    
    // 1. Capture original starting grid position boundaries
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

    setIsJumping(true);
    globalStateRef.current.forceHyperDrive = true;

    // 2. Mount full view panel silently behind layers to render the landing placeholder destination
    setShowFullView(true);

    // 🎧 ACTIVATE SOUNDTRACK SNAPSHOT ON CLICK INSTANTLY (Matches Movie functionality)
    if (game.themeAudioUrl) {
      playInstantThemePlayer(game.themeAudioUrl);
    }

    // 3. Wait exactly one frame for DOM layout pass engine to paint the target ref node
    requestAnimationFrame(() => {
      setTimeout(() => {
        const targetRef = targetImageRef.current;
        if (targetRef) {
          // Read the precise, live destination positions rendered on screen
          const endRect = targetRef.getBoundingClientRect();
          
          setFlyStyle(prev => ({
            ...prev,
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)', // Flawless physics-based layout curve
            top: `${endRect.top}px`,
            left: `${endRect.left}px`,
            width: `${endRect.width}px`,
            height: `${endRect.height}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }));
        }
      }, 30); // Failsafe delay ensuring components mount completely
    });

    // 4. Terminate the placeholder overlay layer cleanly on touchdown landing impact
    setTimeout(() => {
      setIsJumping(false);
      globalStateRef.current.forceHyperDrive = false;
    }, 730);
  };

  const handleBackToLounge = () => {
    // Stop soundtrack cleanly when hitting back button to exit detailed screen container
    if (globalThemeAudioInstance) {
      globalThemeAudioInstance.pause();
      globalThemeAudioInstance = null;
    }
    setShowFullView(false);
    setSelected(null);
    setFlyStyle({});
  };

  // Ensure active players clean up when tearing down component tree paths
  useEffect(() => {
    return () => {
      if (globalThemeAudioInstance) {
        globalThemeAudioInstance.pause();
        globalThemeAudioInstance = null;
      }
    };
  }, []);

  const getRatingGlowClass = (ratingStr: string) => {
    if (!ratingStr) return "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] border-white/10";
    const num = parseFloat(ratingStr);
    if (isNaN(num)) return "group-hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] border-white/10";
    
    if (num >= 9) return "group-hover:shadow-[0_0_35px_rgba(244,63,94,0.7)] border-rose-500/40"; 
    if (num >= 7) return "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] border-cyan-500/40"; 
    return "group-hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] border-purple-500/40"; 
  };

  return (
    <VaultShell>
      <div className="relative min-h-screen overflow-hidden bg-[#030107]">
        {/* Advanced Interactive Hyper-Warp Background */}
        <HyperShockwaveBackground globalStateRef={globalStateRef} />

        {/* 🚀 SMOOTH DIRECT-FLIGHT LAYER */}
        {isJumping && selected && (
          <div style={flyStyle} className="rounded-xl border border-white/20 bg-black overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-none">
            {selected.coverUrl ? (
              <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 bg-zinc-900/50"><ImageOff className="h-6 w-6" /></div>
            )}
          </div>
        )}

        {/* LOUNGE GRID VIEW PANEL */}
        <div 
          className={`relative z-10 p-8 max-w-7xl mx-auto transition-all duration-500 ease-out ${
            isJumping ? "opacity-20 blur-sm pointer-events-none" : "opacity-100 blur-none"
          } ${showFullView ? "hidden" : "block"}`}
        >
          <header className="flex items-end justify-between mb-8 border-b border-white/10 bg-black/40 backdrop-blur-2xl p-6 rounded-xl gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
            <div>
              <div className="font-display text-[10px] tracking-widest text-cyan-400 mb-1 animate-pulse">// KINETIC HYPER-DRIVE ROUTER</div>
              <h1 className="text-3xl font-display flex items-center gap-3 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                <Gamepad2 className="h-7 w-7 text-pink-500 animate-spin" style={{ animationDuration: '4s' }} />
                Games Lounge
              </h1>
              <p className="text-sm text-zinc-300 mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">Archived titles with scores, mirrors and seed hashes.</p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 text-white font-black shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] border-none">
              <Plus className="h-4 w-4 mr-1.5" /> Add Game
            </Button>
          </header>

          {games.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} label="game" />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {games.map((g) => (
                <HolographicTiltCard 
                  key={g.id} 
                  game={g}
                  onSelect={(el) => handleGameSelect(g, el)} 
                  glowClass={getRatingGlowClass(g.rating)} 
                  hidden={isJumping && selected?.id === g.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* 📺 FULL SCREEN CINEMATIC DETAILS VIEW MODE */}
        {showFullView && selected && (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-black/60 border border-white/10 backdrop-blur-3xl rounded-2xl p-6 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
              
              {/* Back Button */}
              <button 
                onClick={handleBackToLounge}
                className="absolute top-6 left-6 flex items-center gap-2 text-xs font-display tracking-widest text-zinc-400 hover:text-primary transition-colors group uppercase border-none bg-transparent outline-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> back to lounge
              </button>

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 mt-8">
                {/* Immersive Cover Frame container acting as live target anchor */}
                <div 
                  ref={targetImageRef}
                  className="w-[240px] h-[320px] rounded-xl border border-white/10 bg-background overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                  {/* Keep image hidden while flight is in progress to avoid double-image overlay asset stutters */}
                  {!isJumping && (
                    selected.coverUrl ? (
                      <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover animate-fade-in duration-200" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-900"><ImageOff className="h-10 w-10" /></div>
                    )
                  )}
                </div>

                {/* Meta Details Layout Content */}
                <div className={`flex flex-col justify-between space-y-6 transition-all duration-300 ${isJumping ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight">{selected.title}</h2>
                      {selected.rating && (
                        <span className="px-2 py-0.5 text-xs font-display font-black tracking-wider bg-gradient-to-r from-pink-500 to-cyan-500 text-white rounded-md shadow-md shadow-pink-500/10">
                          ★ SCORE: {selected.rating}
                        </span>
                      )}
                      {selected.themeAudioUrl && (
                        <span className="text-pink-400 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1.5 animate-pulse bg-pink-950/30 border border-pink-500/20 px-2 py-0.5 rounded">
                          <Volume2 className="h-3 w-3" /> Audio Linked
                        </span>
                      )}
                    </div>
                    
                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-zinc-700 bg-zinc-900/60 text-zinc-300 px-2 py-0.5">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {selected.description && (
                      <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/20 p-4 rounded-xl border border-white/5 shadow-inner">
                        {selected.description}
                      </p>
                    )}

                    {selected.notes && (
                      <div className="space-y-1">
                        <div className="font-display text-[10px] tracking-widest text-cyan-400 font-bold">// SYSTEM CONFIG NOTES</div>
                        <p className="text-xs text-zinc-400 whitespace-pre-wrap border-l-2 border-cyan-400 pl-4 bg-cyan-950/5 py-2 rounded-r">
                          {selected.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar Panel */}
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-white/5">
                    <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 bg-zinc-950/40 px-6 font-display tracking-wide text-xs" disabled={!selected.magnet} onClick={() => copyMagnet(selected.magnet)}>
                      {copied ? <Check className="h-4 w-4 mr-2 text-emerald-400" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? "COPIED VALUE!" : "COPY REPACK MAGNET"}
                    </Button>
                    
                    {selected.mirrorUrl && (
                      <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 bg-zinc-950/40 px-6 font-display tracking-wide text-xs" asChild>
                        <a href={selected.mirrorUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" /> OPEN DIRECT MIRROR
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/10 ml-auto self-center text-xs font-display tracking-wider"
                      onClick={() => {
                        removeGame(selected.id);
                        handleBackToLounge();
                        toast.success("Removed from vault");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> DELETE ENTRY
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <AddMediaDialog kind="game" open={addOpen} onOpenChange={setAddOpen} />
    </VaultShell>
  );
}

function HolographicTiltCard({ game, onSelect, glowClass, hidden }: { game: Game; onSelect: (el: HTMLDivElement) => void; glowClass: string; hidden: boolean }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y, active: true });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCoords({ x: 0, y: 0, active: false })}
      onClick={() => cardRef.current && onSelect(cardRef.current)}
      style={{ perspective: "1000px" }}
      className={`group text-left flex flex-col gap-1.5 focus:outline-none cursor-pointer transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div 
        style={{
          transform: `rotateX(${coords.active ? coords.y * -20 : 0}deg) rotateY(${coords.active ? coords.x * 20 : 0}deg) scale(${coords.active ? 1.05 : 1})`,
          transition: coords.active ? "none" : "transform 0.5s ease"
        }}
        className={`relative aspect-[3/4] rounded-md border bg-black/60 backdrop-blur-md overflow-hidden shadow-xl transition-all duration-300 ${glowClass}`}
      >
        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 bg-zinc-900/50"><ImageOff className="h-6 w-6" /></div>
        )}

        <div 
          style={{
            background: coords.active 
              ? `radial-gradient(circle at ${(coords.x + 0.5) * 100}% ${(coords.y + 0.5) * 100}%, rgba(255,255,255,0.15) 0%, rgba(6,182,212,0.1) 30%, rgba(244,63,94,0.1) 70%, transparent 100%)`
              : "none",
            mixBlendMode: "color-dodge"
          }}
          className="absolute inset-0 pointer-events-none z-20"
        />

        {/* Floating Indicator for active track content sets */}
        {game.themeAudioUrl && (
          <div className="absolute top-2 right-2 z-30 p-1 bg-black/60 backdrop-blur-md rounded border border-white/5 text-pink-400 opacity-60 group-hover:opacity-100 transition-opacity">
            <Volume2 className="h-3 w-3" />
          </div>
        )}
        
        {game.rating && (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <span className="px-1.5 py-0.5 text-[9px] font-display font-black tracking-wider bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white border border-white/20 rounded shadow-lg inline-block backdrop-blur-[2px]">
              ★ {game.rating}
            </span>
          </div>
        )}
      </div>
      <div className="font-display text-xs font-bold leading-tight line-clamp-2 text-zinc-200 group-hover:text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors">{game.title}</div>
    </div>
  );
}

function HyperShockwaveBackground({ globalStateRef }: { globalStateRef: React.MutableRefObject<{ forceHyperDrive: boolean }> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef({
    mouseX: 0, mouseY: 0, lastMouseX: 0, lastMouseY: 0,
    velocity: 1, targetVelocity: 1
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    contextRef.current = { mouseX: width / 2, mouseY: height / 2, lastMouseX: width / 2, lastMouseY: height / 2, velocity: 1, targetVelocity: 1 };

    const stars: Array<{ x: number; y: number; z: number; size: number; baseSpeed: number; color: string }> = [];
    const totalStars = 220;
    const colors = ["#f43f5e", "#06b6d4", "#a855f7", "#ec4899", "#3b82f6", "#10b981"];

    for (let i = 0; i < totalStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() * 1.5 + 0.5,
        baseSpeed: Math.random() * 1.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const state = contextRef.current;
      state.lastMouseX = state.mouseX;
      state.lastMouseY = state.mouseY;
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;

      const dist = Math.hypot(state.mouseX - state.lastMouseX, state.mouseY - state.lastMouseY);
      state.targetVelocity = Math.min(6, 1 + dist * 0.08);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.fillStyle = "rgba(4, 2, 8, 0.2)"; 
      ctx.fillRect(0, 0, width, height);

      const state = contextRef.current;
      
      if (globalStateRef.current.forceHyperDrive) {
        state.velocity = 28; 
      } else {
        state.velocity += (state.targetVelocity - state.velocity) * 0.05;
        state.targetVelocity += (1 - state.targetVelocity) * 0.03;
      }

      const originX = (state.mouseX - width / 2) * 0.12;
      const originY = (state.mouseY - height / 2) * 0.12;

      stars.forEach((s) => {
        s.z -= s.baseSpeed * state.velocity;

        if (s.z <= 0) {
          s.z = width;
          s.x = Math.random() * width - width / 2;
          s.y = Math.random() * height - height / 2;
        }

        const px = (s.x - originX) * (width / s.z) + width / 2;
        const py = (s.y - originY) * (height / s.z) + height / 2;

        const prevZ = s.z + s.baseSpeed * state.velocity * 2.5;
        const ppx = (s.x - originX) * (width / prevZ) + width / 2;
        const ppy = (s.y - originY) * (height / prevZ) + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ppx, ppy);
          
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size * (1 - s.z / width) * 2;
          ctx.lineCap = "round";
          ctx.stroke();
        }
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
    <div className="border border-dashed border-white/10 bg-black/50 backdrop-blur-md rounded-xl p-12 text-center space-y-3 relative z-10">
      <p className="text-sm text-zinc-400 font-display tracking-wider">Vault is completely unpopulated.</p>
      <Button onClick={onAdd} variant="outline" className="border-white/10 text-white hover:bg-white/10"><Plus className="h-4 w-4 mr-1.5" /> Add your first {label}</Button>
    </div>
  );
}