import { useState } from "react";
import { Difficulty, GameProgress, GameSettings, difficultyConfig } from "./store";

interface Props {
  settings: GameSettings;
  progress: GameProgress;
  onChange: (s: GameSettings) => void;
  onPlay: () => void;
  onReset: () => void;
}

export default function Menu({ settings, progress, onChange, onPlay, onReset }: Props) {
  const [tab, setTab] = useState<"play" | "options" | "how">("play");

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: settings.bgColor }}>
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span style={{ color: settings.playerColor }}>CUBE</span> RUNNER 3D
          </h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">Endless runner · React + Three.js</p>
        </header>

        <div className="bg-card/80 backdrop-blur border border-border rounded-3xl p-6 md:p-8 shadow-2xl">
          <nav className="flex gap-2 mb-6 font-mono text-sm">
            {(["play", "options", "how"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl transition ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
              >
                {t === "play" ? "Jugar" : t === "options" ? "Opciones" : "Cómo jugar"}
              </button>
            ))}
          </nav>

          {tab === "play" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-3">Nivel de dificultad</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(difficultyConfig) as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => onChange({ ...settings, difficulty: d })}
                      className={`rounded-xl p-4 border-2 transition text-center ${settings.difficulty === d ? "border-primary bg-primary/15" : "border-border bg-muted hover:bg-muted/70"}`}
                    >
                      <div className="font-bold">{difficultyConfig[d].label}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">x{difficultyConfig[d].baseSpeed}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <Stat label="Récord" value={progress.bestScore} />
                <Stat label="Último" value={progress.lastScore} />
                <Stat label="Partidas" value={progress.totalRuns} />
              </div>

              <button
                onClick={onPlay}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-5 text-xl font-bold hover:opacity-90 transition shadow-lg shadow-primary/30"
              >
                ▶ Iniciar partida
              </button>
            </div>
          )}

          {tab === "options" && (
            <div className="space-y-5">
              <ColorRow label="Color del personaje" value={settings.playerColor} onChange={(v) => onChange({ ...settings, playerColor: v })} />
              <ColorRow label="Color de fondo" value={settings.bgColor} onChange={(v) => onChange({ ...settings, bgColor: v })} />
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Separación entre niveles: <span className="text-foreground font-mono">{settings.chunkSpacing} u</span>
                </label>
                <input
                  type="range" min={12} max={40} step={2}
                  value={settings.chunkSpacing}
                  onChange={(e) => onChange({ ...settings, chunkSpacing: Number(e.target.value) })}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
              <button onClick={onReset} className="w-full bg-muted hover:bg-destructive/80 rounded-xl py-3 font-mono text-sm transition">
                Reiniciar progreso guardado
              </button>
            </div>
          )}

          {tab === "how" && (
            <ul className="space-y-3 text-sm">
              <Row k="← →" v="Cambiar de carril (eje X)" />
              <Row k="↑ / Espacio" v="Saltar (eje Y)" />
              <Row k="Avance" v="Automático hacia adelante (eje Z)" />
              <Row k="Touch" v="Swipe horizontal o vertical en móvil" />
              <Row k="⚡ Boost" v="Recoge cristales naranjas: x1.8 por menos de 3s" />
              <Row k="Niveles" v="Se generan al infinito, dificultad creciente" />
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
          Tarea — Diseño de Juegos · Web 3D demo
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm">{label}</label>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-border" />
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span className="font-mono text-xs bg-muted px-2 py-1 rounded min-w-24 text-center">{k}</span>
      <span className="text-muted-foreground">{v}</span>
    </li>
  );
}
