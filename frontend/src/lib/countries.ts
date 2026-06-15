/**
 * ISO3 → country display info for the 31 European countries the backend covers.
 * Flag emoji built from ISO2 country code regional indicator characters.
 */

interface CountryInfo {
  name: string;
  flag: string;
}

const A = 0x1f1e6;

function flag(iso2: string): string {
  return String.fromCodePoint(A + iso2.charCodeAt(0) - 65, A + iso2.charCodeAt(1) - 65);
}

export const COUNTRY_INFO: Record<string, CountryInfo> = {
  AUT: { name: "Austria", flag: flag("AT") },
  BEL: { name: "Belgium", flag: flag("BE") },
  BGR: { name: "Bulgaria", flag: flag("BG") },
  CHE: { name: "Switzerland", flag: flag("CH") },
  CZE: { name: "Czechia", flag: flag("CZ") },
  DEU: { name: "Germany", flag: flag("DE") },
  DNK: { name: "Denmark", flag: flag("DK") },
  ESP: { name: "Spain", flag: flag("ES") },
  EST: { name: "Estonia", flag: flag("EE") },
  FIN: { name: "Finland", flag: flag("FI") },
  FRA: { name: "France", flag: flag("FR") },
  GBR: { name: "United Kingdom", flag: flag("GB") },
  GRC: { name: "Greece", flag: flag("GR") },
  HRV: { name: "Croatia", flag: flag("HR") },
  HUN: { name: "Hungary", flag: flag("HU") },
  IRL: { name: "Ireland", flag: flag("IE") },
  ITA: { name: "Italy", flag: flag("IT") },
  LTU: { name: "Lithuania", flag: flag("LT") },
  LUX: { name: "Luxembourg", flag: flag("LU") },
  LVA: { name: "Latvia", flag: flag("LV") },
  MNE: { name: "Montenegro", flag: flag("ME") },
  MKD: { name: "North Macedonia", flag: flag("MK") },
  NLD: { name: "Netherlands", flag: flag("NL") },
  NOR: { name: "Norway", flag: flag("NO") },
  POL: { name: "Poland", flag: flag("PL") },
  PRT: { name: "Portugal", flag: flag("PT") },
  ROU: { name: "Romania", flag: flag("RO") },
  SRB: { name: "Serbia", flag: flag("RS") },
  SVK: { name: "Slovakia", flag: flag("SK") },
  SVN: { name: "Slovenia", flag: flag("SI") },
  SWE: { name: "Sweden", flag: flag("SE") },
};

export function countryDisplay(iso3: string): CountryInfo {
  return COUNTRY_INFO[iso3] ?? { name: iso3, flag: "🏳️" };
}
