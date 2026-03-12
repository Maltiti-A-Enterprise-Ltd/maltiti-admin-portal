/**
 * Geography Service
 * Uses the `country-state-city` npm library to provide all countries, states/regions,
 * and cities for cascading selects.
 *
 * Exposed GeoOption values are human-readable names (not ISO codes) because the
 * backend DTO stores plain strings for country, region, and city.
 * ISO codes are resolved internally for library lookups.
 */
import { Injectable } from '@angular/core';
import { City, Country, State } from 'country-state-city';

export interface GeoOption {
  label: string;
  value: string;
}

@Injectable({ providedIn: 'root' })
export class GeographyService {
  /** Cached map: country name → ISO code */
  private readonly countryNameToCode = new Map<string, string>();
  /** Cached map: "countryName|stateName" → state ISO code */
  private readonly stateNameToCode = new Map<string, string>();

  constructor() {
    // Pre-build country name → isoCode map once
    for (const c of Country.getAllCountries()) {
      this.countryNameToCode.set(c.name, c.isoCode);
    }
  }

  /** All countries as select options — label includes emoji flag */
  public getCountries(): GeoOption[] {
    return Country.getAllCountries().map((c) => ({
      label: `${c.flag} ${c.name}`,
      value: c.name,
    }));
  }

  /** States/regions for a given country name */
  public getStates(countryName: string): GeoOption[] {
    const countryCode = this.countryNameToCode.get(countryName);
    if (!countryCode) {
      return [];
    }

    const states = State.getStatesOfCountry(countryCode);

    // Cache state name → isoCode for later city lookups
    for (const s of states) {
      this.stateNameToCode.set(`${countryName}|${s.name}`, s.isoCode);
    }

    return states.map((s) => ({ label: s.name, value: s.name }));
  }

  /** Cities for a given country name + state name */
  public getCities(countryName: string, stateName: string): GeoOption[] {
    const countryCode = this.countryNameToCode.get(countryName);
    if (!countryCode) {
      return [];
    }

    // Resolve state ISO code — try cache first, then live lookup
    let stateCode = this.stateNameToCode.get(`${countryName}|${stateName}`);
    if (!stateCode) {
      const states = State.getStatesOfCountry(countryCode);
      const found = states.find((s) => s.name === stateName);
      if (!found) {
        return [];
      }
      stateCode = found.isoCode;
      this.stateNameToCode.set(`${countryName}|${stateName}`, stateCode);
    }

    return City.getCitiesOfState(countryCode, stateCode).map((city) => ({
      label: city.name,
      value: city.name,
    }));
  }

  /** Whether a country has any states/regions */
  public hasStates(countryName: string): boolean {
    const countryCode = this.countryNameToCode.get(countryName);
    if (!countryCode) {
      return false;
    }
    return State.getStatesOfCountry(countryCode).length > 0;
  }

  /** Whether a state has any cities */
  public hasCities(countryName: string, stateName: string): boolean {
    return this.getCities(countryName, stateName).length > 0;
  }
}
