// import React, { useEffect, useRef, useState } from 'react';
// import type { LngLatLike } from 'mapbox-gl';

// interface PolygonRadialMultiShimmerProps {
//   polygon: number[][]; // array of [lng, lat]
//   map: mapboxgl.Map;
//   color?: string;
//   duration?: number; // ms
//   count?: number; // number of pulses
//   className?: string;
//   style?: React.CSSProperties;
// }

// const DEFAULT_COLOR = '#fbb13a';
// const DEFAULT_DURATION = 2000;
// const DEFAULT_COUNT = 3;

// const PolygonRadialMultiShimmer: React.FC<PolygonRadialMultiShimmerProps> = ({
//   polygon,
//   map,
//   color = DEFAULT_COLOR,
//   duration = DEFAULT_DURATION,
//   count = DEFAULT_COUNT,
//   className = '',
//   style = {},
// }) => {
//   const [screenPoints, setScreenPoints] = useState<{ x: number; y: number }[]>([]);
//   const [bbox, setBbox] = useState<{ minX: number; minY: number; width: number; height: number } | null>(null);
//   const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
//   const [pulse, setPulse] = useState(0);
//   const requestRef = useRef<number>();
//   const lastTimeRef = useRef<number>(performance.now());

//   // Project polygon to screen coordinates and compute bounding box and center
//   useEffect(() => {
//     if (!map || !polygon.length) return;
//     const pts = polygon.map(([lng, lat]) => map.project([lng, lat] as LngLatLike));
//     setScreenPoints(pts);
//     const xs = pts.map(p => p.x);
//     const ys = pts.map(p => p.y);
//     const minX = Math.min(...xs);
//     const minY = Math.min(...ys);
//     const maxX = Math.max(...xs);
//     const maxY = Math.max(...ys);
//     setBbox({ minX, minY, width: maxX - minX, height: maxY - minY });
//     setCenter({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
//   }, [map, polygon]);

//   // Animate pulse (radial expansion)
//   useEffect(() => {
//     let running = true;
//     const animate = (now: number) => {
//       const last = lastTimeRef.current;
//       const delta = now - last;
//       lastTimeRef.current = now;
//       setPulse(prev => (prev + delta / duration) % 1);
//       if (running) requestRef.current = requestAnimationFrame((now) => animate(now));
//     };
//     requestRef.current = requestAnimationFrame((now) => animate(now));
//     return () => {
//       running = false;
//       if (requestRef.current) cancelAnimationFrame(requestRef.current);
//     };
//   }, [duration]);

//   // Update on map move/zoom
//   useEffect(() => {
//     if (!map) return;
//     const update = () => {
//       const pts = polygon.map(([lng, lat]) => map.project([lng, lat] as LngLatLike));
//       setScreenPoints(pts);
//       const xs = pts.map(p => p.x);
//       const ys = pts.map(p => p.y);
//       const minX = Math.min(...xs);
//       const minY = Math.min(...ys);
//       const maxX = Math.max(...xs);
//       const maxY = Math.max(...ys);
//       setBbox({ minX, minY, width: maxX - minX, height: maxY - minY });
//       setCenter({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
//     };
//     map.on('move', update);
//     map.on('zoom', update);
//     map.on('pitch', update);
//     return () => {
//       map.off('move', update);
//       map.off('zoom', update);
//       map.off('pitch', update);
//     };
//   }, [map, polygon]);

//   if (!bbox || screenPoints.length === 0 || !center) return null;

//   // Transform points to local SVG coordinates
//   const svgPoints = screenPoints.map(p => `${p.x - bbox.minX},${p.y - bbox.minY}`).join(' ');
//   const cx = center.x - bbox.minX;
//   const cy = center.y - bbox.minY;
//   const maxR = Math.max(bbox.width, bbox.height) * 0.6;

//   // Create multiple pulses, each offset in time
//   const pulses = Array.from({ length: count }, (_, i) => {
//     const offset = i / count;
//     let t = (pulse + offset) % 1;
//     const r = t * maxR;
//     const opacity = 0.5 * (1 - t);
//     return { r, opacity, id: i };
//   });

//   return (
//     <div
//       className={className}
//       style={{
//         position: 'absolute',
//         left: bbox.minX,
//         top: bbox.minY,
//         width: bbox.width,
//         height: bbox.height,
//         pointerEvents: 'none',
//         zIndex: 60,
//         ...style,
//       }}
//     >
//       <svg width={bbox.width} height={bbox.height} style={{ display: 'block' }}>
//         <defs>
//           {pulses.map(({ r, opacity, id }) => (
//             <radialGradient key={id} id={`radial-shimmer-${id}`} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
//               <stop offset="0%" stopColor={color} stopOpacity={opacity} />
//               <stop offset="100%" stopColor={color} stopOpacity={0} />
//             </radialGradient>
//           ))}
//         </defs>
//         {pulses.map(({ r, id }) => (
//           <polygon
//             key={id}
//             points={svgPoints}
//             fill={`url(#radial-shimmer-${id})`}
//           />
//         ))}
//       </svg>
//     </div>
//   );
// };

// export default PolygonRadialMultiShimmer; 