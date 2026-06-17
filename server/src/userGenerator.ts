const ADJECTIVES = [
  "Blazing", "Cosmic", "Daring", "Electric", "Fierce",
  "Golden", "Hyper", "Iron", "Jade", "Keen",
  "Lunar", "Mystic", "Neon", "Obsidian", "Primal",
  "Quantum", "Rogue", "Solar", "Turbo", "Vivid",
  "Wild", "Xenon", "Yellow", "Zeal", "Arctic",
  "Bold", "Crystal", "Dual", "Echo", "Flame",
];

const ANIMALS = [
  "Falcon", "Panther", "Shark", "Wolf", "Viper",
  "Eagle", "Tiger", "Cobra", "Lynx", "Bear",
  "Hawk", "Fox", "Jaguar", "Raven", "Otter",
  "Bison", "Crane", "Drake", "Elk", "Ferret",
  "Gecko", "Heron", "Ibis", "Jackal", "Kite",
  "Lemur", "Mink", "Newt", "Osprey", "Puma",
];

export const PLAYER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f43f5e", "#a855f7", "#0ea5e9", "#10b981", "#f59e0b",
  "#6366f1", "#d946ef", "#64748b", "#0d9488", "#dc2626",
];

let colorIndex = 0;

export function generateUser(): { name: string; color: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const name = `${adj}${animal}`;
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  colorIndex++;
  return { name, color };
}
