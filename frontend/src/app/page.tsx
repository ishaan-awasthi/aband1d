"use client";

import { useState, useEffect, useRef } from "react";
import MapView from "@/components/Map";
import { Imbue, Manrope } from "next/font/google";
import PolygonDraw from "@/components/PolygonDraw";
import { Source, Layer } from 'react-map-gl/mapbox';
import bbox from '@turf/bbox';
import center from '@turf/center';
import PolygonShimmer from "@/components/Shimmer";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const imbue = Imbue({ subsets: ["latin"], weight: ["400"] });
const manrope = Manrope({ subsets: ["latin"], weight: ["400"] });

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8000'
  : 'https://aband1d.onrender.com';

const polygonLayer = {
  id: 'selected-polygon',
  type: 'fill' as const,
  paint: {
    'fill-color': '#fbb13a',
    'fill-opacity': 0.3,
  },
};

const outlineLayer = {
  id: 'selected-polygon-outline',
  type: 'line' as const,
  paint: {
    'line-color': '#fbb13a',
    'line-width': 2,
  },
};

export default function Home() {
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [hideOverlay, setHideOverlay] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  const [instructionsFadingOut, setInstructionsFadingOut] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState<number[][] | null>(null);
  const [focusing, setFocusing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmOptions, setShowConfirmOptions] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showScanningText, setShowScanningText] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{ lat: number; lng: number; filename: string; caption?: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [scanAttempted, setScanAttempted] = useState(false);
  const [showNoAnomaliesOverlay, setShowNoAnomaliesOverlay] = useState(false);
  const [noAnomaliesVisible, setNoAnomaliesVisible] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [noAnomaliesFadingOut, setNoAnomaliesFadingOut] = useState(false);

  const mapViewRef = useRef<{ getMap: () => mapboxgl.Map | undefined }>(null);

  // Use Mapbox Geocoding API
  async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
    if (!query) return null;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSearching(true);
    const coords = await geocodeLocation(location);
    if (!coords) {
      setError("Could not find that location.");
      setSearching(false);
      return;
    }
    setFlyTo(coords);
  };

  // Hide overlay after fade-out transition
  useEffect(() => {
    if (searching) {
      const timeout = setTimeout(() => {
        setHideOverlay(true);
        setTimeout(() => {
          setShowInstructions(true);
          setTimeout(() => setInstructionsVisible(true), 50); // trigger fade-in
        }, 1000);
      }, 750);
      return () => clearTimeout(timeout);
    } else {
      setHideOverlay(false);
      setShowInstructions(false);
      setInstructionsVisible(false);
      setInstructionsFadingOut(false);
    }
  }, [searching]);

  // Fade out instructions when a region is selected
  useEffect(() => {
    if (selectedPolygon) {
      setInstructionsFadingOut(true);
      setTimeout(() => {
        setShowInstructions(false);
        setInstructionsVisible(false);
        setInstructionsFadingOut(false);
      }, 300); // match transition duration
    }
  }, [selectedPolygon]);

  // When selectedPolygon changes, fit bounds and set pitch
  useEffect(() => {
    if (selectedPolygon && mapViewRef.current) {
      setFocusing(true);
      setShowConfirm(false);
      const map = mapViewRef.current.getMap();
      if (map) {
        const feature = {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [selectedPolygon]
          },
          properties: {}
        };
        const [minLng, minLat, maxLng, maxLat] = bbox(feature);
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat]
          ],
          { padding: 40, duration: 2000, pitch: 0 }
        );
        setTimeout(() => {
          setFocusing(false);
          setShowConfirm(true);
        }, 2000);
      }
    }
  }, [selectedPolygon]);

  // Fade in confirm options after confirm text
  useEffect(() => {
    if (showConfirm) {
      setShowConfirmOptions(false);
      const timeout = setTimeout(() => setShowConfirmOptions(true), 500); // 500ms delay
      return () => clearTimeout(timeout);
    } else {
      setShowConfirmOptions(false);
    }
  }, [showConfirm]);

  // After scan completes, always zoom into the region (zoom 15)
  useEffect(() => {
    console.log('[post-scan useEffect] running', {
      scanning,
      scanAttempted,
      selectedPolygon,
      showScanningText,
      scanResultsLength: scanResults.length,
      isRescanning
    });
    if (!isRescanning && !scanning && scanAttempted && selectedPolygon && !showScanningText) {
      const map = mapViewRef.current?.getMap();
      if (map) {
        const feature = {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [selectedPolygon]
          },
          properties: {}
        };
        const centerFeature = center(feature);
        const [centerLng, centerLat] = centerFeature.geometry.coordinates;
        // If no results, pitch to 0. If results, keep current pitch.
        if (scanResults.length === 0) {
          console.log('[post-scan useEffect] flyTo (no results)', { centerLng, centerLat, zoom: 15, pitch: 0 });
          map.flyTo({
            center: [centerLng, centerLat],
            zoom: 15,
            pitch: 0,
            duration: 1500,
            essential: true
          });
        } else if (scanResults.length > 0) {
          console.log('[post-scan useEffect] flyTo (results found)', { centerLng, centerLat, zoom: 15 });
          map.flyTo({
            center: [centerLng, centerLat],
            zoom: 15,
            duration: 1500,
            essential: true
          });
        }
      }
    }
  }, [scanning, scanAttempted, selectedPolygon, showScanningText, scanResults, isRescanning]);

  // On 'yes' (rescan), zoom out and pitch as before
  const handleYes = () => {
    setNoAnomaliesFadingOut(true);
    setTimeout(() => {
      setShowNoAnomaliesOverlay(false);
      setNoAnomaliesVisible(false);
      setNoAnomaliesFadingOut(false);
    }, 1500); // match camera animation

    setShowConfirm(false);
    setShowConfirmOptions(false);
    setScanResults([]);
    setIsRescanning(true);

    // Animate camera back out (fixed zoom and pitch for dramatic effect)
    if (mapViewRef.current && flyTo && selectedPolygon) {
      const map = mapViewRef.current.getMap();
      if (map) {
        const feature = {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [selectedPolygon]
          },
          properties: {}
        };
        const centerFeature = center(feature);
        const [centerLng, centerLat] = centerFeature.geometry.coordinates;
        const randomBearing = Math.random() * 2 - 1; // -1 to 1 degrees
        console.log('[handleYes] About to flyTo (rescan):', { centerLng, centerLat, zoom: 13, pitch: 50, bearing: randomBearing });
        map.flyTo({
          center: [centerLng, centerLat],
          zoom: 13, // even less dramatic zoom
          pitch: 50,
          bearing: randomBearing,
          duration: 1500,
          essential: true
        });
        setTimeout(() => {
          console.log('[handleYes] After flyTo (rescan):', { zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
        }, 1600);
      }
    }

    // After zoom-out, show scanning animation, then after 3s, start backend scan
    setTimeout(() => {
      setScanning(true);
      setShowScanningText(true);
      setTimeout(() => {
        if (selectedPolygon) {
          fetch(`${API_BASE}/api/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              coordinates: selectedPolygon
            }),
          })
          .then(async response => {
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.error) {
              setScanning(false);
              setShowScanningText(false);
              setIsRescanning(false);
              return;
            }

            setScanResults(data.results);
            setScanning(false);
            setShowScanningText(false);
            setScanAttempted(true); // <-- Only set to true after scan completes
            setIsRescanning(false);
          })
          .catch(error => {
            setScanning(false);
            setShowScanningText(false);
            setScanAttempted(true); // <-- Also set to true on error
            setIsRescanning(false);
          });
        }
      }, 3000); // 3s scanning animation before backend call
    }, 1500); // 1.5s zoom-out duration
  };

  // On 'no', return to original search location and pitch for region selection
  const handleNo = () => {
    setNoAnomaliesFadingOut(true);
    setTimeout(() => {
      setShowNoAnomaliesOverlay(false);
      setNoAnomaliesVisible(false);
      setNoAnomaliesFadingOut(false);
    }, 1500); // match camera animation

    setShowConfirm(false);
    setShowConfirmOptions(false);
    setSelectedPolygon(null);
    setScanAttempted(false);
    setShowNoAnomaliesOverlay(false);
    // Reset camera to post-search view
    if (mapViewRef.current && flyTo) {
      const map = mapViewRef.current.getMap();
      if (map) {
        map.flyTo({
          center: [flyTo.lng, flyTo.lat],
          zoom: 13,
          pitch: 50,
          duration: 1500,
          essential: true
        });
      }
    }
    // Fade instructions back in after camera and confirm overlay fade out
    setTimeout(() => {
      setShowInstructions(true);
      setTimeout(() => setInstructionsVisible(true), 50); // trigger fade-in
    }, 1600); // camera (1500ms) + overlay fade (100ms buffer)
  };

  // Compute centroid for radar overlay
  let radarLng = null, radarLat = null;
  if (selectedPolygon) {
    const feature = {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [selectedPolygon]
      },
      properties: {}
    };
    const centerFeature = center(feature);
    [radarLng, radarLat] = centerFeature.geometry.coordinates;
  }

  // Only render /test-style pins at backend-generated coordinates
  useEffect(() => {
    const map = mapViewRef.current?.getMap();
    if (!map) return;

    // Clean up previous markers
    markers.forEach(marker => marker.remove());

    if (!scanResults.length) {
      setMarkers([]);
      return;
    }

    // For each backend-generated coordinate, create a simple satellite image marker
    const newMarkers: mapboxgl.Marker[] = [];
    
    scanResults.forEach((result, index) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundImage = `url(${API_BASE}/images/${result.filename})`;
        el.style.backgroundSize = 'cover';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s ease';

        // Coordinates as title, caption as description
        const popupContent = `
          <div class="${manrope.className}" style="padding: 5px; font-size: 14px; max-width: 200px;">
            <div style="font-family: monospace; font-weight: bold; margin-bottom: 6px; font-size: 12px; color: #fbb13a;">
              ${result.lat?.toFixed(6)}, ${result.lng?.toFixed(6)}
            </div>
            <img src="${API_BASE}/images/${result.filename}" alt="Satellite image" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 8px;" />
            <div style="margin: 0; color: #e0e0e0; font-size: 13px; font-style: ${result.caption === 'No description available.' ? 'italic' : 'normal'}; opacity: ${result.caption === 'No description available.' ? 0.7 : 1};">
              ${result.caption ? result.caption : "No description available."}
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ 
          offset: 35,
          closeButton: false,
          className: 'custom-popup'
         }).setHTML(popupContent);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([result.lng, result.lat])
          .setPopup(popup)
          .addTo(map);

        newMarkers.push(marker);
        setMarkers(prev => [...prev, marker]);

        // Animate in the marker
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }, index * 100); // 100ms delay between each marker
    });
    
  }, [scanResults]);

  // --- RESTORE NO ANOMALIES OVERLAY EFFECT ---
  useEffect(() => {
    if (
      scanAttempted &&
      !scanning &&
      scanResults.length === 0 &&
      selectedPolygon &&
      !showScanningText
    ) {
      setShowNoAnomaliesOverlay(true);
      setTimeout(() => setNoAnomaliesVisible(true), 50); // triggers fade-in
    } else {
      setShowNoAnomaliesOverlay(false);
      setNoAnomaliesVisible(false);
    }
  }, [scanAttempted, scanning, scanResults, selectedPolygon, showScanningText]);
  // --- END RESTORE ---

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* Map as background */}
      <div className="absolute inset-0 z-0">
        <MapView
          ref={mapViewRef}
          flyTo={flyTo}
          dragPan={!!flyTo && !focusing && !showConfirm && !showNoAnomaliesOverlay}
        >
          {showInstructions && instructionsVisible && !selectedPolygon && (
            <PolygonDraw onComplete={setSelectedPolygon} />
          )}
          {selectedPolygon && (
            <Source
              id="selected-polygon"
              type="geojson"
              data={{
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [selectedPolygon],
                },
                properties: {},
              }}
            >
              <Layer {...polygonLayer} />
              <Layer {...outlineLayer} />
            </Source>
          )}
        </MapView>
      </div>

      {/* Instructions text (always mounted for fade in/out) */}
      <div
        className={`absolute top-8 left-0 right-0 text-center pointer-events-none transition-opacity duration-300 ${
          showInstructions && instructionsVisible && !instructionsFadingOut ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h2
          className={`text-2xl text-white drop-shadow-lg ${imbue.className}`}
          style={{ letterSpacing: "0.04em", textTransform: "lowercase" }}
        >
          click to select a region to scan
        </h2>
      </div>

      {/* Content overlay */}
      {!hideOverlay && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center p-8 sm:p-16 overflow-auto transition-opacity duration-700 ${searching ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}
          style={{ display: hideOverlay ? 'none' : undefined }}
        >
          <div className="w-full max-w-md space-y-8">
            <h1
              className={`text-4xl sm:text-6xl font-bold text-white drop-shadow-lg text-center mb-8 ${imbue.className}`}
              style={{ letterSpacing: "0.04em" }}
            >
              aband1d
            </h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
        <input
          type="text"
                placeholder="enter a location/coords and hit enter"
          value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`w-full text-base px-0 py-1 border-0 border-b border-white/60 dark:border-white/40 bg-transparent focus:outline-none focus:border-[#fbb13a] focus:ring-0 placeholder:text-gray-400 text-white ${manrope.className}`}
          required
                autoFocus
                style={{ maxWidth: 320, fontWeight: 700, background: "none", caretColor: "#fbb13a", fontFamily: 'Arial Unicode MS', fontStyle: 'normal' }}
              />
            </form>
            {error && <p className="text-red-500 mt-4 bg-white/80 dark:bg-black/80 px-4 py-2 rounded backdrop-blur-sm">❌ {error}</p>}
          </div>
        </div>
      )}

      {/* Confirmation overlay after focus zoom-in (always mounted for fade) */}
      <div className="fixed inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <div
          className={`text-3xl sm:text-4xl text-white drop-shadow-lg mb-6 transition-opacity duration-1500 ${showConfirm ? 'opacity-100' : 'opacity-0'} ${imbue.className}`}
          style={{ letterSpacing: "0.04em", textTransform: "lowercase" }}
        >
          confirm region to scan?
        </div>
        <div className={`flex gap-8 transition-opacity duration-700 ${showConfirmOptions ? 'opacity-100' : 'opacity-0'}`}>
          <span
            className="text-xl sm:text-2xl text-white cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-110 hover:underline hover:underline-offset-4 hover:decoration-[#fbb13a]"
            style={{ fontFamily: imbue.style.fontFamily }}
            onClick={handleYes}
          >
            yes
          </span>
          <span
            className="text-xl sm:text-2xl text-white cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-110 hover:underline hover:underline-offset-4 hover:decoration-[#fbb13a]"
            style={{ fontFamily: imbue.style.fontFamily }}
            onClick={handleNo}
          >
            no
          </span>
        </div>
      </div>

      {/* Scanning text at the top (fade in) */}
      {showScanningText && scanning && scanResults.length === 0 && (
        <div
          className="absolute top-8 left-0 right-0 text-center pointer-events-none transition-opacity duration-1000 opacity-100 z-30"
        >
          <h2
            className={`text-2xl text-white drop-shadow-lg ${imbue.className}`}
            style={{ letterSpacing: "0.04em", textTransform: "lowercase" }}
          >
            scanning for anomalies...
          </h2>
        </div>
      )}
      
      {/* Scan complete text */}
      {scanResults.length > 0 && (
        <div
          className="absolute top-8 left-0 right-0 text-center pointer-events-none transition-opacity duration-1000 opacity-100 z-30"
        >
          <h2
            className={`text-2xl text-white drop-shadow-lg ${imbue.className}`}
            style={{ letterSpacing: "0.04em", textTransform: "lowercase" }}
          >
            detected {scanResults.length} potential sites of interest
          </h2>
        </div>
      )}

      {/* Polygon shimmer overlay during scanning */}
      {showScanningText && scanning && selectedPolygon && mapViewRef.current?.getMap() && scanResults.length === 0 && (
        <PolygonShimmer
          polygon={selectedPolygon}
          map={mapViewRef.current.getMap() as mapboxgl.Map}
          color="#fbb13a"
          duration={2500}
        />
      )}

      {/* No anomalies detected overlay */}
      {showNoAnomaliesOverlay && scanAttempted && selectedPolygon && !scanning && scanResults.length === 0 && !showScanningText && (
        <div className={`fixed inset-0 flex flex-col items-center justify-center z-30 pointer-events-none transition-opacity duration-1500 ${noAnomaliesVisible && !noAnomaliesFadingOut ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className={`text-xl sm:text-2xl text-white drop-shadow-lg mb-6 transition-opacity duration-1500 opacity-100 ${imbue.className}`}
            style={{ letterSpacing: "0.04em", textTransform: "lowercase", textAlign: "center" }}
          >
            no anomalies detected.<br/>scan again?
          </div>
          <div className={`flex gap-8 transition-opacity duration-700 opacity-100`}>
            <span
              className="text-lg sm:text-xl text-white cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-110 hover:underline hover:underline-offset-4 hover:decoration-[#fbb13a]"
              style={{ fontFamily: imbue.style.fontFamily }}
              onClick={handleYes}
            >
              yes
            </span>
            <span
              className="text-lg sm:text-xl text-white cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-110 hover:underline hover:underline-offset-4 hover:decoration-[#fbb13a]"
              style={{ fontFamily: imbue.style.fontFamily }}
              onClick={handleNo}
            >
              no
            </span>
          </div>
        </div>
      )}
    </main>
  );
}