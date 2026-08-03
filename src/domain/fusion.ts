import { effectiveModelCount, getModel, regionBonus, type ModelDefinition } from "./models.js";
import { mergeWeatherCodes } from "./weather-codes.js";

export type FusionVariable = "temperature_2m" | "apparent_temperature" | "precipitation" | "precipitation_probability" | "wind_speed_10m" | "wind_direction_10m" | "weather_code" | "cloud_cover" | "relative_humidity_2m" | "surface_pressure";

export interface ModelSample { modelId: string; value: number | null; }

export interface FusionResult {
  value: number | null;
  spread: number;
  confidence: number;
  weights: Record<string, number>;
}

export interface FusionContext { lat: number; lon: number; leadHours: number; variable: FusionVariable; multipliers?: Readonly<Record<string, number>>; }

const variableBoost = (kind: ModelDefinition["kind"], variable: FusionVariable): number => variable === "precipitation" || variable === "precipitation_probability" ? (kind === "regional-cam" ? 1.3 : 1) : 1;

function leadBand(leadHours: number): 0 | 1 | 2 | 3 { return leadHours <= 48 ? 0 : leadHours <= 120 ? 1 : leadHours <= 240 ? 2 : 3; }

const staticLeadMultipliers: Record<ModelDefinition["kind"], readonly [number, number, number, number]> = {
  global: [1, 0.95, 0.85, 0.7],
  "regional-mid": [1, 0.95, 0.8, 0],
  "regional-cam": [1.05, 0.85, 0.4, 0],
  ai: [0.95, 0.95, 0.9, 0.8],
  "ensemble-mean": [0.95, 0.95, 0.9, 0.8],
};

export function normalizedWeights(models: readonly ModelDefinition[], context: FusionContext): Map<string, number> {
  const raw = new Map<string, number>();
  let total = 0;
  const band = leadBand(context.leadHours);
  for (const model of models) {
    if (!model.enabled || context.leadHours < 0 || context.leadHours > model.maxLeadHours) continue;
    const multiplier = staticLeadMultipliers[model.kind][band];
    if (multiplier === 0) continue;
    const weight = (1 + regionBonus(model, context.lat, context.lon)) * variableBoost(model.kind, context.variable) * multiplier * (context.multipliers?.[model.id] ?? 1);
    if (weight > 0) { raw.set(model.id, weight); total += weight; }
  }
  if (total > 0) for (const [id, weight] of raw) raw.set(id, weight / total);
  return raw;
}

export function circularMeanDegrees(values: readonly ModelSample[], weights: ReadonlyMap<string, number>): { value: number | null; spread: number } {
  let x = 0; let y = 0; let total = 0;
  for (const sample of values) {
    if (sample.value === null || !Number.isFinite(sample.value)) continue;
    const weight = weights.get(sample.modelId) ?? 0;
    const radians = sample.value * Math.PI / 180;
    x += weight * Math.cos(radians); y += weight * Math.sin(radians); total += weight;
  }
  if (total === 0) return { value: null, spread: 0 };
  const mx = x / total; const my = y / total; const angle = (Math.atan2(my, mx) * 180 / Math.PI + 360) % 360;
  const resultant = Math.min(1, Math.sqrt(mx * mx + my * my));
  const spread = resultant > 0 ? Math.sqrt(-2 * Math.log(resultant)) * 180 / Math.PI : 180;
  return { value: angle, spread };
}

export function fuseSamples(samples: readonly ModelSample[], context: FusionContext, models: readonly ModelDefinition[] = samples.flatMap((s) => { const model = getModel(s.modelId); return model ? [model] : []; })): FusionResult {
  const weights = normalizedWeights(models, context);
  const used = samples.filter((sample) => sample.value !== null && Number.isFinite(sample.value) && (weights.get(sample.modelId) ?? 0) > 0);
  const exposedWeights: Record<string, number> = {};
  let total = 0;
  for (const sample of used) total += weights.get(sample.modelId) ?? 0;
  if (total === 0) return { value: null, spread: 0, confidence: 0, weights: {} };
  for (const sample of used) exposedWeights[sample.modelId] = (weights.get(sample.modelId) ?? 0) / total;
  if (context.variable === "wind_direction_10m") {
    const circular = circularMeanDegrees(used, weights);
    return { value: circular.value, spread: circular.spread, confidence: confidenceFor(circular.spread, effectiveModelCount(used.map((sample) => sample.modelId))), weights: exposedWeights };
  }
  if (context.variable === "weather_code") {
    const codeWeights = new Map<number, number>();
    for (const sample of used) { const code = Math.round(sample.value as number); codeWeights.set(code, (codeWeights.get(code) ?? 0) + (weights.get(sample.modelId) ?? 0)); }
    const value = mergeWeatherCodes(codeWeights);
    const winningWeight = value === null ? 0 : (codeWeights.get(value) ?? 0);
    return { value, spread: 0, confidence: Math.min(1, winningWeight / total * Math.min(1, effectiveModelCount(used.map((sample) => sample.modelId)) / 3)), weights: exposedWeights };
  }
  let mean = 0;
  for (const sample of used) mean += (sample.value as number) * (weights.get(sample.modelId) ?? 0) / total;
  let variance = 0;
  for (const sample of used) variance += ((weights.get(sample.modelId) ?? 0) / total) * ((sample.value as number) - mean) ** 2;
  const spread = Math.sqrt(variance);
  return { value: mean, spread, confidence: confidenceFor(spread, effectiveModelCount(used.map((sample) => sample.modelId))), weights: exposedWeights };
}

function confidenceFor(spread: number, independentModels: number): number {
  const spreadScore = Math.max(0, Math.min(1, 1 - spread / 10));
  return Math.max(0, Math.min(1, spreadScore * Math.min(1, independentModels / 3)));
}

export interface CalibrationSample { modelId: string; variable: string; leadHours: number; forecast: number; observed: number; observedAt: string; }

export interface CalibrationParameter { bias: number; sampleCount: number; updatedAt: string; }

export interface CalibrationPolicy { enabled: boolean; minSamples: number; maxAbsoluteCorrection: number; halfLifeDays: number; }

export function calculateCalibration(samples: readonly CalibrationSample[], now: Date, policy: CalibrationPolicy): Map<string, CalibrationParameter> {
  const grouped = new Map<string, CalibrationSample[]>();
  for (const sample of samples) { const key = `${sample.modelId}|${sample.variable}|${leadBand(sample.leadHours)}`; const list = grouped.get(key) ?? []; list.push(sample); grouped.set(key, list); }
  const result = new Map<string, CalibrationParameter>();
  if (!policy.enabled) return result;
  for (const [key, group] of grouped) {
    if (group.length < policy.minSamples) continue;
    let weightSum = 0; let biasSum = 0;
    for (const sample of group) {
      const ageDays = Math.max(0, now.getTime() - new Date(sample.observedAt).getTime()) / 86_400_000;
      const weight = Math.pow(0.5, ageDays / policy.halfLifeDays);
      weightSum += weight; biasSum += (sample.forecast - sample.observed) * weight;
    }
    const bias = Math.max(-policy.maxAbsoluteCorrection, Math.min(policy.maxAbsoluteCorrection, biasSum / weightSum));
    result.set(key, { bias, sampleCount: group.length, updatedAt: now.toISOString() });
  }
  return result;
}

export function calibratedValue(value: number | null, parameter: CalibrationParameter | undefined, policy: CalibrationPolicy): number | null {
  if (value === null || !policy.enabled || parameter === undefined) return value;
  return Math.max(value - policy.maxAbsoluteCorrection, Math.min(value + policy.maxAbsoluteCorrection, value - parameter.bias));
}
