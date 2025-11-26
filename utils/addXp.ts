
import { db } from "../components/firebaseClient";
import { doc, setDoc, serverTimestamp, increment } from "firebase/firestore";

export const USER_ACHIEVEMENTS_COLLECTION = "userAchievements";

/**
 * Atomically increments XP for a user.
 * Safely creates the document if it doesn't exist, preventing null errors.
 */
export async function addXp(userId: string, amount: number) {
  if (!userId || amount <= 0) return;

  const ref = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);

  try {
    // Use setDoc with merge: true to ensuring the document exists
    // increment() works atomically on the server side
    await setDoc(ref, {
      xp: increment(amount),
      // We set a default level 1 if it doesn't exist implicitly via frontend logic,
      // but we don't overwrite it here if it exists.
      // Firestore doesn't have "set if missing" for fields in a merge easily,
      // but since we blindly increment XP, the frontend handles the display default.
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error adding XP:", error);
  }
}
