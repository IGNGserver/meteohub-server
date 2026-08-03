export interface PrecipitationEventStats { brierScore: number; hits: number; misses: number; falseAlarms: number; correctNegatives: number; }

export function brierScore(probabilities: readonly number[], observedEvents: readonly boolean[]): number {
  const length = Math.min(probabilities.length, observedEvents.length); let sum = 0; let count = 0;
  for (let index = 0; index < length; index += 1) { const probability = probabilities[index]; const observed = observedEvents[index]; if (probability === undefined || observed === undefined || !Number.isFinite(probability)) continue; const bounded = Math.max(0, Math.min(1, probability)); sum += (bounded - (observed ? 1 : 0)) ** 2; count += 1; }
  return count === 0 ? Number.NaN : sum / count;
}

export function precipitationEventStats(probabilities: readonly number[], observedEvents: readonly boolean[], threshold = 0.1): PrecipitationEventStats {
  const length = Math.min(probabilities.length, observedEvents.length); let hits = 0; let misses = 0; let falseAlarms = 0; let correctNegatives = 0;
  for (let index = 0; index < length; index += 1) { const probability = probabilities[index]; const observed = observedEvents[index]; if (probability === undefined || observed === undefined || !Number.isFinite(probability)) continue; const forecastWet = probability >= threshold; if (forecastWet && observed) hits += 1; else if (!forecastWet && observed) misses += 1; else if (forecastWet) falseAlarms += 1; else correctNegatives += 1; }
  return { brierScore: brierScore(probabilities, observedEvents), hits, misses, falseAlarms, correctNegatives };
}

export function continuousScores(forecast: readonly (number | null)[], observed: readonly (number | null)[]): { bias: number; mae: number; sampleCount: number } {
  let signed = 0; let absolute = 0; let sampleCount = 0; const length = Math.min(forecast.length, observed.length);
  for (let index = 0; index < length; index += 1) { const f = forecast[index]; const o = observed[index]; if (f === null || f === undefined || o === null || o === undefined || !Number.isFinite(f) || !Number.isFinite(o)) continue; signed += f - o; absolute += Math.abs(f - o); sampleCount += 1; }
  return { bias: sampleCount ? signed / sampleCount : Number.NaN, mae: sampleCount ? absolute / sampleCount : Number.NaN, sampleCount };
}
