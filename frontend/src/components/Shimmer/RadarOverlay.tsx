// import React, { useEffect, useRef, useState } from 'react';
// import type { LngLatLike } from 'mapbox-gl';
// import distance from '@turf/distance';
// import destination from '@turf/destination';

// interface RadarOverlayProps {
//   center: [number, number]; // [lng, lat]
//   polygon: number[][]; // array of [lng, lat]
//   map: mapboxgl.Map;
//   color?: string;
//   className?: string;
//   style?: React.CSSProperties;
// }

// const DEFAULT_COLOR = '#fbb13a';
// const NUM_RINGS = 4;
// const SWEEP_ANGLE = Math.PI / 3; // 60 degrees

// function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
//   return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
// }

// function describeSector(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
//   const [x1, y1] = polarToCartesian(cx, cy, r, startAngle);
//   const [x2, y2] = polarToCartesian(cx, cy, r, endAngle);
//   const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
//   return [
//     `M ${cx} ${cy}`,
//     `L ${x1} ${y1}`,
//     `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
//     'Z'
//   ].join(' ');
// }

// function getMaxGeographicDistance(center: [number, number], polygon: number[][]) {
//   let maxDist = 0;
//   for (const [lng, lat] of polygon) {
//     const d = distance(center, [lng, lat]); // in kilometers
//     if (d > maxDist) maxDist = d;
//   }
//   return maxDist * 0.6; // 60% of max distance for a nice fit
// }

// const RadarOverlay: React.FC<RadarOverlayProps> = ({
//   center,
//   polygon,
//   map,
//   color = DEFAULT_COLOR,
//   className = '',
//   style = {},
// }) => {
//   const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
//   const [radius, setRadius] = useState(80);
//   const [angle, setAngle] = useState(0);
//   const [scaleY, setScaleY] = useState(1);
//   const requestRef = useRef<number>();
//   const lastTimeRef = useRef<number>(performance.now());

//   // Project center to screen coordinates and update radius
//   useEffect(() => {
//     if (!map) return;
//     const update = () => {
//       const { x, y } = map.project(center);
//       setScreenPos({ x, y });
//       // Update scaleY based on pitch
//       const pitch = map.getPitch();
//       setScaleY(Math.cos((pitch * Math.PI) / 180));
//       // Update radius based on polygon size (geographic sticky)
//       if (polygon && polygon.length > 1) {
//         const maxGeoDist = getMaxGeographicDistance(center, polygon); // in km
//         // Use turf.destination to get a point maxGeoDist km east of center
//         const dest = destination(center, maxGeoDist, 90); // 90 deg = east
//         const px1 = map.project(center as LngLatLike);
//         const px2 = map.project(dest.geometry.coordinates as LngLatLike);
//         const pxRadius = Math.sqrt(Math.pow(px2.x - px1.x, 2) + Math.pow(px2.y - px1.y, 2));
//         setRadius(pxRadius);
//       }
//     };
//     update();
//     map.on('move', update);
//     map.on('pitch', update);
//     map.on('zoom', update);
//     return () => {
//       map.off('move', update);
//       map.off('pitch', update);
//       map.off('zoom', update);
//     };
//   }, [map, center[0], center[1], polygon]);

//   // Animate sweep (time-based, fast and smooth)
//   useEffect(() => {
//     let running = true;
//     const animate = (now: number) => {
//       const last = lastTimeRef.current;
//       const delta = now - last;
//       lastTimeRef.current = now;
//       // 1 full rotation per 1.2s (adjust speed here)
//       setAngle((prev) => (prev + (2 * Math.PI * delta) / 1200) % (2 * Math.PI));
//       if (running) requestRef.current = requestAnimationFrame((now) => animate(now));
//     };
//     requestRef.current = requestAnimationFrame((now) => animate(now));
//     return () => {
//       running = false;
//       if (requestRef.current) cancelAnimationFrame(requestRef.current);
//     };
//   }, []);

//   if (!screenPos) return null;

//   const cx = radius;
//   const cy = radius;
//   const sweepStart = angle;
//   const sweepEnd = angle + SWEEP_ANGLE;

//   return (
//     <div
//       className={className}
//       style={{
//         position: 'absolute',
//         left: screenPos.x - radius,
//         top: screenPos.y - radius,
//         pointerEvents: 'none',
//         zIndex: 50,
//         transform: `scaleY(${scaleY})`,
//         transformOrigin: 'center',
//         ...style,
//       }}
//     >
//       <svg width={radius * 2} height={radius * 2}>
//         {/* Concentric rings */}
//         {[...Array(NUM_RINGS)].map((_, i) => (
//           <circle
//             key={i}
//             cx={cx}
//             cy={cy}
//             r={((i + 1) * radius) / NUM_RINGS}
//             stroke={color}
//             strokeWidth={1.5}
//             fill="none"
//             opacity={0.5}
//           />
//         ))}
//         {/* Radar sweep sector */}
//         <defs>
//           <radialGradient id="radar-gradient" cx="50%" cy="50%" r="100%">
//             <stop offset="0%" stopColor={color} stopOpacity={0.25} />
//             <stop offset="100%" stopColor={color} stopOpacity={0.01} />
//           </radialGradient>
//         </defs>
//         <path
//           d={describeSector(cx, cy, radius, sweepStart, sweepEnd)}
//           fill="url(#radar-gradient)"
//           style={{ transition: 'd 0.1s linear' }}
//         />
//         {/* Center dot */}
//         <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.7} />
//       </svg>
//     </div>
//   );
// };

// export default RadarOverlay; 