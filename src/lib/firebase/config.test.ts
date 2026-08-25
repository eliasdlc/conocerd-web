import { describe, expect, it } from "vitest";
import { parseFirebasePublicConfig } from "./config";

const completeEnvironment = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "auth.example.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project-id",
  NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "sender-id",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "bucket.example.com",
};

describe("parseFirebasePublicConfig", () => {
  it("devuelve una configuración tipada cuando todas las variables existen", () => {
    expect(parseFirebasePublicConfig(completeEnvironment)).toEqual({
      ok: true,
      config: {
        apiKey: "api-key",
        authDomain: "auth.example.com",
        projectId: "project-id",
        appId: "app-id",
        messagingSenderId: "sender-id",
        storageBucket: "bucket.example.com",
      },
    });
  });

  it("enumera variables ausentes o vacías", () => {
    expect(
      parseFirebasePublicConfig({
        ...completeEnvironment,
        NEXT_PUBLIC_FIREBASE_API_KEY: " ",
        NEXT_PUBLIC_FIREBASE_APP_ID: undefined,
      }),
    ).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_APP_ID"],
    });
  });
});
