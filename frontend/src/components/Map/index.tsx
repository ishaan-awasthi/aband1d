import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import Map, { MapRef } from 'react-map-gl/mapbox';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Location {
  lat: number;
  lng: number;
}

interface MapViewProps {
  locations?: Location[];
  initialView?: {
    latitude?: number;
    longitude?: number;
    zoom?: number;
    bearing?: number;
    pitch?: number;
  };
  // Map interaction settings
  scrollZoom?: boolean;
  boxZoom?: boolean;
  dragRotate?: boolean;
  dragPan?: boolean;
  keyboard?: boolean;
  doubleClickZoom?: boolean;
  touchZoomRotate?: boolean;
  touchPitch?: boolean;
  minZoom?: number;
  maxZoom?: number;
  minPitch?: number;
  maxPitch?: number;
  flyTo?: { lat: number; lng: number } | null;
}

const MapView = forwardRef(function MapView({
  locations = [],
  initialView,
  // Default settings for map interactions
  scrollZoom = false,
  boxZoom = false,
  dragRotate = false,
  dragPan = false,
  keyboard = false,
  doubleClickZoom = false,
  touchZoomRotate = false,
  touchPitch = false,
  minZoom = 0,
  maxZoom = 20,
  minPitch = 0,
  maxPitch = 85,
  flyTo,
  children
}: MapViewProps & { children?: React.ReactNode }, ref) {
  const defaultView = {
    latitude: 37.729,
    longitude: -122.36,
    zoom: 11,
    bearing: 0,
    pitch: 50
  };

  const mapRef = useRef<MapRef>(null);
  const currentLng = useRef(-122.36);
  const panningInterval = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current?.getMap()
  }));

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    // Only run background panning if dragPan is false AND flyTo is null (landing screen)
    if (!dragPan && !flyTo) {
      const pan = () => {
        const map = mapRef.current?.getMap();
        if (map) {
          currentLng.current += 0.0015;
          map.easeTo({
            center: [currentLng.current, 37.729],
            duration: 700,
            easing: t => t,
            essential: true
          });
        }
      };
      interval = setInterval(pan, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dragPan, flyTo]);

  // Explicitly enable/disable dragPan on the map instance, after map is loaded
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    function handleLoad() {
      if (!map) return;
      if (dragPan) {
        map.dragPan.enable();
        console.log("dragPan enabled (on load)");
      } else {
        map.dragPan.disable();
        console.log("dragPan disabled (on load)");
      }
    }

    if (map.on) map.on('load', handleLoad);
    // Also run immediately in case map is already loaded
    handleLoad();

    return () => {
      const cleanupMap = mapRef.current?.getMap();
      if (cleanupMap && cleanupMap.off) cleanupMap.off('load', handleLoad);
    };
  }, [dragPan]);

  useEffect(() => {
    if (flyTo && mapRef.current) {
      const map = mapRef.current.getMap();
      console.log('[MapView] flyTo useEffect triggered with flyTo:', flyTo);
      map.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: 13,
        duration: 1500,
        essential: true
      });
    }
  }, [flyTo]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ ...defaultView, ...initialView }}
      scrollZoom={dragPan}
      boxZoom={false}
      dragRotate={dragPan}
      dragPan={dragPan}
      keyboard={false}
      doubleClickZoom={dragPan}
      touchZoomRotate={dragPan}
      touchPitch={dragPan}
      minZoom={minZoom}
      maxZoom={maxZoom}
      minPitch={minPitch}
      maxPitch={maxPitch}
      mapStyle="mapbox://styles/mapbox/dark-v9"
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      {children}
    </Map>
  );
});

export default MapView;