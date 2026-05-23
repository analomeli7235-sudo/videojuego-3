import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { difficultyConfig, GameSettings, GameProgress } from "./store";

const LANES = [-2.2, 0, 2.2];
const GRAVITY = -28;
const JUMP_V = 11;

interface Obstacle { id: number; x: number; z: number; kind: "block" | "boost"; }
interface Chunk { id: number; z: number; obstacles: Obstacle[]; }

let oid = 0;
let cid = 0;

function buildChunk(zStart: number, density: number, spacing: number): Chunk {
  const obstacles: Obstacle[] = [];
  const slots = 5;
  for (let i = 0; i < slots; i++) {
    const z = zStart - (i * (spacing / slots));
    if (Math.random() < density) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      obstacles.push({ id: oid++, x: lane, z, kind: "block" });
    }
    if (Math.random() < 0.12) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      if (!obstacles.find(o => o.z === z && o.x === lane)) {
        obstacles.push({ id: oid++, x: lane, z, kind: "boost" });
      }
    }
  }
  return { id: cid++, z: zStart, obstacles };
}

interface SceneProps {
  settings: GameSettings;
  onGameOver: (score: number) => void;
  onScoreChange: (s: number) => void;
  onBoostChange: (active: boolean, remaining: number) => void;
  onSpeedChange: (s: number) => void;
}

function Scene({ settings, onGameOver, onScoreChange, onBoostChange, onSpeedChange }: SceneProps) {
  const cfg = difficultyConfig[settings.difficulty];
  const player = useRef<THREE.Mesh>(null!);
  const camera = useThree((s) => s.camera);

  // mutable game state in refs
  const state = useRef({
    laneIdx: 1,
    targetX: 0,
    y: 0.5,
    vy: 0,
    z: 0,
    speed: cfg.baseSpeed,
    score: 0,
    boostUntil: 0,
    alive: true,
    chunks: [
      buildChunk(-10, 0, settings.chunkSpacing),
      buildChunk(-10 - settings.chunkSpacing, cfg.obstacleDensity, settings.chunkSpacing),
      buildChunk(-10 - settings.chunkSpacing * 2, cfg.obstacleDensity, settings.chunkSpacing),
      buildChunk(-10 - settings.chunkSpacing * 3, cfg.obstacleDensity, settings.chunkSpacing),
    ] as Chunk[],
  });

  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  // input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state.current.alive) return;
      if (e.key === "ArrowLeft" || e.key === "a") moveLane(-1);
      else if (e.key === "ArrowRight" || e.key === "d") moveLane(1);
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") jump();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // touch / swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      if (!state.current.alive) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) moveLane(dx > 0 ? 1 : -1);
      } else if (dy < -30) jump();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  function moveLane(dir: number) {
    const s = state.current;
    s.laneIdx = Math.max(0, Math.min(2, s.laneIdx + dir));
    s.targetX = LANES[s.laneIdx];
  }
  function jump() {
    const s = state.current;
    if (s.y <= 0.51) s.vy = JUMP_V;
  }

  useFrame((_, dt) => {
    const s = state.current;
    if (!s.alive) return;
    const d = Math.min(dt, 0.05);

    // difficulty curve
    s.speed += cfg.speedRamp * d;
    const boostActive = performance.now() < s.boostUntil;
    const effectiveSpeed = boostActive ? s.speed * 1.8 : s.speed;
    onSpeedChange(effectiveSpeed);
    onBoostChange(boostActive, boostActive ? (s.boostUntil - performance.now()) / 1000 : 0);

    // forward (Z) movement
    s.z -= effectiveSpeed * d;

    // lateral lerp (X)
    const px = player.current.position.x;
    player.current.position.x = px + (s.targetX - px) * Math.min(1, d * 14);

    // vertical (Y)
    s.vy += GRAVITY * d;
    s.y += s.vy * d;
    if (s.y < 0.5) { s.y = 0.5; s.vy = 0; }
    player.current.position.y = s.y;

    // camera follows X and Z, fixed Y
    camera.position.x = player.current.position.x * 0.35;
    camera.position.z = s.z + 9;
    camera.position.y = 5;
    camera.lookAt(player.current.position.x * 0.2, 1, s.z - 4);

    // score
    s.score += effectiveSpeed * d * 1.4;
    onScoreChange(Math.floor(s.score));

    // chunk management
    const lastChunk = s.chunks[s.chunks.length - 1];
    if (s.z - 30 < lastChunk.z - settings.chunkSpacing) {
      s.chunks.push(buildChunk(lastChunk.z - settings.chunkSpacing, cfg.obstacleDensity, settings.chunkSpacing));
    }
    if (s.chunks[0].z > s.z + 15) {
      s.chunks.shift();
    }

    // collisions
    for (const c of s.chunks) {
      for (const o of c.obstacles) {
        if (Math.abs(o.z - s.z) < 0.8 && Math.abs(o.x - player.current.position.x) < 1.1) {
          if (o.kind === "boost") {
            o.kind = "block"; // consume visually next render
            (o as Obstacle & { taken?: boolean }).taken = true;
            s.boostUntil = performance.now() + 2800;
          } else if (s.y < 1.4) {
            s.alive = false;
            onGameOver(Math.floor(s.score));
            return;
          }
        }
      }
    }
    rerender();
  });

  const allObstacles = useMemo(() => state.current.chunks.flatMap(c => c.obstacles), [state.current.chunks.length]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight args={["#bcd4ff", "#2a1a4a", 0.4]} />
      <fog attach="fog" args={[settings.bgColor, 25, 75]} />

      {/* track */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, state.current.z]} receiveShadow>
        <planeGeometry args={[10, 400]} />
        <meshStandardMaterial color="#2a2547" />
      </mesh>
      {/* lane stripes */}
      {[-1.1, 1.1].map((x, i) => (
        <mesh key={i} position={[x, 0.01, state.current.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 400]} />
          <meshBasicMaterial color="#6c5ce7" />
        </mesh>
      ))}

      {/* player */}
      <mesh ref={player} position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={settings.playerColor} emissive={settings.playerColor} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>

      {/* obstacles */}
      {allObstacles.map(o => {
        const taken = (o as Obstacle & { taken?: boolean }).taken;
        if (taken) return null;
        if (o.kind === "boost") {
          return (
            <mesh key={o.id} position={[o.x, 1.2, o.z]} rotation={[0.4, performance.now() / 600, 0]}>
              <octahedronGeometry args={[0.5]} />
              <meshStandardMaterial color="#ffb84d" emissive="#ff6a00" emissiveIntensity={1.2} />
            </mesh>
          );
        }
        return (
          <mesh key={o.id} position={[o.x, 0.6, o.z]} castShadow>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color="#ff3b6b" emissive="#aa0030" emissiveIntensity={0.4} roughness={0.5} />
          </mesh>
        );
      })}
    </>
  );
}

interface GameProps {
  settings: GameSettings;
  progress: GameProgress;
  onExit: (finalScore: number) => void;
}

export default function Game({ settings, progress, onExit }: GameProps) {
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [boost, setBoost] = useState<{ active: boolean; remaining: number }>({ active: false, remaining: 0 });
  const [over, setOver] = useState<{ done: boolean; final: number }>({ done: false, final: 0 });

  return (
    <div className="fixed inset-0" style={{ background: settings.bgColor }}>
      <Canvas shadows camera={{ position: [0, 5, 9], fov: 60 }} style={{ background: settings.bgColor }}>
        <Scene
          settings={settings}
          onScoreChange={setScore}
          onSpeedChange={setSpeed}
          onBoostChange={(active, remaining) => setBoost({ active, remaining })}
          onGameOver={(final) => setOver({ done: true, final })}
        />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 flex items-start justify-between font-mono">
        <div className="rounded-2xl bg-card/70 backdrop-blur px-4 py-3 border border-border">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Puntos</div>
          <div className="text-3xl font-bold text-primary tabular-nums">{score}</div>
        </div>
        <div className="rounded-2xl bg-card/70 backdrop-blur px-4 py-3 border border-border text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Récord</div>
          <div className="text-2xl font-bold tabular-nums">{Math.max(progress.bestScore, score)}</div>
        </div>
      </div>

      {/* Speed indicator */}
      <div className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 border font-mono text-sm ${boost.active ? "bg-accent text-accent-foreground border-accent boost-glow" : "bg-card/70 border-border text-muted-foreground"}`}>
        {boost.active
          ? `⚡ BOOST x1.8 · ${boost.remaining.toFixed(1)}s`
          : `velocidad ${speed.toFixed(1)} m/s`}
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-6 right-6 text-xs text-muted-foreground font-mono opacity-70">
        ← → mover · ↑ saltar · swipe en móvil
      </div>

      {over.done && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
            <h2 className="text-3xl font-bold mb-2">Fin del intento</h2>
            <p className="text-muted-foreground mb-6 text-sm">Tu cubo no sobrevivió.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-muted p-4">
                <div className="text-xs uppercase text-muted-foreground">Puntos</div>
                <div className="text-2xl font-bold tabular-nums">{over.final}</div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <div className="text-xs uppercase text-muted-foreground">Récord</div>
                <div className="text-2xl font-bold tabular-nums text-primary">{Math.max(progress.bestScore, over.final)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onExit(over.final)}
                className="flex-1 rounded-xl bg-muted hover:bg-muted/70 px-4 py-3 font-semibold transition"
              >Menú</button>
              <button
                onClick={() => { onExit(over.final); setTimeout(() => location.reload(), 30); }}
                className="flex-1 rounded-xl bg-primary text-primary-foreground hover:opacity-90 px-4 py-3 font-semibold transition"
              >Reintentar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
