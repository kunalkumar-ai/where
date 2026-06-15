import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { CountryDataMap } from "@/lib/api/client";
import {
  type LayerKey,
  NO_DATA_FILL,
  COUNTRY_OUTLINE,
  HOVER_OUTLINE,
  WORLD_MASK_COLOR,
  WORLD_MASK_OPACITY_ACTIVE,
  priceColorStops,
  carbonColorStops,
  cleanShareColorStops,
  interconnectionStatusColor,
} from "./colors";

interface EuropeMapProps {
  countryData: CountryDataMap;
  activeLayer: LayerKey;
  onCountryClick?: (iso3: string) => void;
}

const TILE_STYLE_URL = "https://demotiles.maplibre.org/style.json";
const GEOJSON_URL = "/europe.geojson";
const SOURCE_ID = "countries";
const MASK_SOURCE_ID = "world-cover";
const MASK_LAYER_ID = "world-mask";
const FILL_LAYER_ID = "country-fill";
const OUTLINE_LAYER_ID = "country-outline";

const WORLD_COVER_GEOJSON = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [-180, 85],
        [180, 85],
        [180, -85],
        [-180, -85],
        [-180, 85],
      ],
    ],
  },
};

export function EuropeMap({ countryData, activeLayer, onCountryClick }: EuropeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredIso = useRef<string | null>(null);

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE_URL,
      center: [15, 54],
      zoom: 3.2,
      minZoom: 2,
      maxZoom: 7,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", async () => {
      const res = await fetch(GEOJSON_URL);
      const geojson = await res.json();

      // Find the first label/symbol layer so we can insert ours below it
      // (this keeps country names rendered on top of our fills).
      const firstSymbolId = map.getStyle().layers.find((l) => l.type === "symbol")?.id;

      // Source 1: a polygon spanning the whole world — used to mask out
      // non-European countries when a data layer is active.
      map.addSource(MASK_SOURCE_ID, { type: "geojson", data: WORLD_COVER_GEOJSON });

      map.addLayer(
        {
          id: MASK_LAYER_ID,
          type: "fill",
          source: MASK_SOURCE_ID,
          paint: {
            "fill-color": WORLD_MASK_COLOR,
            "fill-opacity": 0,
          },
        },
        firstSymbolId,
      );

      // Source 2: European country polygons.
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
        promoteId: "iso_a3",
      });

      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": NO_DATA_FILL,
            "fill-opacity": 0.92,
          },
        },
        firstSymbolId,
      );

      map.addLayer(
        {
          id: OUTLINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              HOVER_OUTLINE,
              COUNTRY_OUTLINE,
            ],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0.6],
          },
        },
        firstSymbolId,
      );

      map.on("mousemove", FILL_LAYER_ID, (e) => {
        if (!e.features?.length) return;
        const iso = e.features[0].id as string | undefined;
        if (!iso) return;
        if (hoveredIso.current && hoveredIso.current !== iso) {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIso.current }, { hover: false });
        }
        hoveredIso.current = iso;
        map.setFeatureState({ source: SOURCE_ID, id: iso }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", FILL_LAYER_ID, () => {
        if (hoveredIso.current) {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIso.current }, { hover: false });
          hoveredIso.current = null;
        }
        map.getCanvas().style.cursor = "";
      });

      map.on("click", FILL_LAYER_ID, (e) => {
        const iso = e.features?.[0]?.id as string | undefined;
        if (iso && onCountryClick) onCountryClick(iso);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update fill paint and world mask when the active layer or data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map.getLayer(FILL_LAYER_ID)) return;
      map.setPaintProperty(FILL_LAYER_ID, "fill-color", buildFillExpression(countryData, activeLayer));

      const maskOpacity = activeLayer === "none" ? 0 : WORLD_MASK_OPACITY_ACTIVE;
      map.setPaintProperty(MASK_LAYER_ID, "fill-opacity", maskOpacity);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [countryData, activeLayer]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function buildFillExpression(data: CountryDataMap, layer: LayerKey): ExpressionSpecification | string {
  if (layer === "none" || Object.keys(data).length === 0) return NO_DATA_FILL;

  const matchCases: (string | string[])[] = [];

  for (const [iso, c] of Object.entries(data)) {
    let color: string;
    if (layer === "prices") {
      color = interpolate(c.price_eur_mwh, priceColorStops);
    } else if (layer === "carbon") {
      color = interpolate(c.carbon_gco2_kwh, carbonColorStops);
    } else if (layer === "clean") {
      const cleanPct = "clean_share_pct" in c.generation ? c.generation.clean_share_pct : null;
      if (cleanPct === null) {
        matchCases.push(iso, NO_DATA_FILL);
        continue;
      }
      color = interpolate(cleanPct, cleanShareColorStops);
    } else {
      const status = "status" in c.interconnection ? c.interconnection.status : "balanced";
      color = interconnectionStatusColor[status] ?? NO_DATA_FILL;
    }
    matchCases.push(iso, color);
  }

  return ["match", ["get", "iso_a3"], ...matchCases, NO_DATA_FILL] as unknown as ExpressionSpecification;
}

function interpolate(value: number, stops: Array<[number, string]>): string {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [v1, c1] = stops[i];
    const [v2, c2] = stops[i + 1];
    if (value >= v1 && value <= v2) {
      const t = (value - v1) / (v2 - v1);
      return mixColors(c1, c2, t);
    }
  }
  return stops[stops.length - 1][1];
}

function mixColors(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
