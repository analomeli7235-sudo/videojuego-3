import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Menu from "@/game/Menu";
import Game from "@/game/Game";
import {
  GameProgress, GameSettings,
  defaultProgress, defaultSettings,
  loadProgress, loadSettings, saveProgress, saveSettings,
} from "@/game/store";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cube Runner 3D — Endless Runner en el navegador" },
      { name: "description", content: "Endless runner 3D hecho con React y Three.js. Dificultad progresiva, guardado de progreso y boost de velocidad." },
    ],
  }),
});

function Index() {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [progress, setProgress] = useState<GameProgress>(defaultProgress);
  const [screen, setScreen] = useState<"menu" | "game">("menu");

  useEffect(() => {
    setSettings(loadSettings());
    setProgress(loadProgress());
  }, []);

  const updateSettings = (s: GameSettings) => { setSettings(s); saveSettings(s); };
  const resetProgress = () => { saveProgress(defaultProgress); setProgress(defaultProgress); };

  const handleExit = (finalScore: number) => {
    const next: GameProgress = {
      bestScore: Math.max(progress.bestScore, finalScore),
      totalRuns: progress.totalRuns + 1,
      lastScore: finalScore,
    };
    saveProgress(next);
    setProgress(next);
    setScreen("menu");
  };

  if (screen === "game") {
    return <Game settings={settings} progress={progress} onExit={handleExit} />;
  }
  return (
    <Menu
      settings={settings}
      progress={progress}
      onChange={updateSettings}
      onPlay={() => setScreen("game")}
      onReset={resetProgress}
    />
  );
}
