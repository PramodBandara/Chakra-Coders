import { FirebaseError } from "firebase/app";

export function formatFirebaseError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") return "You do not have permission to do that.";
    if (error.code === "auth/popup-closed-by-user") return "Google sign-in was closed before it finished.";
    if (error.code === "auth/popup-blocked") return "The browser blocked the Google sign-in popup.";
    if (error.code === "unauthenticated") return "Sign in again to continue.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
