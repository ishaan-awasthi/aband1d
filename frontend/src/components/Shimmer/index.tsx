import React, { useEffect, useRef, useState } from 'react';
import type { LngLatLike } from 'mapbox-gl';

interface PolygonShimmerProps {
  polygon: number[][]; // array of [lng, lat]
  map: mapboxgl.Map;
  color?: string;
  duration?: number; // ms
  pause?: number; // ms
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_COLOR = '#fbb13a';
const DEFAULT_DURATION = 2500;
const DEFAULT_PAUSE = 1000;

const PolygonShimmer: React.FC<PolygonShimmerProps> = ({
  polygon,
  map,
  color = DEFAULT_COLOR,
  duration = DEFAULT_DURATION,
  pause = DEFAULT_PAUSE,
  className = '',
  style = {},
}) => {
  const [screenPoints, setScreenPoints] = useState<{ x: number; y: number }[]>([]);
  const [bbox, setBbox] = useState<{ minX: number; minY: number; width: number; height: number } | null>(null);
  const [gradientPos, setGradientPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(performance.now());
  const pauseTimeout = useRef<number | null>(null);

  // Project polygon to screen coordinates and compute bounding box
  useEffect(() => {
    if (!map || !polygon.length) return;
    const pts = polygon.map(([lng, lat]) => map.project([lng, lat] as LngLatLike));
    setScreenPoints(pts);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    setBbox({ minX, minY, width: maxX - minX, height: maxY - minY });
  }, [map, polygon]);

  // Animate gradient position with pause
  useEffect(() => {
    let running = true;
    const animate = (now: number) => {
      if (isPaused) return;
      const last = lastTimeRef.current;
      const delta = now - last;
      lastTimeRef.current = now;
      setGradientPos(prev => {
        let next = prev + delta / duration;
        if (next >= 1) {
          next = 1;
          setIsPaused(true);
          pauseTimeout.current = window.setTimeout(() => {
            setGradientPos(0);
            setIsPaused(false);
            lastTimeRef.current = performance.now();
            if (running) requestRef.current = requestAnimationFrame((now) => animate(now));
          }, pause);
          return 1;
        }
        return next;
      });
      if (running && !isPaused) requestRef.current = requestAnimationFrame((now) => animate(now));
    };
    if (!isPaused) {
      requestRef.current = requestAnimationFrame((now) => animate(now));
    }
    return () => {
      running = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (pauseTimeout.current) window.clearTimeout(pauseTimeout.current);
    };
  }, [duration, pause, isPaused]);

  // Update on map move/zoom
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const pts = polygon.map(([lng, lat]) => map.project([lng, lat] as LngLatLike));
      setScreenPoints(pts);
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      setBbox({ minX, minY, width: maxX - minX, height: maxY - minY });
    };
    map.on('move', update);
    map.on('zoom', update);
    map.on('pitch', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('pitch', update);
    };
  }, [map, polygon]);

  if (!bbox || screenPoints.length === 0) return null;

  // Transform points to local SVG coordinates
  const svgPoints = screenPoints.map(p => `${p.x - bbox.minX},${p.y - bbox.minY}`).join(' ');
  // Animate gradient from left (0) to right (1)
  const gradStart = Math.max(0, gradientPos - 0.2);
  const gradEnd = Math.min(1, gradientPos + 0.2);

  // Fade in at the start, fade out at the end (first/last 10% of sweep)
  let opacity = 1;
  const FADE_PORTION = 0.1;
  if (gradientPos < FADE_PORTION) {
    opacity = gradientPos / FADE_PORTION;
  } else if (gradientPos > 1 - FADE_PORTION) {
    opacity = (1 - gradientPos) / FADE_PORTION;
  }

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: bbox.minX,
        top: bbox.minY,
        width: bbox.width,
        height: bbox.height,
        pointerEvents: 'none',
        zIndex: 60,
        ...style,
        opacity,
        transition: 'opacity 0.15s linear',
      }}
    >
      <svg width={bbox.width} height={bbox.height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="shimmer-gradient" x1="0" y1="0" x2={bbox.width} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset={Math.max(0, gradStart)} stopColor={color} stopOpacity={0.15} />
            <stop offset={gradientPos} stopColor={color} stopOpacity={0.7} />
            <stop offset={Math.min(1, gradEnd)} stopColor={color} stopOpacity={0.15} />
          </linearGradient>
        </defs>
        <polygon
          points={svgPoints}
          fill="url(#shimmer-gradient)"
          style={{ transition: 'fill 0.1s linear' }}
        />
      </svg>
    </div>
  );
};

export default PolygonShimmer; 