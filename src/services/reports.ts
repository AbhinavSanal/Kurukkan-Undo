import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import type { CreateReportInput, VoteType } from "../types";

export const createRemoteReport = async (input: CreateReportInput) => {
  if (!functions) throw new Error("Firebase Functions are not configured.");
  const callable = httpsCallable<CreateReportInput, { id: string }>(
    functions,
    "createReport"
  );
  const result = await callable({
    latitude: input.latitude,
    longitude: input.longitude,
    note: input.note?.trim() || undefined
  });
  return result.data.id;
};

export const voteRemoteReport = async (
  reportId: string,
  voteType: VoteType
) => {
  if (!functions) throw new Error("Firebase Functions are not configured.");
  const callable = httpsCallable<
    { reportId: string; voteType: VoteType },
    { upvotes: number; downvotes: number; currentVote: VoteType | null }
  >(functions, "voteReport");

  return callable({ reportId, voteType });
};
