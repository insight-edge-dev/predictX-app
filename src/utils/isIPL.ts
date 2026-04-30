/**
 * IPL series detection.
 * Never use strict equality — API names change between seasons.
 */

export function isIPLSeries(seriesName: string): boolean {
  const n = seriesName.toLowerCase();
  return (
    n.includes("ipl") ||
    n.includes("indian premier league") ||
    n.includes("premier league") ||
    n.includes("tata") ||
    n.includes("indian t20")
  );
}
