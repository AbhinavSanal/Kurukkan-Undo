import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where
} from "firebase/firestore";
import {
  duplicateRadiusMeters,
  reportCooldownSeconds,
  reportTtlMinutes
} from "../config";
import { db, functions } from "../lib/firebase";
import { distanceMeters, nearestLandmark, toAreaKey } from "../lib/geo";
import { isExpired } from "../lib/time";
import { createRemoteReport, voteRemoteReport } from "../services/reports";
import type {
  AppUser,
  Coordinates,
  CreateReportInput,
  Report,
  VoteType
} from "../types";

const dateFromFirestore = (value: unknown) => {
  if (value instanceof Date) return value;
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "number" || typeof value === "string") {
    return new Date(value);
  }
  return new Date();
};

const seedDemoReports = (): Report[] => {
  const now = Date.now();
  return [
    {
      id: "demo-main-gate",
      latitude: 10.0455,
      longitude: 76.3182,
      timestamp: new Date(now - 2 * 60 * 1000),
      expiryTimestamp: new Date(now + 23 * 60 * 1000),
      createdBy: "demo-seed",
      note: "Checking near the entrance.",
      upvotes: 12,
      downvotes: 2,
      areaKey: "demo-main-gate"
    },
    {
      id: "demo-library",
      latitude: 10.0491,
      longitude: 76.3206,
      timestamp: new Date(now - 8 * 60 * 1000),
      expiryTimestamp: new Date(now + 17 * 60 * 1000),
      createdBy: "demo-seed",
      note: "Moving slowly.",
      upvotes: 7,
      downvotes: 1,
      areaKey: "demo-library"
    }
  ];
};

const reportFromDoc = (id: string, data: Record<string, unknown>): Report => ({
  id,
  latitude: Number(data.latitude),
  longitude: Number(data.longitude),
  timestamp: dateFromFirestore(data.timestamp),
  expiryTimestamp: dateFromFirestore(data.expiryTimestamp),
  createdBy: String(data.createdBy ?? ""),
  note: typeof data.note === "string" ? data.note : undefined,
  upvotes: Number(data.upvotes ?? 0),
  downvotes: Number(data.downvotes ?? 0),
  areaKey: typeof data.areaKey === "string" ? data.areaKey : undefined
});

export const useReports = (user: AppUser | null, isDemoMode: boolean) => {
  const [remoteReports, setRemoteReports] = useState<Report[]>([]);
  const [remoteVotes, setRemoteVotes] = useState<Record<string, VoteType>>({});
  const [demoReports, setDemoReports] = useState<Report[]>(seedDemoReports);
  const [demoVotes, setDemoVotes] = useState<Record<string, VoteType>>({});
  const [lastDemoReportAt, setLastDemoReportAt] = useState(0);
  const [loading, setLoading] = useState(Boolean(db && user && !isDemoMode));
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());

  const useRemote = Boolean(db && functions && user && !isDemoMode);
  const queryMinute = Math.floor(clock / 60000);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!useRemote || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const activeReportsQuery = query(
      collection(db, "reports"),
      where("expiryTimestamp", ">", Timestamp.fromMillis(Date.now())),
      orderBy("expiryTimestamp", "asc"),
      limit(200)
    );

    return onSnapshot(
      activeReportsQuery,
      (snapshot) => {
        const now = new Date();
        const reports = snapshot.docs
          .map((doc) => reportFromDoc(doc.id, doc.data()))
          .filter((report) => !isExpired(report.expiryTimestamp, now))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setRemoteReports(reports);
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );
  }, [queryMinute, useRemote]);

  useEffect(() => {
    if (!useRemote || !db || !user) return;

    const votesQuery = query(
      collection(db, "votes"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(votesQuery, (snapshot) => {
      const votes: Record<string, VoteType> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          typeof data.reportId === "string" &&
          (data.voteType === "upvote" || data.voteType === "downvote")
        ) {
          votes[data.reportId] = data.voteType;
        }
      });
      setRemoteVotes(votes);
    });
  }, [user, useRemote]);

  const visibleDemoReports = useMemo(() => {
    const now = new Date(clock);
    return demoReports
      .filter((report) => !isExpired(report.expiryTimestamp, now))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [clock, demoReports]);

  const reports = useRemote ? remoteReports : visibleDemoReports;
  const userVotes = useRemote ? remoteVotes : demoVotes;

  const createReport = useCallback(
    async (input: CreateReportInput) => {
      if (!user) throw new Error("Sign in before reporting.");

      const note = input.note?.trim();
      if (note && note.length > 140) {
        throw new Error("Keep notes under 140 characters.");
      }

      if (useRemote) {
        return createRemoteReport({ ...input, note });
      }

      const now = Date.now();
      if (now - lastDemoReportAt < reportCooldownSeconds * 1000) {
        throw new Error(`Please wait ${reportCooldownSeconds}s between reports.`);
      }

      const duplicate = visibleDemoReports.find(
        (report) =>
          distanceMeters(report, input) <= duplicateRadiusMeters &&
          !isExpired(report.expiryTimestamp)
      );
      if (duplicate) {
        throw new Error(`A live report already exists ${nearestLandmark(duplicate)}.`);
      }

      const id = `demo-${now}`;
      const created: Report = {
        id,
        latitude: input.latitude,
        longitude: input.longitude,
        timestamp: new Date(now),
        expiryTimestamp: new Date(now + reportTtlMinutes * 60 * 1000),
        createdBy: user.uid,
        note,
        upvotes: 0,
        downvotes: 0,
        areaKey: toAreaKey(input)
      };

      setDemoReports((current) => [created, ...current]);
      setLastDemoReportAt(now);
      return id;
    },
    [
      duplicateRadiusMeters,
      lastDemoReportAt,
      reportCooldownSeconds,
      reportTtlMinutes,
      user,
      useRemote,
      visibleDemoReports
    ]
  );

  const vote = useCallback(
    async (reportId: string, voteType: VoteType) => {
      if (!user) throw new Error("Sign in before voting.");

      if (useRemote) {
        await voteRemoteReport(reportId, voteType);
        return;
      }

      setDemoReports((current) =>
        current.map((report) => {
          if (report.id !== reportId) return report;
          const previousVote = demoVotes[reportId];
          const next = { ...report };

          if (previousVote === "upvote") next.upvotes -= 1;
          if (previousVote === "downvote") next.downvotes -= 1;
          if (previousVote !== voteType) {
            if (voteType === "upvote") next.upvotes += 1;
            if (voteType === "downvote") next.downvotes += 1;
          }

          return next;
        })
      );

      setDemoVotes((current) => {
        if (current[reportId] === voteType) {
          const { [reportId]: _removed, ...rest } = current;
          return rest;
        }
        return { ...current, [reportId]: voteType };
      });
    },
    [demoVotes, user, useRemote]
  );

  return {
    reports,
    userVotes,
    loading,
    error,
    createReport,
    vote
  };
};
