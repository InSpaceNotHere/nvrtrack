export type WeightUnit = "lb" | "kg";

const POUNDS_PER_KILOGRAM = 2.2046226218;

export function isWeightUnit(value: string): value is WeightUnit {
  return value === "lb" || value === "kg";
}

export function poundsToKilograms(pounds: number): number {
  return pounds / POUNDS_PER_KILOGRAM;
}

export function kilogramsToPounds(kilograms: number): number {
  return kilograms * POUNDS_PER_KILOGRAM;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) {
    return value;
  }

  return from === "lb" ? poundsToKilograms(value) : kilogramsToPounds(value);
}

export function roundWeight(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
