import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

// === Setup ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("❌ Missing GOOGLE_API_KEY in .env");
  process.exit(1);
}

// === Helpers ===
async function fetchJSON(url) {
  const fetch = (await import("node-fetch")).default;
  const res = await fetch(url);
  return res.json();
}

function parseInputLocation(input) {
  const coordRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
  if (coordRegex.test(input.trim())) {
    const [lat, lng] = input.trim().split(",").map(Number);
    return { lat, lng };
  }
  return null;
}

async function geocode(input) {
  const coords = parseInputLocation(input);
  if (coords) {
    console.log("📍 Detected raw coordinates:", coords);
    return coords;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    input
  )}&key=${GOOGLE_API_KEY}`;
  const data = await fetchJSON(url);

  if (data.status !== "OK" || !data.results.length) {
    throw new Error(`Could not geocode location: ${input}`);
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

function generateRandomPointInRadius(centerLat, centerLng, radiusInMeters) {
  const radiusInDegrees = radiusInMeters / 111320;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;

  const deltaLat = w * Math.cos(t);
  const deltaLng = w * Math.sin(t) / Math.cos((centerLat * Math.PI) / 180);

  return {
    lat: centerLat + deltaLat,
    lng: centerLng + deltaLng,
  };
}

async function fetchAndSaveImage(lat, lng) {
  const zoom = 18;
  const size = "400x400";
  const maptype = "satellite";

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${GOOGLE_API_KEY}`;
  const filename = `images/${lat.toFixed(6)}_${lng.toFixed(6)}.jpg`;
  const filepath = path.resolve(__dirname, "..", filename);

  try {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Saved: ${filename}`);
  } catch (err) {
    console.error(`❌ Failed to fetch image for ${lat}, ${lng}:`, err.message);
  }
}

// === Main ===
const input = process.argv[2];
const radiusKm = Number(process.argv[3]) || 1;
const radius = radiusKm * 1000;

if (!input) {
  console.error("❌ Please provide a location (city, address, or coordinates).");
  process.exit(1);
}

try {
  const coords = await geocode(input);
  console.log(`📍 ${input} →`, coords);

  const areaKm2 = Math.PI * Math.pow(radiusKm, 2);
  const numSamples = Math.floor(areaKm2 * 2) || 1;

  console.log(`🌀 Generating ${numSamples} points within ${radiusKm}km:`);

  for (let i = 0; i < numSamples; i++) {
    const point = generateRandomPointInRadius(coords.lat, coords.lng, radius);
    console.log(`  → (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`);
    await fetchAndSaveImage(point.lat, point.lng);
  }
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
