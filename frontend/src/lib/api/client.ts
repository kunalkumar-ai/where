const API_BASE = "http://localhost:8000";

export interface InterconnectionData {
  renewable_share_pct: number;
  net_position_twh: number;
  status: "exporter" | "importer" | "balanced";
}

export interface GenerationMix {
  coal: number;
  gas: number;
  nuclear: number;
  hydro: number;
  wind: number;
  solar: number;
  bioenergy: number;
  other_fossil: number;
  other_renewables: number;
}

export interface GenerationData {
  clean_share_pct: number;
  renewable_share_pct: number;
  mix_pct: GenerationMix;
}

export interface CountryData {
  price_eur_mwh: number;
  carbon_gco2_kwh: number;
  interconnection: InterconnectionData | Record<string, never>;
  generation: GenerationData | Record<string, never>;
}

export type CountryDataMap = Record<string, CountryData>;

export async function fetchAllCountryData(): Promise<CountryDataMap> {
  const res = await fetch(`${API_BASE}/api/map-data/all`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchPrices(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/map-data/prices`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchCarbon(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/map-data/carbon`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchInterconnection(): Promise<Record<string, InterconnectionData>> {
  const res = await fetch(`${API_BASE}/api/map-data/interconnection`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
