export type ModelKind = "global" | "regional-cam" | "regional-mid" | "ai" | "ensemble-mean";

export interface BBox { lat: readonly [number, number]; lon: readonly [number, number]; }

export interface ModelDefinition {
  id: string;
  label: string;
  provider: string;
  kind: ModelKind;
  maxLeadHours: number;
  homeRegion: BBox | null;
  resolutionKm: number;
  updateHours: number;
  enabled: boolean;
}

export const MODEL_REGISTRY: readonly ModelDefinition[] = [
  { id: "ecmwf_ifs", label: "ECMWF IFS", provider: "ECMWF", kind: "global", maxLeadHours: 240, homeRegion: null, resolutionKm: 9, updateHours: 6, enabled: true },
  { id: "ecmwf_aifs025_single", label: "ECMWF AIFS", provider: "ECMWF", kind: "ai", maxLeadHours: 360, homeRegion: null, resolutionKm: 25, updateHours: 6, enabled: true },
  { id: "gfs_seamless", label: "NOAA GFS", provider: "NOAA", kind: "global", maxLeadHours: 384, homeRegion: null, resolutionKm: 13, updateHours: 6, enabled: true },
  { id: "ncep_aigfs025", label: "NOAA AIGFS", provider: "NOAA", kind: "ai", maxLeadHours: 384, homeRegion: null, resolutionKm: 25, updateHours: 6, enabled: true },
  { id: "icon_global", label: "DWD ICON", provider: "DWD", kind: "global", maxLeadHours: 180, homeRegion: null, resolutionKm: 11, updateHours: 6, enabled: true },
  { id: "icon_eu", label: "DWD ICON-EU", provider: "DWD", kind: "regional-mid", maxLeadHours: 120, homeRegion: { lat: [29, 70], lon: [-23, 45] }, resolutionKm: 7, updateHours: 6, enabled: true },
  { id: "icon_d2", label: "DWD ICON-D2", provider: "DWD", kind: "regional-cam", maxLeadHours: 48, homeRegion: { lat: [43, 58], lon: [-3, 20] }, resolutionKm: 2, updateHours: 3, enabled: true },
  { id: "jma_seamless", label: "JMA", provider: "JMA", kind: "regional-mid", maxLeadHours: 264, homeRegion: { lat: [24, 46], lon: [122, 146] }, resolutionKm: 5, updateHours: 6, enabled: true },
  { id: "cma_grapes_global", label: "CMA GRAPES", provider: "CMA", kind: "global", maxLeadHours: 240, homeRegion: { lat: [15, 55], lon: [70, 140] }, resolutionKm: 15, updateHours: 6, enabled: true },
  { id: "kma_seamless", label: "KMA", provider: "KMA", kind: "regional-mid", maxLeadHours: 288, homeRegion: { lat: [33, 43], lon: [124, 132] }, resolutionKm: 13, updateHours: 6, enabled: true },
  { id: "meteofrance_seamless", label: "Météo-France", provider: "Météo-France", kind: "regional-cam", maxLeadHours: 102, homeRegion: { lat: [41, 52], lon: [-5, 10] }, resolutionKm: 2, updateHours: 3, enabled: true },
  { id: "metno_nordic", label: "MET Norway", provider: "MET Norway", kind: "regional-cam", maxLeadHours: 60, homeRegion: { lat: [55, 72], lon: [-5, 35] }, resolutionKm: 2.5, updateHours: 3, enabled: true },
];

const byId = new Map(MODEL_REGISTRY.map((model) => [model.id, model]));

export function getModel(id: string): ModelDefinition | undefined { return byId.get(id); }

export function isInBBox(lat: number, lon: number, bbox: BBox): boolean {
  return lat >= bbox.lat[0] && lat <= bbox.lat[1] && lon >= bbox.lon[0] && lon <= bbox.lon[1];
}

export function regionBonus(model: ModelDefinition, lat: number, lon: number): number {
  if (model.homeRegion === null || !isInBBox(lat, lon, model.homeRegion)) return 0;
  return model.kind === "regional-cam" ? 0.3 : 0.2;
}

const familyByModel: Record<string, string> = {
  ecmwf_ifs: "ifs", ecmwf_aifs025_single: "ifs",
  gfs_seamless: "gfs", ncep_aigfs025: "gfs",
  icon_global: "icon", icon_eu: "icon", icon_d2: "icon",
  jma_seamless: "jma", cma_grapes_global: "grapes", kma_seamless: "kma",
  meteofrance_seamless: "arome", metno_nordic: "arome",
};

export function familyOf(modelId: string): string { return familyByModel[modelId] ?? modelId; }

export function effectiveModelCount(modelIds: Iterable<string>): number {
  const counts = new Map<string, number>();
  for (const id of modelIds) counts.set(familyOf(id), (counts.get(familyOf(id)) ?? 0) + 1);
  let result = 0;
  for (const count of counts.values()) result += 1 + 0.25 * (count - 1);
  return result;
}
