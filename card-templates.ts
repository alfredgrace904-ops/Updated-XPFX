/**
 * Card design templates used by the card request / edit flow.
 * Each template is a self-contained `CardDesign` plus a UI label.
 */
import type { CardDesign } from "@workspace/api-client-react";

export interface CardTemplate {
  id: string;
  label: string;
  description: string;
  design: CardDesign;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "tpl_obsidian",
    label: "Obsidian",
    description: "Sleek black with cobalt highlights — a classic premium look.",
    design: {
      templateId: "tpl_obsidian",
      primaryColor: "#0f172a",
      secondaryColor: "#1e3a8a",
      accentColor: "#06b6d4",
      pattern: "carbon",
      textColor: "light",
    },
  },
  {
    id: "tpl_aurora",
    label: "Aurora",
    description: "Aurora-inspired teal-to-violet gradient with a soft mesh.",
    design: {
      templateId: "tpl_aurora",
      primaryColor: "#0d9488",
      secondaryColor: "#7c3aed",
      accentColor: "#f472b6",
      pattern: "mesh",
      textColor: "light",
    },
  },
  {
    id: "tpl_sunset",
    label: "Sunset",
    description: "Warm amber-to-rose gradient with subtle waves.",
    design: {
      templateId: "tpl_sunset",
      primaryColor: "#f59e0b",
      secondaryColor: "#ef4444",
      accentColor: "#ec4899",
      pattern: "waves",
      textColor: "light",
    },
  },
  {
    id: "tpl_platinum",
    label: "Platinum",
    description: "Soft silver finish with a fine grid texture.",
    design: {
      templateId: "tpl_platinum",
      primaryColor: "#e5e7eb",
      secondaryColor: "#cbd5e1",
      accentColor: "#94a3b8",
      pattern: "grid",
      textColor: "dark",
    },
  },
  {
    id: "tpl_emerald",
    label: "Emerald",
    description: "Deep emerald with carbon weave for a confident look.",
    design: {
      templateId: "tpl_emerald",
      primaryColor: "#064e3b",
      secondaryColor: "#047857",
      accentColor: "#34d399",
      pattern: "carbon",
      textColor: "light",
    },
  },
  {
    id: "tpl_midnight",
    label: "Midnight",
    description: "Indigo gradient with star-like mesh for a modern edge.",
    design: {
      templateId: "tpl_midnight",
      primaryColor: "#1e1b4b",
      secondaryColor: "#312e81",
      accentColor: "#818cf8",
      pattern: "mesh",
      textColor: "light",
    },
  },
];

const PATTERNS: CardDesign["pattern"][] = ["solid", "gradient", "mesh", "waves", "grid", "carbon"];
const PALETTES: { primary: string; secondary: string; accent: string; text: "light" | "dark" }[] = [
  { primary: "#7c3aed", secondary: "#db2777", accent: "#fbbf24", text: "light" },
  { primary: "#0ea5e9", secondary: "#22d3ee", accent: "#a78bfa", text: "light" },
  { primary: "#dc2626", secondary: "#f59e0b", accent: "#fde047", text: "light" },
  { primary: "#1f2937", secondary: "#374151", accent: "#9ca3af", text: "light" },
  { primary: "#fef3c7", secondary: "#fde68a", accent: "#f59e0b", text: "dark" },
  { primary: "#bfdbfe", secondary: "#93c5fd", accent: "#3b82f6", text: "dark" },
];

/**
 * Returns a brand-new randomized card design — used when the user clicks
 * "Surprise me" instead of picking a template manually.
 */
export function randomCardDesign(): CardDesign {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]!;
  const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]!;
  return {
    templateId: "custom",
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    pattern,
    textColor: palette.text,
  };
}
