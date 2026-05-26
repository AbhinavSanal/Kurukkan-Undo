import { initializeApp, getApps } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions
} from "firebase/functions";
import {
  firebaseConfig,
  firebaseFunctionsRegion,
  hasFirebaseConfig,
  useFirebaseEmulators
} from "../config";

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

if (hasFirebaseConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  functionsInstance = getFunctions(app, firebaseFunctionsRegion);

  if (useFirebaseEmulators && !globalThis.__KURUKKAN_EMULATORS_CONNECTED__) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
      disableWarnings: true
    });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
    connectFunctionsEmulator(functionsInstance, "127.0.0.1", 5001);
    globalThis.__KURUKKAN_EMULATORS_CONNECTED__ = true;
  }
}

declare global {
  interface Window {
    __KURUKKAN_EMULATORS_CONNECTED__?: boolean;
  }

  // Vite HMR can re-evaluate this module. Keeping the flag on globalThis avoids
  // duplicate emulator connections during local development.
  // eslint-disable-next-line no-var
  var __KURUKKAN_EMULATORS_CONNECTED__: boolean | undefined;
}

export const auth = authInstance;
export const db = dbInstance;
export const functions = functionsInstance;
