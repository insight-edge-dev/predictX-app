const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:5000";

export const API_BASE_URL = `${BASE}/api`;
export const WS_BASE_URL  = BASE.replace(/^http/, "ws") + "/ws";
