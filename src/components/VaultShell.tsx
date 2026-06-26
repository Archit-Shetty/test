import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useVault } from "@/lib/vault-store";
import { Gamepad2, Film, Music, Library, Terminal } from "lucide-react";

interface Props {
  children: ReactNode;
}

export function VaultShell({ children }: Props) {
  const { games, movies, playlists } = useVault();
  const location = useLocation();

  // Navigation schema configuration arrays (01, 02, 03 strings removed completely)
  const menuItems = [
    {
      path: "/games",
      label: "Games Lounge",
      icon: Gamepad2,
      color: "group-hover:text-pink-500",
      activeGlow: "shadow-[0_0_20px_rgba(236,72,153,0.25)] border-pink-500/30 text-white bg-pink-500/5",
      accentLine: "bg-pink-500 shadow-[0_0_10px_#ec4899]",
    },
    {
      path: "/movies",
      label: "Movie Theatre",
      icon: Film,
      color: "group-hover:text-cyan-400",
      activeGlow: "shadow-[0_0_20px_rgba(6,182,212,0.25)] border-cyan-500/30 text-white bg-cyan-500/5",
      accentLine: "bg-cyan-400 shadow-[0_0_10px_#22d3ee]",
    },
    {
      path: "/playlists",
      label: "Jukebox Hub",
      icon: Music,
      color: "group-hover:text-purple-400",
      activeGlow: "shadow-[0_0_20px_rgba(168,85,247,0.25)] border-purple-500/30 text-white bg-purple-500/5",
      accentLine: "bg-purple-500 shadow-[0_0_10px_#a855f7]",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#05020a] text-foreground font-sans antialiased selection:bg-primary/30">
      {/* 📡 HIGH-TECH CYBER GLASS NAVIGATION BACKPLANE */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col justify-between p-4 relative z-20 shadow-[4px_0_30px_rgba(0,0,0,0.6)]">
        
        {/* Top Block: Title Header Branding */}
        <div className="space-y-8">
          <div className="px-3 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-gradient-to-br from-pink-500 to-purple-600 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                <Library className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-black text-xs uppercase tracking-[0.2em] text-white leading-none">Media Vault</h2>
                <span className="font-display text-[9px] tracking-widest text-zinc-500 uppercase block mt-1">// PRIVATE ARCHIVE</span>
              </div>
            </div>
          </div>

          {/* Center Block: Interactive Routing Links Matrix */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center px-3 py-3 rounded-lg border text-xs font-display font-bold tracking-wider uppercase transition-all duration-300 focus:outline-none ${
                    isActive
                      ? item.activeGlow
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 hover:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-500"} ${item.color}`} />
                    <span>{item.label}</span>
                  </div>

                  {/* Shifting visual anchor accent bar injected left side */}
                  {isActive && (
                    <div className={`absolute left-0 top-1/4 h-1/2 w-[3px] rounded-r ${item.accentLine}`} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Block: HUD Live Core Data Metrics Telemetry */}
        <div className="space-y-4">
          <div className="border-t border-white/5 pt-4 px-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 font-display text-[9px] tracking-widest uppercase">
              <Terminal className="h-3 w-3 animate-pulse text-cyan-400" />
              <span>CORE STORAGE DATALINK</span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-black/40 border border-white/5 rounded p-2 text-center shadow-inner">
                <div className="text-[10px] font-mono text-zinc-500 leading-none uppercase">GMS</div>
                <div className="text-sm font-display font-black text-pink-500 mt-1 leading-none">{games.length}</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded p-2 text-center shadow-inner">
                <div className="text-[10px] font-mono text-zinc-500 leading-none uppercase">FLM</div>
                <div className="text-sm font-display font-black text-cyan-400 mt-1 leading-none">{movies.length}</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded p-2 text-center shadow-inner">
                <div className="text-[10px] font-mono text-zinc-500 kingdom leading-none uppercase">MIX</div>
                <div className="text-sm font-display font-black text-purple-400 mt-1 leading-none">{playlists.length}</div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <span className="font-mono text-[9px] tracking-wider text-zinc-600 uppercase">v1.2.0 // STABLE</span>
          </div>
        </div>

      </aside>

      {/* Main Page Layout Space Container View viewport anchor */}
      <main className="flex-1 min-w-0 relative z-10 bg-transparent overflow-y-auto">
        {children}
      </main>
    </div>
  );
}