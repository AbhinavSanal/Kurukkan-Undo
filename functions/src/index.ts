import admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

type VoteType = "upvote" | "downvote";

const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION || "us-central1";
const REPORT_TTL_MINUTES = clamp(
  Number(process.env.REPORT_TTL_MINUTES ?? 25),
  20,
  30
);
const REPORT_COOLDOWN_SECONDS = Math.max(
  30,
  Number(process.env.REPORT_COOLDOWN_SECONDS ?? 90)
);

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function requireAuth(uid?: string) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before continuing.");
  }
  return uid;
}

function toAreaKey(latitude: number, longitude: number) {
  return `${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}`;
}

function readCoordinate(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpsError("invalid-argument", `${field} must be a number.`);
  }
  return parsed;
}

function sanitizeNote(value: unknown) {
  if (value == null) return "";
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "note must be text.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 140) {
    throw new HttpsError("invalid-argument", "Keep notes under 140 characters.");
  }
  return trimmed;
}

function voteField(voteType: VoteType) {
  return voteType === "upvote" ? "upvotes" : "downvotes";
}

export const createReport = onCall({ region: FUNCTIONS_REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const latitude = readCoordinate(request.data?.latitude, "latitude");
  const longitude = readCoordinate(request.data?.longitude, "longitude");

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new HttpsError("invalid-argument", "Coordinates are out of range.");
  }

  const note = sanitizeNote(request.data?.note);
  const now = Timestamp.now();
  const expiryTimestamp = Timestamp.fromMillis(
    now.toMillis() + REPORT_TTL_MINUTES * 60 * 1000
  );
  const areaKey = toAreaKey(latitude, longitude);
  const reportRef = db.collection("reports").doc();
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const lastReportAt = userSnapshot.get("lastReportAt") as
      | admin.firestore.Timestamp
      | undefined;

    if (
      lastReportAt &&
      now.toMillis() - lastReportAt.toMillis() < REPORT_COOLDOWN_SECONDS * 1000
    ) {
      throw new HttpsError(
        "resource-exhausted",
        `Please wait ${REPORT_COOLDOWN_SECONDS}s between reports.`
      );
    }

    const duplicateQuery = db
      .collection("reports")
      .where("areaKey", "==", areaKey)
      .where("expiryTimestamp", ">", now)
      .limit(1);
    const duplicateSnapshot = await transaction.get(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      throw new HttpsError(
        "already-exists",
        "A live report already exists in this area."
      );
    }

    transaction.set(reportRef, {
      id: reportRef.id,
      latitude,
      longitude,
      timestamp: now,
      expiryTimestamp,
      createdBy: uid,
      note,
      areaKey,
      upvotes: 0,
      downvotes: 0,
      updatedAt: now
    });

    transaction.set(
      userRef,
      {
        lastReportAt: now,
        lastAreaKey: areaKey,
        updatedAt: now
      },
      { merge: true }
    );
  });

  return { id: reportRef.id };
});

export const voteReport = onCall({ region: FUNCTIONS_REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const reportId = String(request.data?.reportId ?? "");
  const voteType = request.data?.voteType as VoteType;

  if (!reportId) {
    throw new HttpsError("invalid-argument", "reportId is required.");
  }
  if (voteType !== "upvote" && voteType !== "downvote") {
    throw new HttpsError("invalid-argument", "voteType must be upvote or downvote.");
  }

  const now = Timestamp.now();
  const reportRef = db.collection("reports").doc(reportId);
  const voteRef = db.collection("votes").doc(`${reportId}_${uid}`);
  let response = { upvotes: 0, downvotes: 0, currentVote: null as VoteType | null };

  await db.runTransaction(async (transaction) => {
    const [reportSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(reportRef),
      transaction.get(voteRef)
    ]);

    if (!reportSnapshot.exists) {
      throw new HttpsError("not-found", "Report does not exist.");
    }

    const report = reportSnapshot.data();
    const expiryTimestamp = report?.expiryTimestamp as
      | admin.firestore.Timestamp
      | undefined;
    if (!expiryTimestamp || expiryTimestamp.toMillis() <= now.toMillis()) {
      throw new HttpsError("failed-precondition", "This report has expired.");
    }

    const previousVote = voteSnapshot.exists
      ? (voteSnapshot.get("voteType") as VoteType)
      : null;
    const updates: Record<string, admin.firestore.FieldValue> = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (previousVote) {
      updates[voteField(previousVote)] = FieldValue.increment(-1);
    }

    let currentVote: VoteType | null = voteType;
    if (previousVote === voteType) {
      transaction.delete(voteRef);
      currentVote = null;
    } else {
      updates[voteField(voteType)] = FieldValue.increment(1);
      transaction.set(voteRef, {
        id: voteRef.id,
        reportId,
        userId: uid,
        voteType,
        timestamp: now
      });
    }

    transaction.update(reportRef, updates);

    const startingUpvotes = Number(report?.upvotes ?? 0);
    const startingDownvotes = Number(report?.downvotes ?? 0);
    response = {
      upvotes:
        startingUpvotes +
        (previousVote === "upvote" ? -1 : 0) +
        (previousVote !== voteType && voteType === "upvote" ? 1 : 0),
      downvotes:
        startingDownvotes +
        (previousVote === "downvote" ? -1 : 0) +
        (previousVote !== voteType && voteType === "downvote" ? 1 : 0),
      currentVote
    };
  });

  return response;
});

export const purgeExpiredReports = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every 5 minutes" },
  async () => {
    const now = Timestamp.now();
    const expired = await db
      .collection("reports")
      .where("expiryTimestamp", "<=", now)
      .limit(300)
      .get();

    for (const reportDoc of expired.docs) {
      const votes = await db
        .collection("votes")
        .where("reportId", "==", reportDoc.id)
        .limit(500)
        .get();
      const batch = db.batch();
      votes.docs.forEach((voteDoc) => batch.delete(voteDoc.ref));
      batch.delete(reportDoc.ref);
      await batch.commit();
    }
  }
);
