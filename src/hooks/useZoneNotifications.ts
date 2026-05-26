import { useCallback, useEffect, useRef, useState } from "react";
import { zoneAlertRadiusMeters } from "../config";
import { distanceMeters, nearestLandmark } from "../lib/geo";
import type { Coordinates, Report } from "../types";

type ZoneNotificationStatus =
  | "idle"
  | "unsupported"
  | "permission-denied"
  | "watching"
  | "nearby"
  | "error";

const canNotify = () =>
  typeof window !== "undefined" && "Notification" in window;

export const useZoneNotifications = (reports: Report[]) => {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<ZoneNotificationStatus>("idle");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notifiedReportsRef = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setEnabled(false);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (!canNotify() || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Notifications or location are not available in this browser.");
      return false;
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission !== "granted") {
      setStatus("permission-denied");
      setError("Notification permission was not granted.");
      return false;
    }

    if (watchIdRef.current !== null) {
      setEnabled(true);
      setStatus("watching");
      return true;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (location) => {
        setPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setStatus("watching");
      },
      () => {
        setStatus("error");
        setError("Could not watch your location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 20000,
        timeout: 12000
      }
    );

    setEnabled(true);
    setStatus("watching");
    return true;
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      stop();
      return false;
    }

    return start();
  }, [enabled, start, stop]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!enabled || !position || !canNotify() || Notification.permission !== "granted") {
      return;
    }

    const nearestActiveReport = reports
      .map((report) => ({
        report,
        distance: distanceMeters(position, report)
      }))
      .filter(({ distance }) => distance <= zoneAlertRadiusMeters)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearestActiveReport) return;

    setStatus("nearby");
    const { report, distance } = nearestActiveReport;
    if (notifiedReportsRef.current.has(report.id)) return;

    notifiedReportsRef.current.add(report.id);
    try {
      new Notification("Kurukkan nearby", {
        body: `${nearestLandmark(report)} · ${Math.round(distance)}m away`,
        icon: "/favicon.svg",
        tag: `kurukkan-${report.id}`
      });
    } catch {
      setStatus("error");
      setError("The browser blocked the notification.");
    }
  }, [enabled, position, reports]);

  return {
    enabled,
    status,
    error,
    toggle,
    radiusMeters: zoneAlertRadiusMeters
  };
};
