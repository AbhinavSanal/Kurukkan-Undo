import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Initialize admin access to bypass normal security rules
admin.initializeApp();
const db = admin.firestore();

// This function wakes up every 5 minutes automatically
export const cleanupExpiredReports = onSchedule("every 5 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now();
  
  // Find all reports where their expiry time has passed
  const expiredReportsQuery = db.collection("reports").where("expiryTimestamp", "<", now);
  const snapshot = await expiredReportsQuery.get();
  
  if (snapshot.empty) {
    console.log("No expired reports found. Map is clean.");
    return;
  }

  // Delete them all at once using a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Swept and deleted ${snapshot.size} expired reports.`);
});