// Simple game store with localStorage persistence
export type Difficulty = "facil" | "normal" | "dificil";

export interface GameSettings {
  difficulty: Difficulty;
  bgColor: string;
  playerColor: string;
  chunkSpacing: number; // configurable distance between level chunks
}

export interface GameProgress {
  bestScore: number;
  totalRuns: number;
  lastScore: number;
}

const SETTINGS_KEY = "cube-runner-settings";
const PROGRESS_KEY = "cube-runner-progress";

export const defaultSettings: GameSettings = {
  difficulty: "normal",
  bgColor: "#1a1530",
  playerColor: "#7ee68a",
  chunkSpacing: 20,
};

export const defaultProgress: GameProgress = {
  bestScore: 0,
  totalRuns: 0,
  lastScore: 0,
};

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch { return defaultSettings; }
}
export function saveSettings(s: GameSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}
export function loadProgress(): GameProgress {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
  } catch { return defaultProgress; }
}
export function saveProgress(p: GameProgress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch {}
}

export const difficultyConfig: Record<Difficulty, { baseSpeed: number; speedRamp: number; obstacleDensity: number; label: string }> = {
  facil:   { baseSpeed: 8,  speedRamp: 0.05, obstacleDensity: 0.35, label: "Fácil" },
  normal:  { baseSpeed: 11, speedRamp: 0.09, obstacleDensity: 0.55, label: "Normal" },
  dificil: { baseSpeed: 14, speedRamp: 0.14, obstacleDensity: 0.75, label: "Difícil" },
};
