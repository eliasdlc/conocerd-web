export interface AccountSummary {
  email: string;
  displayName: string | null;
}

export interface DeletionWorkflowState {
  screen: "sign-in" | "confirm" | "deleting" | "success";
  account: AccountSummary | null;
  acknowledged: boolean;
  error: string | null;
}

export type DeletionWorkflowAction =
  | { type: "authenticated"; account: AccountSummary }
  | { type: "signed-out" }
  | { type: "acknowledged"; value: boolean }
  | { type: "deletion-started" }
  | { type: "deletion-failed"; message: string }
  | { type: "deletion-succeeded" };

export const initialDeletionWorkflowState: DeletionWorkflowState = {
  screen: "sign-in",
  account: null,
  acknowledged: false,
  error: null,
};

export function deletionWorkflowReducer(
  state: DeletionWorkflowState,
  action: DeletionWorkflowAction,
): DeletionWorkflowState {
  switch (action.type) {
    case "authenticated":
      return {
        screen: "confirm",
        account: action.account,
        acknowledged: false,
        error: null,
      };
    case "signed-out":
      return state.screen === "success" ? state : initialDeletionWorkflowState;
    case "acknowledged":
      return state.screen === "confirm"
        ? { ...state, acknowledged: action.value, error: null }
        : state;
    case "deletion-started":
      return state.screen === "confirm" && state.acknowledged
        ? { ...state, screen: "deleting", error: null }
        : state;
    case "deletion-failed":
      return state.screen === "deleting"
        ? {
            ...state,
            screen: "confirm",
            acknowledged: false,
            error: action.message,
          }
        : state;
    case "deletion-succeeded":
      return {
        screen: "success",
        account: null,
        acknowledged: false,
        error: null,
      };
  }
}
