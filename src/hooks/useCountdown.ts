import { useState, useEffect } from "react";

export interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  /** Formatted string: "2h 10m 30s" | "45m 12s" | "8s" | "" */
  label: string;
}

function calc(targetTime: string | null): CountdownState {
  if (!targetTime) return { hours: 0, minutes: 0, seconds: 0, isExpired: true, label: "" };
  const diff = new Date(targetTime).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, isExpired: true, label: "" };

  const hours = Math.floor(diff / (3600 * 1000));
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  let label = "";
  if (hours > 0) label = `${hours}h ${minutes}m`;
  else if (minutes > 0) label = `${minutes}m ${seconds}s`;
  else label = `${seconds}s`;

  return { hours, minutes, seconds, isExpired: false, label };
}

/**
 * Countdown to a target ISO date string.
 *
 * Updates every second using a local setInterval — no server polling.
 * Clears interval automatically when expired or component unmounts.
 */
export function useCountdown(targetTime: string | null): CountdownState {
  const [state, setState] = useState<CountdownState>(() => calc(targetTime));

  useEffect(() => {
    // Recalculate immediately when target changes
    setState(calc(targetTime));
    if (!targetTime) return;

    const id = setInterval(() => {
      const next = calc(targetTime);
      setState(next);
      if (next.isExpired) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [targetTime]);

  return state;
}
