import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

console.log("🚀 Starting fetch_images.mjs");
console.log("🌐 GOOGLE_API_KEY loaded:", !!GOOGLE_API_KEY);
if (!GOOGLE_API_KEY) {
  console.error("❌ Missing GOOGLE_API_KEY in .env");
  process.exit(1);
}

const fetchJSON = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

// Create images directory if it doesn't exist
const imagesDir = path.resolve(__dirname, "../images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Clear existing images
console.log("🧹 Clearing existing images...");
fs.readdirSync(imagesDir).forEach(file => {
  if (file.endsWith('.jpg')) {
    fs.unlinkSync(path.join(imagesDir, file));
  }
});

async function fetchAndSaveImage(lat, lng) {
  const zoom = 18;
  const size = "400x400";
  const maptype = "satellite";

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${GOOGLE_API_KEY}`;
  const filename = `images/${lat.toFixed(6)}_${lng.toFixed(6)}.jpg`;
  const filepath = path.resolve(__dirname, "..", filename);

  console.log(`📸 Fetching image: ${url}`);
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

function generateGridInPolygon(coordinates) {
  // Create a Turf polygon from coordinates
  const polygon = turf.polygon([coordinates]);
  
  // Calculate area in square kilometers
  const area = turf.area(polygon) / 1000000; // Convert m² to km²
  console.log(`🌐 Polygon area: ${area.toFixed(2)} km²`);

  // Calculate cellSize in kilometers
  // We want roughly 2 points per km²
  const cellSize = Math.sqrt(0.5); // ~0.7 km between points
  
  // Create a grid of points using Turf
  const bbox = turf.bbox(polygon);
  const options = {
    units: 'kilometers',
    mask: polygon // Only generate points within the polygon
  };
  
  // Generate points grid
  const pointGrid = turf.pointGrid(bbox, cellSize, options);
  console.log(`✨ Generated ${pointGrid.features.length} grid points within polygon`);
  
  const randomizedFeatures = pointGrid.features.map(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    // Calculate a small random offset in degrees
    // 0.001 degrees is roughly 111 meters at the equator. Let's use a smaller value.
    const maxOffsetDegrees = (cellSize / 111.32) / 4; // Max offset is a quarter of the cell size
    const lngOffset = (Math.random() - 0.5) * 2 * maxOffsetDegrees;
    const latOffset = (Math.random() - 0.5) * 2 * maxOffsetDegrees;
    
    const newPoint = turf.point([lng + lngOffset, lat + latOffset]);
    
    // Ensure the new point is still inside the polygon
    if (turf.booleanPointInPolygon(newPoint, polygon)) {
      return newPoint;
    }
    return feature; // Return original if offset point is outside
  });

  // Convert Turf points to [lat, lng] pairs
  const points = randomizedFeatures.map(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    return [lat, lng];
  });

  return points;
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("❌ Please provide polygon coordinates as JSON string");
  process.exit(1);
}

const coordinates = JSON.parse(args[0]);
console.log("📐 Processing polygon with coordinates:", coordinates);

try {
  // Generate grid points within the polygon
  const points = generateGridInPolygon(coordinates);
  
  // Fetch and save images for each point
  for (const [lat, lng] of points) {
    await fetchAndSaveImage(lat, lng);
  }
  
  console.log("✅ Finished processing all points");
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
