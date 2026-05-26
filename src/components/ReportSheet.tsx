import { FormEvent, useEffect, useState } from "react";
import { Crosshair, Loader2, MapPin, Navigation, Send, X } from "lucide-react";
import { nearestLandmark } from "../lib/geo";
import type { Coordinates } from "../types";

interface ReportSheetProps {
  open: boolean;
  draftLocation: Coordinates | null;
  onDraftLocation: (point: Coordinates) => void;
  onPickOnMap: () => void;
  onClose: () => void;
  onSubmit: (note?: string) => Promise<void>;
}

export const ReportSheet = ({
  open,
  draftLocation,
  onDraftLocation,
  onPickOnMap,
  onClose,
  onSubmit
}: ReportSheetProps) => {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onDraftLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocating(false);
      },
      () => {
        setError("Could not read your location. Try selecting on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 15000 }
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draftLocation) return;

    setBusy(true);
    setError(null);
    try {
      await onSubmit(note);
      setNote("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Report failed."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
    >
      <form
        onSubmit={submit}
        className="mx-auto max-w-lg rounded-[1.75rem] border border-white/10 bg-ink/95 p-4 text-white shadow-panel backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Report Kurukkan</h2>
            <p className="text-sm text-white/45">Two taps when speed matters.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!draftLocation ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="flex min-h-28 flex-col items-start justify-between rounded-3xl border border-white/10 bg-white/[0.08] p-4 text-left transition hover:border-moss/50 disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-5 w-5 animate-spin text-moss" />
              ) : (
                <Navigation className="h-5 w-5 text-moss" />
              )}
              <span className="text-sm font-semibold">Use current location</span>
            </button>
            <button
              type="button"
              onClick={onPickOnMap}
              className="flex min-h-28 flex-col items-start justify-between rounded-3xl border border-white/10 bg-white/[0.08] p-4 text-left transition hover:border-moss/50"
            >
              <Crosshair className="h-5 w-5 text-signal" />
              <span className="text-sm font-semibold">Select on map</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-3xl border border-moss/20 bg-moss/10 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-moss text-ash">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {nearestLandmark(draftLocation)}
                </p>
                <p className="text-xs text-white/45">
                  {draftLocation.latitude.toFixed(5)}, {draftLocation.longitude.toFixed(5)}
                </p>
              </div>
            </div>

            <label className="block">
              <span className="sr-only">Optional note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 140))}
                placeholder="Optional note"
                rows={2}
                className="w-full resize-none rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-moss/60"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-3xl bg-moss px-4 py-3 font-semibold text-ash transition hover:bg-moss/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Submit report
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
};
