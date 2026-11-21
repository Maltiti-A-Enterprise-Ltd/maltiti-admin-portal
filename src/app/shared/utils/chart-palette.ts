/**
 * Colours for charts, as literal values a canvas can paint.
 *
 * Charts used to read theme variables with `getPropertyValue`, which returns
 * what the variable was *declared* as — `var(--p-primary-500)`, not a colour.
 * A canvas cannot resolve that, so every line came out invisible, and
 * appending "20" for transparency made it `var(--p-primary-500)20`. Defined
 * here as hex instead, so they are the same in every chart.
 */
export const CHART_COLORS = {
  /** The brand green: the series that matters most. */
  primary: '#0f6938',
  /** A lighter green for its companion series. */
  secondary: '#3f9967',
  ochre: '#b7791f',
  slate: '#3b6ea5',
  clay: '#a4553a',
  teal: '#2a8c82',
  grey: '#9aa39d',
  /** Axis labels and grid lines. */
  text: '#5c655f',
  grid: '#e2e6e3',
} as const;

/** The order categorical series are coloured in, distinct from one another. */
export const CHART_SERIES: readonly string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.ochre,
  CHART_COLORS.slate,
  CHART_COLORS.clay,
  CHART_COLORS.teal,
  CHART_COLORS.secondary,
  CHART_COLORS.grey,
];

/** A hex colour at the given opacity, for fills under a line. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Axis styling every chart shares. */
export const CHART_AXIS = {
  ticks: { color: CHART_COLORS.text, font: { size: 11, family: 'IBM Plex Sans' } },
  grid: { color: CHART_COLORS.grid },
} as const;
