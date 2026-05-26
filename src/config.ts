const present = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!present(value)) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(present);

export const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN?.trim() ?? "";
export const hasMapboxToken = mapboxToken.length > 0;

export const campusCenter = {
  latitude: numberFromEnv(import.meta.env.VITE_CAMPUS_LAT, 10.0469),
  longitude: numberFromEnv(import.meta.env.VITE_CAMPUS_LNG, 76.3188)
};

export const campusName =
  import.meta.env.VITE_CAMPUS_NAME?.trim() || "Campus";

export const reportTtlMinutes = clamp(
  numberFromEnv(import.meta.env.VITE_REPORT_TTL_MINUTES, 25),
  20,
  30
);

export const reportCooldownSeconds = Math.max(
  30,
  numberFromEnv(import.meta.env.VITE_REPORT_COOLDOWN_SECONDS, 90)
);

export const duplicateRadiusMeters = Math.max(
  40,
  numberFromEnv(import.meta.env.VITE_DUPLICATE_RADIUS_METERS, 90)
);

export const hotScoreThreshold = 8;

export const zoneAlertRadiusMeters = Math.max(
  60,
  numberFromEnv(import.meta.env.VITE_ZONE_ALERT_RADIUS_METERS, 160)
);

export const useFirebaseEmulators =
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

export const firebaseFunctionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
