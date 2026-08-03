import { describe, expect, it } from "vitest";
import { MODEL_REGISTRY, effectiveModelCount } from "../src/domain/models.js";
import { calibratedValue, calculateCalibration, fuseSamples, normalizedWeights } from "../src/domain/fusion.js";
import { mergeWeatherCodes } from "../src/domain/weather-codes.js";
import { brierScore, continuousScores, precipitationEventStats } from "../src/verification/scoring.js";

describe("multi-model fusion", () => {
  it("averages wind directions around the 0/360 boundary", () => {
    const result = fuseSamples([{ modelId: "ecmwf_ifs", value: 350 }, { modelId: "gfs_seamless", value: 10 }], { lat: 0, lon: 0, leadHours: 1, variable: "wind_direction_10m" });
    expect(result.value).toBeCloseTo(0, 5);
    expect(result.spread).toBeLessThan(15);
  });

  it("uses severity-weighted mode instead of numeric code averaging", () => {
    expect(mergeWeatherCodes(new Map([[0, 0.45], [95, 0.55]]))).toBe(95);
    expect(mergeWeatherCodes(new Map([[1, 0.5], [3, 0.5]]))).toBe(1);
  });

  it("drops models past their useful horizon and grants regional CAM precipitation weight", () => {
    const europe = MODEL_REGISTRY.filter((model) => ["ecmwf_ifs", "icon_d2", "gfs_seamless"].includes(model.id));
    const weights = normalizedWeights(europe, { lat: 50, lon: 10, leadHours: 24, variable: "precipitation" });
    expect(weights.has("icon_d2")).toBe(true);
    expect(normalizedWeights(europe, { lat: 50, lon: 10, leadHours: 72, variable: "precipitation" }).has("icon_d2")).toBe(false);
    expect([...weights.values()].reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("discounts same-family models when calculating effective agreement count", () => {
    expect(effectiveModelCount(["ecmwf_ifs", "ecmwf_aifs025_single"])).toBeCloseTo(1.25);
    expect(effectiveModelCount(["ecmwf_ifs", "gfs_seamless"])).toBe(2);
  });
});

describe("verification scores", () => {
  it("computes Brier score and hit/miss/false-alarm counts", () => {
    expect(brierScore([0.9, 0.2], [true, false])).toBeCloseTo(0.025);
    expect(precipitationEventStats([0.9, 0.8, 0.05], [true, false, true])).toMatchObject({ hits: 1, misses: 1, falseAlarms: 1 });
    expect(continuousScores([20, null, 24], [22, 23, 20])).toMatchObject({ bias: 1, mae: 3, sampleCount: 2 });
  });
});

describe("conservative calibration", () => {
  const now = new Date("2026-08-03T00:00:00.000Z");
  const policy = { enabled: true, minSamples: 3, maxAbsoluteCorrection: 2, halfLifeDays: 30 };
  it("does not calibrate below the sample gate and clamps corrections", () => {
    const tooSmall = calculateCalibration([{ modelId: "ecmwf_ifs", variable: "temperature_2m", leadHours: 12, forecast: 30, observed: 20, observedAt: now.toISOString() }], now, policy);
    expect(tooSmall.size).toBe(0);
    const enough = calculateCalibration([1, 2, 3].map((offset) => ({ modelId: "ecmwf_ifs", variable: "temperature_2m", leadHours: 12, forecast: 30 + offset, observed: 20, observedAt: now.toISOString() })), now, policy);
    expect(enough.get("ecmwf_ifs|temperature_2m|0")?.bias).toBe(2);
    expect(calibratedValue(30, enough.get("ecmwf_ifs|temperature_2m|0"), policy)).toBe(28);
  });
  it("falls back to the raw value when disabled or absent", () => {
    expect(calibratedValue(30, undefined, policy)).toBe(30);
    expect(calibratedValue(30, { bias: 2, sampleCount: 10, updatedAt: now.toISOString() }, { ...policy, enabled: false })).toBe(30);
  });
});
