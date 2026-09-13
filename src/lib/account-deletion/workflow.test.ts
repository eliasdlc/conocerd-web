import { describe, expect, it } from "vitest";
import {
  deletionWorkflowReducer,
  initialDeletionWorkflowState,
} from "./workflow";

const account = { email: "cuenta@example.com", displayName: "Cuenta" };

describe("deletionWorkflowReducer", () => {
  it("no inicia el borrado sin confirmación irreversible", () => {
    const authenticated = deletionWorkflowReducer(initialDeletionWorkflowState, {
      type: "authenticated",
      account,
    });

    expect(
      deletionWorkflowReducer(authenticated, { type: "deletion-started" }),
    ).toEqual(authenticated);
  });

  it("vuelve a confirmación con un error y conserva la cuenta activa", () => {
    const authenticated = deletionWorkflowReducer(initialDeletionWorkflowState, {
      type: "authenticated",
      account,
    });
    const confirmed = deletionWorkflowReducer(authenticated, {
      type: "acknowledged",
      value: true,
    });
    const deleting = deletionWorkflowReducer(confirmed, { type: "deletion-started" });

    expect(
      deletionWorkflowReducer(deleting, {
        type: "deletion-failed",
        message: "La cuenta sigue activa.",
      }),
    ).toEqual({
      screen: "confirm",
      account,
      acknowledged: false,
      error: "La cuenta sigue activa.",
    });
  });

  it("termina en éxito sin cuenta ni confirmación retenida", () => {
    const deleting = {
      screen: "deleting" as const,
      account,
      acknowledged: true,
      error: null,
    };

    expect(
      deletionWorkflowReducer(deleting, { type: "deletion-succeeded" }),
    ).toEqual({
      screen: "success",
      account: null,
      acknowledged: false,
      error: null,
    });
  });
});
