import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VaultShell } from "@/components/VaultShell";
import { useVault, type Playlist, type Track } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Music, Plus, Link2, Download, Play, Trash2, Radio, Disc, ArrowLeft, Loader2, Music4 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "Jukebox Hub · Media Vault" },
      { name: "description", content: "Uninterrupted personal playlist aggregator and track management console." },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const { playlists, addPlaylist, removePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, playPlaylistDirectly, playTrackDirectly, currentTrack, isPlaying } = useVault();
  
  const [importUrl, setImportUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Manual song input tracking states
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/jukebox/import?url=${encodeURIComponent(importUrl.trim())}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to parse streaming playlist structure");
      }
      
      const parsedPlaylist = await res.json();
      addPlaylist(parsedPlaylist);
      setImportUrl("");
      toast.success(`Successfully imported "${parsedPlaylist.name}" with ${parsedPlaylist.tracks?.length || 0} tracks!`);
    } catch (err: any) {
      toast.error(err.message || "Network pipeline parsing timeout");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmptyPlaylist = () => {
    const name = prompt("Enter custom playlist name:");
    if (!name?.trim()) return;

    addPlaylist({
      name: name.trim(),
      description: "Custom user-curated playlist mix.",
      tracks: []
    });
    toast.success("Created empty playlist vault entry");
  };

  const handleAddManualTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylist || !manualTitle.trim() || !manualArtist.trim()) return;

    const newTrack: Omit<Track, "trackId"> = {
      title: manualTitle.trim(),
      artist: manualArtist.trim(),
      source: "manual"
    };

    await addTrackToPlaylist(selectedPlaylist.id, newTrack as Track);
    setManualTitle("");
    setManualArtist("");
    
    // Smoothly refresh current viewport panel state anchor reference references
    const updated = playlists.find(p => p.id === selectedPlaylist.id);
    if (updated) setSelectedPlaylist(updated);
    toast.success("Track injected into array array documents");
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!selectedPlaylist) return;
    await removeTrackFromPlaylist(selectedPlaylist.id, trackId);
    
    const updated = playlists.find(p => p.id === selectedPlaylist.id);
    if (updated) setSelectedPlaylist(updated);
    toast.success("Purged track link target");
  };

  return (
    <VaultShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* --- MAIN PLAYLIST INDEX DASHBOARD VIEW --- */}
        {!selectedPlaylist ? (
          <>
            <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 bg-black/40 backdrop-blur-2xl p-6 rounded-xl gap-4 shadow-xl">
              <div>
                <div className="font-display text-[10px] tracking-widest text-cyan-400 mb-1 animate-pulse">// SYSTEM CORE MODULE 03</div>
                <h1 className="text-3xl font-display flex items-center gap-3 text-white">
                  <Radio className="h-7 w-7 text-cyan-400 animate-pulse" /> Jukebox Hub
                </h1>
                <p className="text-sm text-zinc-300 mt-1">Paste entire Spotify or YouTube Mix sets to lock full background music tracking pipelines.</p>
              </div>
              <Button onClick={handleCreateEmptyPlaylist} variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-white/5 font-display tracking-wider text-xs uppercase shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Custom Mix
              </Button>
            </header>

            {/* 📥 AUTOMATED PLAYLIST IMPORT FORM BAR CONSOLE */}
            <form onSubmit={handleImport} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 flex gap-3 shadow-inner">
              <div className="relative flex-1">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input 
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="Paste Spotify Album/Playlist URL or long YouTube Mix link..." 
                  className="pl-10 bg-black/40 border-zinc-800 text-sm focus-visible:ring-cyan-500/30"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !importUrl.trim()} className="bg-cyan-500 hover:bg-cyan-600 text-black font-black font-display tracking-wider text-xs uppercase px-5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />} Import List
              </Button>
            </form>

            {/* 🗂️ GRID RENDER LISTINGS BLOCK */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {playlists.map((pl) => (
                <div 
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className="group rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-3 cursor-pointer hover:border-cyan-500/30 hover:bg-zinc-900/40 transition-all duration-300 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="aspect-square w-full rounded-lg bg-zinc-900 border border-white/5 overflow-hidden shadow-inner relative flex items-center justify-center">
                      {pl.coverUrl ? (
                        <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <Disc className="h-10 w-10 text-zinc-700 group-hover:rotate-45 transition-transform duration-500" />
                      )}
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          playPlaylistDirectly(pl);
                        }}
                        className="absolute bottom-2 right-2 p-2.5 rounded-full bg-cyan-500 text-black shadow-2xl scale-90 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
                      >
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-cyan-400 transition-colors">{pl.name}</h3>
                      <p className="text-[11px] text-zinc-500 line-clamp-1 font-medium mt-0.5">{pl.tracks?.length || 0} audio tracks cataloged</p>
                    </div>
                  </div>

                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removePlaylist(pl.id);
                      toast.success("Purged playlist vault record");
                    }}
                    className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 self-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {playlists.length === 0 && (
                <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 space-y-2">
                  <Music4 className="h-10 w-10 text-zinc-700 mx-auto stroke-[1.2]" />
                  <p className="text-sm text-zinc-400 font-display tracking-wider">No aggregated audio playlists configured in index metrics.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          
          /* --- DETAILED SINGLE PLAYLIST FOCUS ROUTINE CONSOLE --- */
          <div className="space-y-6 animate-in fade-in duration-300">
            <button 
              onClick={() => setSelectedPlaylist(null)}
              className="flex items-center gap-2 text-xs font-display tracking-widest text-zinc-400 hover:text-cyan-400 transition-colors uppercase border-none bg-transparent outline-none cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> back to juke hub
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end border-b border-white/5 pb-6">
              <div className="h-32 w-32 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center shrink-0">
                {selectedPlaylist.coverUrl ? (
                  <img src={selectedPlaylist.coverUrl} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
                ) : (
                  <Disc className="h-12 w-12 text-zinc-700" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">// INGEST STREAM DIRECT LIVE</div>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">{selectedPlaylist.name}</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">{selectedPlaylist.description}</p>
                
                <div className="pt-2 flex gap-3">
                  <Button 
                    onClick={() => playPlaylistDirectly(selectedPlaylist)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-black font-display tracking-wider text-xs uppercase px-5 h-9"
                  >
                    <Play className="h-4 w-4 fill-current mr-1.5" /> Play Entire Set
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              
              {/* 📊 TRACK LISTS DISPATCH DATA TABLE */}
              <div className="bg-zinc-950/40 border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <Table>
                  <TableHeader className="bg-black/30">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="w-12 text-center text-[10px] font-display tracking-widest uppercase text-zinc-500">Play</TableHead>
                      <TableHead className="text-[10px] font-display tracking-widest uppercase text-zinc-500">Track Detail Summary</TableHead>
                      <TableHead className="text-[10px] font-display tracking-widest uppercase text-zinc-500">Album context</TableHead>
                      <TableHead className="w-16 text-center text-[10px] font-display tracking-widest uppercase text-zinc-500">Purge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedPlaylist.tracks || []).map((track, idx) => {
                      const isCurrent = currentTrack?.trackId === track.trackId;
                      return (
                        <TableRow 
                          key={track.trackId} 
                          className={`border-white/5 transition-colors duration-150 ${isCurrent ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-white/5'}`}
                        >
                          <TableCell className="text-center">
                            <button 
                              onClick={() => playPlaylistDirectly(selectedPlaylist, idx)}
                              className={`p-2 rounded-full transition-all inline-flex items-center justify-center ${isCurrent && isPlaying ? 'bg-cyan-500 text-black scale-105' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                              <Play className="h-3 w-3 fill-current ml-0.5" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {track.coverUrl && (
                                <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded object-cover border border-white/5 bg-zinc-900 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className={`text-xs font-bold truncate ${isCurrent ? 'text-cyan-400' : 'text-zinc-200'}`}>{track.title}</div>
                                <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">{track.artist}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 font-medium max-w-[180px] truncate">
                            {track.album || "Single Track Entry"}
                          </TableCell>
                          <TableCell className="text-center">
                            <button 
                              onClick={() => handleRemoveTrack(track.trackId)}
                              className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-xs text-zinc-500 font-display tracking-wider">
                          This audio storage collection array matrix lists no individual tracks yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 🛠️ MANUAL TRACK INJECTOR CONTROL COMPARTMENT PANEL */}
              <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-display font-bold tracking-widest text-zinc-300 uppercase">// INJECT AUDIO ITEM</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Manually append singular track items to this collection stack layout block.</p>
                </div>
                <form onSubmit={handleAddManualTrack} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-display font-bold text-zinc-500 tracking-wider uppercase">Track Name</label>
                    <Input 
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. One More Hour" 
                      className="bg-black/50 border-zinc-800 text-xs h-8 focus-visible:ring-cyan-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-display font-bold text-zinc-500 tracking-wider uppercase">Artist / Group</label>
                    <Input 
                      value={manualArtist}
                      onChange={(e) => setManualArtist(e.target.value)}
                      placeholder="e.g. Tame Impala" 
                      className="bg-black/50 border-zinc-800 text-xs h-8 focus-visible:ring-cyan-500/20"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!manualTitle.trim() || !manualArtist.trim()} 
                    className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-display text-xs tracking-wider uppercase font-bold mt-2"
                  >
                    Inject Track
                  </Button>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>
    </VaultShell>
  );
}