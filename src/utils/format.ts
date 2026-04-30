export function formatProbability(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatScore(runs: number, wickets: number, overs: number): string {
  return `${runs}/${wickets} (${overs})`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
