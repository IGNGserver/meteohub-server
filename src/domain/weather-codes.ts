export type WeatherSeverity = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function weatherSeverity(code: number): WeatherSeverity {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "drizzle";
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

export function mergeWeatherCodes(samples: ReadonlyMap<number, number>): number | null {
  if (samples.size === 0) return null;
  const severityWeight = new Map<WeatherSeverity, number>();
  for (const [code, weight] of samples) {
    const severity = weatherSeverity(code);
    severityWeight.set(severity, (severityWeight.get(severity) ?? 0) + weight);
  }
  let winningSeverity: WeatherSeverity | undefined;
  let winningWeight = -1;
  for (const [severity, weight] of severityWeight) {
    if (weight > winningWeight) { winningSeverity = severity; winningWeight = weight; }
  }
  let result: number | null = null;
  let resultWeight = -1;
  for (const [code, weight] of samples) {
    if (weatherSeverity(code) === winningSeverity && weight > resultWeight) { result = code; resultWeight = weight; }
  }
  return result;
}
