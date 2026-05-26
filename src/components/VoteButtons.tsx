import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Report, VoteType } from "../types";

interface VoteButtonsProps {
  report: Report;
  userVote?: VoteType;
  compact?: boolean;
  onVote: (reportId: string, voteType: VoteType) => Promise<void>;
}

export const VoteButtons = ({
  report,
  userVote,
  compact = false,
  onVote
}: VoteButtonsProps) => {
  const [pendingVote, setPendingVote] = useState<VoteType | null>(null);
  const netScore = report.upvotes - report.downvotes;

  const vote = async (voteType: VoteType) => {
    try {
      setPendingVote(voteType);
      await onVote(report.id, voteType);
    } finally {
      setPendingVote(null);
    }
  };

  return (
    <div
      className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}
      aria-label={`Score ${netScore}`}
    >
      <button
        type="button"
        onClick={() => vote("upvote")}
        disabled={pendingVote !== null}
        title="Upvote"
        className={`grid place-items-center rounded-full border transition ${
          compact ? "h-8 w-8" : "h-10 w-10"
        } ${
          userVote === "upvote"
            ? "border-moss bg-moss text-ash"
            : "border-white/[0.12] bg-white/[0.08] text-white hover:border-moss/60"
        }`}
      >
        <ChevronUp className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
      <div className={compact ? "min-w-8 text-center" : "min-w-12 text-center"}>
        <div className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
          {netScore > 0 ? `+${netScore}` : netScore}
        </div>
        {!compact && (
          <div className="text-[11px] text-white/45">
            {report.upvotes}/{report.downvotes}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => vote("downvote")}
        disabled={pendingVote !== null}
        title="Downvote"
        className={`grid place-items-center rounded-full border transition ${
          compact ? "h-8 w-8" : "h-10 w-10"
        } ${
          userVote === "downvote"
            ? "border-danger bg-danger text-white"
            : "border-white/[0.12] bg-white/[0.08] text-white hover:border-danger/60"
        }`}
      >
        <ChevronDown className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </div>
  );
};
