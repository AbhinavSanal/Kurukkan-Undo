import { campusCenter } from "../config";
import type { Coordinates } from "../types";

export const toAreaKey = ({ latitude, longitude }: Coordinates) => {
  const latBucket = Math.round(latitude * 1000);
  const lngBucket = Math.round(longitude * 1000);
  return `${latBucket}:${lngBucket}`;
};

export const distanceMeters = (a: Coordinates, b: Coordinates) => {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const campusLandmarks = [
  { name: "Main Gate", latitude: campusCenter.latitude - 0.0014, longitude: campusCenter.longitude - 0.0006 },
  { name: "Library", latitude: campusCenter.latitude + 0.0006, longitude: campusCenter.longitude + 0.0004 },
  { name: "Canteen", latitude: campusCenter.latitude + 0.0001, longitude: campusCenter.longitude - 0.0011 },
  { name: "Admin Block", latitude: campusCenter.latitude - 0.0005, longitude: campusCenter.longitude + 0.0009 },
  { name: "Hostel Road", latitude: campusCenter.latitude + 0.0015, longitude: campusCenter.longitude - 0.0002 },
  { name: "Parking Circle", latitude: campusCenter.latitude - 0.001, longitude: campusCenter.longitude + 0.0012 }
];

export const nearestLandmark = (point: Coordinates) => {
  const nearest = campusLandmarks
    .map((landmark) => ({
      ...landmark,
      distance: distanceMeters(point, landmark)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest || nearest.distance > 450) return "Campus road";
  return nearest.distance < 80
    ? nearest.name
    : `near ${nearest.name}`;
};

export const clampToCampusViewport = (point: Coordinates) => {
  const maxDelta = 0.006;
  return {
    latitude: Math.min(
      campusCenter.latitude + maxDelta,
      Math.max(campusCenter.latitude - maxDelta, point.latitude)
    ),
    longitude: Math.min(
      campusCenter.longitude + maxDelta,
      Math.max(campusCenter.longitude - maxDelta, point.longitude)
    )
  };
};
