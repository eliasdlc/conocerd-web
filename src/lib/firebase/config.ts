export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  storageBucket: string;
}

export interface FirebasePublicEnvironment {
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
}

export type FirebaseConfigResult =
  | { ok: true; config: FirebasePublicConfig }
  | { ok: false; missing: (keyof FirebasePublicEnvironment)[] };

const REQUIRED_ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
] as const satisfies readonly (keyof FirebasePublicEnvironment)[];

export function parseFirebasePublicConfig(
  environment: FirebasePublicEnvironment,
): FirebaseConfigResult {
  const missing = REQUIRED_ENVIRONMENT_KEYS.filter(
    (key) => !environment[key]?.trim(),
  );

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const value = (key: keyof FirebasePublicEnvironment) =>
    environment[key]?.trim() ?? "";

  return {
    ok: true,
    config: {
      apiKey: value("NEXT_PUBLIC_FIREBASE_API_KEY"),
      authDomain: value("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
      projectId: value("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      appId: value("NEXT_PUBLIC_FIREBASE_APP_ID"),
      messagingSenderId: value("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      storageBucket: value("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    },
  };
}

export const firebasePublicEnvironment: FirebasePublicEnvironment = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};
