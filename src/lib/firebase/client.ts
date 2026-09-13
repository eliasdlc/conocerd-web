import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { FirebasePublicConfig } from "@/lib/firebase/config";

export function getFirebaseAuth(config: FirebasePublicConfig) {
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getAuth(app);
}
