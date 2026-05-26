import { Flame, MapPin } from "lucide-react";
import { hotScoreThreshold } from "../config";
import { nearestLandmark } from "../lib/geo";
import { formatRelativeTime, minutesUntil } from "../lib/time";
import type { Report, VoteType } from "../types";
import { VoteButtons } from "./VoteButtons";

interface LiveFeedProps {
  reports: Report[];
  userVotes: Record<string, VoteType>;
  onVote: (reportId: string, voteType: VoteType) => Promise<void>;
  onSelectReport: (report: Report) => void;
}

export const LiveFeed = ({
  reports,
  userVotes,
  onVote,
  onSelectReport
}: LiveFeedProps) => {
  const now = new Date();

  return (
    <section className="absolute inset-x-0 bottom-0 top-24 z-20 mx-auto max-w-lg px-3 pb-24">
      <div className="h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink/94 text-white shadow-panel backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Live Feed</h2>
            <p className="text-xs text-white/45">{reports.length} active reports</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-xl">
            🦊
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="grid h-[calc(100%-4rem)] place-items-center px-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/[0.08] text-3xl">
                🦊
              </div>
              <p className="font-semibold">All clear for now</p>
              <p className="mt-1 text-sm text-white/45">
                New reports appear here instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100%-4rem)] overflow-y-auto">
            {reports.map((report) => {
              const score = report.upvotes - report.downvotes;
              const isHot = score >= hotScoreThreshold;
              return (
                <article
                  key={report.id}
                  className="border-b border-white/[0.08] px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectReport(report)}
                      className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal/15 text-2xl"
                      title="Show on map"
                    >
                      🦊
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectReport(report)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          Kurukkan {nearestLandmark(report)}
                        </p>
                        {isHot && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-semibold text-signal">
                            <Flame className="h-3 w-3" />
                            hot
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                        <MapPin className="h-3 w-3" />
                        {formatRelativeTime(report.timestamp, now)} · expires in{" "}
                        {minutesUntil(report.expiryTimestamp, now)} min
                      </p>
                      {report.note && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/65">
                          {report.note}
                        </p>
                      )}
                    </button>
                    <VoteButtons
                      report={report}
                      userVote={userVotes[report.id]}
                      onVote={onVote}
                      compact
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
