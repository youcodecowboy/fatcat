// Shared selection options for the feed form. Kept in one place so the UI and
// any server-side validation reference the same source of truth.

export const FEEDERS = ["Spencer", "Kristian", "Zeena", "Abhi"] as const;

export const FOODS = ["Wet food", "Dry food"] as const;

export const PORTIONS = ["Small", "Medium", "Large"] as const;

export type Feeder = (typeof FEEDERS)[number];
export type Food = (typeof FOODS)[number];
export type Portion = (typeof PORTIONS)[number];
