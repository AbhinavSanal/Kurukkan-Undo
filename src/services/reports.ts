import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { CreateReportInput, Report, VoteType } from "../types";

// The Firestore collection name
const REPORTS_COLLECTION = "reports";
const VOTES_COLLECTION = "votes";

/**
 * Creates a new Kurukkan report in Firestore
 */
export const createReportInDb = async (
  input: CreateReportInput,
  userId: string
): Promise<string> => {
  if (!db) throw new Error("Firebase not initialized");

  // Calculate expiry time (e.g., 30 minutes from now)
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 30);

  const reportData = {
    latitude: input.latitude,
    longitude: input.longitude,
    note: input.note || "",
    createdBy: userId,
    timestamp: serverTimestamp(),
    expiryTimestamp: Timestamp.fromDate(expiryTime),
    upvotes: 0,
    downvotes: 0,
  };

  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
  return docRef.id;
};

/**
 * Listens to active reports in real-time
 */
export const subscribeToReports = (
  onUpdate: (reports: Report[]) => void,
  onError: (error: Error) => void
) => {
  if (!db) {
    onError(new Error("Firebase not initialized"));
    return () => {};
  }

  // Only get reports that haven't expired yet
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where("expiryTimestamp", ">", Timestamp.now())
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports: Report[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          latitude: data.latitude,
          longitude: data.longitude,
          note: data.note,
          createdBy: data.createdBy,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          timestamp: data.timestamp?.toDate() || new Date(),
          expiryTimestamp: data.expiryTimestamp?.toDate() || new Date(),
        };
      });
      onUpdate(reports);
    },
    onError
  );
};

/**
 * Handles upvoting or downvoting a report safely using Firestore Transactions
 */
export const castVoteInDb = async (
  reportId: string,
  userId: string,
  voteType: VoteType
) => {
  if (!db) throw new Error("Firebase not initialized");

  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const voteRef = doc(db, `${REPORTS_COLLECTION}/${reportId}/${VOTES_COLLECTION}`, userId);

  await runTransaction(db, async (transaction) => {
    const reportDoc = await transaction.get(reportRef);
    const voteDoc = await transaction.get(voteRef);

    if (!reportDoc.exists()) {
      throw new Error("Report does not exist!");
    }

    const currentUpvotes = reportDoc.data().upvotes || 0;
    const currentDownvotes = reportDoc.data().downvotes || 0;

    let newUpvotes = currentUpvotes;
    let newDownvotes = currentDownvotes;

    if (voteDoc.exists()) {
      const previousVote = voteDoc.data().type;
      if (previousVote === voteType) {
        // User is clicking the same vote again, ignore or remove vote (let's keep it simple and ignore for now)
        return;
      }
      
      // Reversing previous vote
      if (previousVote === "upvote") newUpvotes--;
      if (previousVote === "downvote") newDownvotes--;
    }

    // Apply new vote
    if (voteType === "upvote") newUpvotes++;
    if (voteType === "downvote") newDownvotes++;

    // Update the vote record and the report counts
    transaction.set(voteRef, { type: voteType, timestamp: serverTimestamp() });
    transaction.update(reportRef, {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
    });
  });
};
