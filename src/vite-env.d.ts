/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_CAMPUS_LAT?: string;
  readonly VITE_CAMPUS_LNG?: string;
  readonly VITE_CAMPUS_NAME?: string;
  readonly VITE_REPORT_TTL_MINUTES?: string;
  readonly VITE_REPORT_COOLDOWN_SECONDS?: string;
  readonly VITE_DUPLICATE_RADIUS_METERS?: string;
  readonly VITE_ZONE_ALERT_RADIUS_METERS?: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
