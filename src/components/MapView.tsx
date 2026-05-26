import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSONSource, Map, MapLayerMouseEvent } from "mapbox-gl";
import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  campusCenter,
  hasMapboxToken,
  hotScoreThreshold,
  mapboxToken
} from "../config";
import { clampToCampusViewport } from "../lib/geo";
import type { Coordinates, Report } from "../types";

interface MapViewProps {
  reports: Report[];
  selectedReportId?: string;
  draftLocation: Coordinates | null;
  selectMode: boolean;
  onSelectPoint: (point: Coordinates) => void;
  onReportSelect: (report: Report) => void;
}

const reportCollection = (reports: Report[]) => ({
  type: "FeatureCollection" as const,
  features: reports.map((report) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [report.longitude, report.latitude]
    },
    properties: {
      id: report.id,
      emoji: "🦊",
      score: report.upvotes - report.downvotes
    }
  }))
});

const selectedCollection = (draftLocation: Coordinates | null) => ({
  type: "FeatureCollection" as const,
  features: draftLocation
    ? [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [draftLocation.longitude, draftLocation.latitude]
          },
          properties: { id: "draft" }
        }
      ]
    : []
});

export const MapView = ({
  reports,
  selectedReportId,
  draftLocation,
  selectMode,
  onSelectPoint,
  onReportSelect
}: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const loadedRef = useRef(false);
  const selectModeRef = useRef(selectMode);
  const reportsRef = useRef(reports);
  const draftLocationRef = useRef(draftLocation);
  const onSelectPointRef = useRef(onSelectPoint);
  const onReportSelectRef = useRef(onReportSelect);

  const reportsGeoJson = useMemo(() => reportCollection(reports), [reports]);
  const selectedGeoJson = useMemo(
    () => selectedCollection(draftLocation),
    [draftLocation]
  );

  useEffect(() => {
    selectModeRef.current = selectMode;
  }, [selectMode]);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    draftLocationRef.current = draftLocation;
  }, [draftLocation]);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onReportSelectRef.current = onReportSelect;
  }, [onReportSelect]);

  useEffect(() => {
    if (!hasMapboxToken || !containerRef.current || mapRef.current) return;

    let disposed = false;

    void import("mapbox-gl").then((module) => {
      if (disposed || !containerRef.current) return;
      const mapboxgl = module.default;
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [campusCenter.longitude, campusCenter.latitude],
        zoom: 16,
        pitch: 35,
        attributionControl: false
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );

      map.on("load", () => {
        loadedRef.current = true;
        map.addSource("reports", {
          type: "geojson",
          data: reportCollection(reportsRef.current),
          cluster: true,
          clusterRadius: 44,
          clusterMaxZoom: 15
        });

        map.addLayer({
          id: "report-clusters",
          type: "circle",
          source: "reports",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#2FAE66", 8, "#FFB020", 18, "#FF5D5D"],
            "circle-radius": ["step", ["get", "point_count"], 18, 8, 24, 18, 30],
            "circle-opacity": 0.92,
            "circle-stroke-color": "rgba(255,255,255,0.78)",
            "circle-stroke-width": 1
          }
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "reports",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13
          },
          paint: {
            "text-color": "#061006"
          }
        });

        map.addLayer({
          id: "hot-zone",
          type: "circle",
          source: "reports",
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            [">=", ["get", "score"], hotScoreThreshold]
          ],
          paint: {
            "circle-color": "#FFB020",
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "score"],
              hotScoreThreshold,
              52,
              20,
              96
            ],
            "circle-opacity": 0.14,
            "circle-stroke-color": "#FFB020",
            "circle-stroke-opacity": 0.45,
            "circle-stroke-width": 1
          }
        });

        map.addLayer({
          id: "report-pin-halo",
          type: "circle",
          source: "reports",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#FFB020",
            "circle-radius": ["interpolate", ["linear"], ["get", "score"], -4, 16, 8, 22],
            "circle-opacity": 0.22,
            "circle-stroke-color": "#FFB020",
            "circle-stroke-width": 1
          }
        });

        map.addLayer({
          id: "report-pin",
          type: "symbol",
          source: "reports",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "emoji"],
            "text-size": 30,
            "text-allow-overlap": true
          }
        });

        map.addSource("selected-location", {
          type: "geojson",
          data: selectedCollection(draftLocationRef.current)
        });

        map.addLayer({
          id: "selected-location-ring",
          type: "circle",
          source: "selected-location",
          paint: {
            "circle-color": "#8EE38C",
            "circle-radius": 18,
            "circle-opacity": 0.25,
            "circle-stroke-color": "#8EE38C",
            "circle-stroke-width": 2
          }
        });

        map.addLayer({
          id: "selected-location-dot",
          type: "circle",
          source: "selected-location",
          paint: {
            "circle-color": "#8EE38C",
            "circle-radius": 5,
            "circle-stroke-color": "#061006",
            "circle-stroke-width": 2
          }
        });
      });

      map.on("click", (event) => {
        if (!selectModeRef.current) return;
        onSelectPointRef.current({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng
        });
      });

      map.on("click", "report-pin", (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        const report = reportsRef.current.find((item) => item.id === id);
        if (report) onReportSelectRef.current(report);
      });

      map.on("click", "report-clusters", (event: MapLayerMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: ["report-clusters"]
        });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource("reports") as GeoJSONSource;
        if (typeof clusterId !== "number") return;
        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error || zoom == null) return;
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: coordinates as [number, number], zoom });
        });
      });

      const pointerLayers = ["report-pin", "report-clusters"];
      pointerLayers.forEach((layer) => {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = selectModeRef.current ? "crosshair" : "";
        });
      });

      mapRef.current = map;
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("reports") as GeoJSONSource | undefined;
    source?.setData(reportsGeoJson);
  }, [reportsGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("selected-location") as GeoJSONSource | undefined;
    source?.setData(selectedGeoJson);
  }, [selectedGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedReportId) return;
    const selected = reports.find((report) => report.id === selectedReportId);
    if (selected) {
      map.easeTo({
        center: [selected.longitude, selected.latitude],
        zoom: Math.max(map.getZoom(), 16.6),
        duration: 650
      });
    }
  }, [reports, selectedReportId]);

  if (!hasMapboxToken) {
    return (
      <FallbackCampusMap
        reports={reports}
        draftLocation={draftLocation}
        selectMode={selectMode}
        onSelectPoint={onSelectPoint}
        onReportSelect={onReportSelect}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${selectMode ? "cursor-crosshair" : ""}`}
      aria-label="Campus report map"
    />
  );
};

const FallbackCampusMap = ({
  reports,
  draftLocation,
  selectMode,
  onSelectPoint,
  onReportSelect
}: Omit<MapViewProps, "selectedReportId">) => {
  const position = (point: Coordinates) => {
    const latitude = 50 - (point.latitude - campusCenter.latitude) * 15000;
    const longitude = 50 + (point.longitude - campusCenter.longitude) * 15000;
    return {
      top: `${Math.min(90, Math.max(10, latitude))}%`,
      left: `${Math.min(90, Math.max(10, longitude))}%`
    };
  };

  const selectPoint = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!selectMode) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const point = clampToCampusViewport({
      latitude: campusCenter.latitude + (0.5 - y) / 15000,
      longitude: campusCenter.longitude + (x - 0.5) / 15000
    });
    onSelectPoint(point);
  };

  return (
    <div
      onClick={selectPoint}
      className={`absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(142,227,140,0.14),transparent_34%),linear-gradient(135deg,#060806,#111611)] text-left ${
        selectMode ? "cursor-crosshair" : "cursor-default"
      }`}
      aria-label="Fallback campus map"
    >
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[10%] right-[8%] top-[48%] h-3 rotate-[-8deg] rounded-full bg-white/10" />
      <div className="absolute bottom-[18%] left-[30%] top-[12%] w-3 rotate-[18deg] rounded-full bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-moss/25 bg-moss/5" />
      {reports
        .filter((report) => report.upvotes - report.downvotes >= hotScoreThreshold)
        .map((report) => (
          <span
            key={`${report.id}-hot`}
            className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-signal/35 bg-signal/10 shadow-[0_0_70px_rgba(255,176,32,0.32)]"
            style={position(report)}
            aria-hidden="true"
          />
        ))}
      {reports.map((report) => (
        <span
          key={report.id}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onReportSelect(report);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onReportSelect(report);
          }}
          className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-signal/15 text-3xl shadow-[0_0_30px_rgba(255,176,32,0.45)]"
          style={position(report)}
          aria-label="Kurukkan report pin"
        >
          🦊
        </span>
      ))}
      {draftLocation && (
        <span
          className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-moss bg-moss/20"
          style={position(draftLocation)}
          aria-label="Selected report location"
        />
      )}
      <div className="absolute left-5 top-28 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/55 backdrop-blur">
        Add a Mapbox token for the live map.
      </div>
    </div>
  );
};
