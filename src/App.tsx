import {
  Bell,
  BellRing,
  Layers,
  List,
  Loader2,
  LogOut,
  MapPinned,
  Plus,
  Radio,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { LiveFeed } from "./components/LiveFeed";
import { MapView } from "./components/MapView";
import { ReportSheet } from "./components/ReportSheet";
import { VoteButtons } from "./components/VoteButtons";
import { campusName, hasFirebaseConfig, hotScoreThreshold } from "./config";
import { useAuth } from "./hooks/useAuth";
import { useReports } from "./hooks/useReports";
import { useZoneNotifications } from "./hooks/useZoneNotifications";
import { nearestLandmark } from "./lib/geo";
import { formatRelativeTime, minutesUntil } from "./lib/time";
import type { Coordinates, Report, ViewMode, VoteType } from "./types";

const selectedReportText = (report: Report) => {
  const where = nearestLandmark(report);
  return where === "Campus road" ? "Kurukkan reported" : `Kurukkan ${where}`;
};

export default function App() {
  const {
    user,
    loading: authLoading,
    isDemoMode,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  } = useAuth();
  const { reports, userVotes, loading, error, createReport, vote } = useReports(
    user,
    isDemoMode
  );
  const zoneNotifications = useZoneNotifications(reports);

  const [view, setView] = useState<ViewMode>("map");
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [draftLocation, setDraftLocation] = useState<Coordinates | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedReportId = selectedReport?.id;
  const activeHotCount = useMemo(
    () =>
      reports.filter(
        (report) => report.upvotes - report.downvotes >= hotScoreThreshold
      ).length,
    [reports]
  );

  if (authLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ash text-white">
        <Loader2 className="h-8 w-8 animate-spin text-moss" />
      </main>
    );
  }

  if (!user) {
    return (
      <AuthGate
        onGoogle={signInWithGoogle}
        onEmailSignIn={signInWithEmail}
        onEmailSignUp={signUpWithEmail}
      />
    );
  }

  const openReportSheet = () => {
    setDraftLocation(null);
    setReportSheetOpen(true);
    setSelectMode(false);
  };

  const pickOnMap = () => {
    setReportSheetOpen(false);
    setSelectMode(true);
    setToast("Tap the map to place the report.");
    window.setTimeout(() => setToast(null), 2200);
  };

  const selectPoint = (point: Coordinates) => {
    setDraftLocation(point);
    setSelectMode(false);
    setReportSheetOpen(true);
  };

  const submitReport = async (note?: string) => {
    if (!draftLocation) return;
    await createReport({ ...draftLocation, note });
    setReportSheetOpen(false);
    setDraftLocation(null);
    setToast("Report live. Sookshikkuka.");
    window.setTimeout(() => setToast(null), 2400);
  };

  const selectReport = (report: Report) => {
    setSelectedReport(report);
    setView("map");
  };

  const castVote = async (reportId: string, voteType: VoteType) => {
    await vote(reportId, voteType);
  };

  const toggleZoneNotifications = async () => {
    if (zoneNotifications.enabled) {
      await zoneNotifications.toggle();
      setToast("Zone notifications off.");
      window.setTimeout(() => setToast(null), 2400);
      return;
    }

    const started = await zoneNotifications.toggle();
    setToast(
      started
        ? `Watching active zones within ${zoneNotifications.radiusMeters}m.`
        : "Could not start zone notifications. Check location and notification permission."
    );
    window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ash text-white">
      <MapView
        reports={reports}
        selectedReportId={selectedReportId}
        draftLocation={draftLocation}
        selectMode={selectMode}
        onSelectPoint={selectPoint}
        onReportSelect={setSelectedReport}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/20 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-normal">
                Kurukkan Undo?
              </h1>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-lg">
                🦊
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-moss">
              Sookshikkuka. · {campusName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/70 backdrop-blur sm:flex">
              <Radio className="h-3.5 w-3.5 text-moss" />
              {isDemoMode ? "Demo" : "Live"}
            </div>
            {!isDemoMode && (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-white/70 backdrop-blur"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>
      </div>

      {loading && (
        <div className="absolute left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/75 backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-moss" />
          Syncing
        </div>
      )}

      {selectMode && (
        <div className="absolute inset-x-0 top-24 z-30 mx-auto max-w-lg px-4">
          <div className="flex items-center justify-between rounded-full border border-moss/30 bg-ink/92 px-4 py-3 text-sm shadow-panel backdrop-blur">
            <span>Tap the exact spot on the map</span>
            <button
              type="button"
              onClick={() => setSelectMode(false)}
              title="Cancel"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {view === "feed" && (
        <LiveFeed
          reports={reports}
          userVotes={userVotes}
          onVote={castVote}
          onSelectReport={selectReport}
        />
      )}

      {selectedReport && view === "map" && (
        <section className="absolute inset-x-0 bottom-28 z-30 mx-auto max-w-lg px-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-ink/95 p-4 text-white shadow-panel backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">🦊 Kurukkan reported</p>
                <h2 className="mt-1 truncate text-lg font-semibold">
                  {selectedReportText(selectedReport)}
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  {formatRelativeTime(selectedReport.timestamp)} · expires in{" "}
                  {minutesUntil(selectedReport.expiryTimestamp)} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                title="Close report details"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-white/65"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selectedReport.note && (
              <p className="mb-3 rounded-2xl bg-white/7 px-3 py-2 text-sm text-white/70">
                {selectedReport.note}
              </p>
            )}
            <VoteButtons
              report={selectedReport}
              userVote={userVotes[selectedReport.id]}
              onVote={castVote}
            />
          </div>
        </section>
      )}

      {(toast || error || isDemoMode || !hasFirebaseConfig) && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-40 mx-auto max-w-lg px-4">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white/75 shadow-panel backdrop-blur">
            {toast || error || "Demo mode: add Firebase and Mapbox env vars for production sync."}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-ink/95 p-2 shadow-panel backdrop-blur-xl">
          <div className="flex rounded-[1.5rem] bg-black/25 p-1">
            <button
              type="button"
              onClick={() => setView("map")}
              title="Map"
              className={`flex h-11 items-center gap-2 rounded-[1.15rem] px-4 text-sm font-semibold transition ${
                view === "map" ? "bg-white text-ash" : "text-white/60"
              }`}
            >
              <MapPinned className="h-4 w-4" />
              Map
            </button>
            <button
              type="button"
              onClick={() => setView("feed")}
              title="Feed"
              className={`flex h-11 items-center gap-2 rounded-[1.15rem] px-4 text-sm font-semibold transition ${
                view === "feed" ? "bg-white text-ash" : "text-white/60"
              }`}
            >
              <List className="h-4 w-4" />
              Feed
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              title="Hot active zones"
              className="hidden h-11 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 text-sm text-white/70 sm:flex"
            >
              <Layers className="h-4 w-4 text-signal" />
              {activeHotCount}
            </div>
            <button
              type="button"
              onClick={openReportSheet}
              className="flex h-12 items-center gap-2 rounded-full bg-moss px-5 font-semibold text-ash shadow-[0_12px_34px_rgba(142,227,140,0.28)] transition hover:bg-moss/90"
            >
              <Plus className="h-5 w-5" />
              Report
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        title="Zone notifications"
        aria-pressed={zoneNotifications.enabled}
        className={`absolute right-4 top-24 z-20 grid h-11 w-11 place-items-center rounded-full border shadow-panel backdrop-blur transition ${
          zoneNotifications.enabled
            ? "border-moss/50 bg-moss text-ash"
            : "border-white/10 bg-black/45 text-white/65"
        }`}
        onClick={toggleZoneNotifications}
      >
        {zoneNotifications.enabled ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </button>

      <ReportSheet
        open={reportSheetOpen}
        draftLocation={draftLocation}
        onDraftLocation={setDraftLocation}
        onPickOnMap={pickOnMap}
        onClose={() => setReportSheetOpen(false)}
        onSubmit={submitReport}
      />
    </main>
  );
}
