/**
 * Geography Service
 *
 * Cascading country → region → city options for the customer address form,
 * fetched one slice at a time.
 *
 * This used to import `country-state-city` directly. That put the library's
 * whole dataset in the bundle — 8.36 MB, 94% of it the 148,038-record world
 * city list — and because the import was static, every page that touched an
 * address form had to download and parse all of it *before rendering*, whether
 * or not anyone opened a dropdown. On a desktop that was an unnoticed blip. On
 * an iPhone it exceeded Safari's per-tab memory, the module never finished
 * evaluating, the route never completed, and the page simply never appeared —
 * no error, because nothing threw.
 *
 * The same data is now split per country at build time (see
 * `scripts/build-geo-assets.mjs`) and requested on demand. A Ghanaian address
 * costs about 18 KB across three small files instead of 8.36 MB up front.
 *
 * Exposed GeoOption values are human-readable names, not ISO codes, because the
 * backend stores plain strings for country, region and city. Codes are resolved
 * internally to find the right file.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface GeoOption {
  label: string;
  value: string;
}

interface CountryRecord {
  name: string;
  isoCode: string;
  flag: string;
}

interface StateRecord {
  name: string;
  isoCode: string;
}

interface CityRecord {
  name: string;
  stateCode: string;
}

const GEO_ROOT = 'assets/geo';

@Injectable({ providedIn: 'root' })
export class GeographyService {
  private readonly http = inject(HttpClient);

  /**
   * One in-flight request per file, kept forever.
   *
   * The promise is cached rather than its result, so two dropdowns opening at
   * once share a single request instead of racing. The data is static and
   * small, and an admin switching back and forth between two countries should
   * not re-fetch either.
   */
  private readonly files = new Map<string, Promise<unknown>>();

  private load<T>(path: string): Promise<T> {
    const cached = this.files.get(path);

    if (cached) {
      return cached as Promise<T>;
    }

    /* A country with no regions or no cities has no file, and that is a normal
       answer rather than a failure — an empty list leaves the dependent
       dropdown empty instead of breaking the form. */
    const request = firstValueFrom(this.http.get<T>(`${GEO_ROOT}/${path}`)).catch(
      () => [] as unknown as T,
    );

    this.files.set(path, request);

    return request;
  }

  /** All countries as select options — label includes the emoji flag. */
  public async getCountries(): Promise<GeoOption[]> {
    const countries = await this.load<CountryRecord[]>('countries.json');

    return countries.map((country) => ({
      label: `${country.flag} ${country.name}`,
      value: country.name,
    }));
  }

  /** Regions for a country, by name. Empty when the country is unknown. */
  public async getStates(countryName: string): Promise<GeoOption[]> {
    const isoCode = await this.countryCode(countryName);

    if (!isoCode) {
      return [];
    }

    const states = await this.load<StateRecord[]>(`states/${isoCode}.json`);

    return states.map((state) => ({ label: state.name, value: state.name }));
  }

  /** Cities for a country and region, both by name. */
  public async getCities(countryName: string, stateName: string): Promise<GeoOption[]> {
    const isoCode = await this.countryCode(countryName);

    if (!isoCode) {
      return [];
    }

    const states = await this.load<StateRecord[]>(`states/${isoCode}.json`);
    const stateCode = states.find((state) => state.name === stateName)?.isoCode;

    if (!stateCode) {
      return [];
    }

    const cities = await this.load<CityRecord[]>(`cities/${isoCode}.json`);

    return cities
      .filter((city) => city.stateCode === stateCode)
      .map((city) => ({ label: city.name, value: city.name }));
  }

  private async countryCode(countryName: string): Promise<string | undefined> {
    const countries = await this.load<CountryRecord[]>('countries.json');

    return countries.find((country) => country.name === countryName)?.isoCode;
  }
}
