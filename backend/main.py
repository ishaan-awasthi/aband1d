from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import json

app = FastAPI()

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific frontend origin if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/search")
async def classify_location(request: Request):
    print("📥 Received request to /api/search")
    body = await request.json()
    location = body.get("location")
    radius = body.get("radius")

    if not location or not radius:
        print("❌ Missing location or radius")
        return {"error": "Missing location or radius"}

    print(f"📍 Location: {location}, 🎯 Radius: {radius}")

    try:
        print("🛰️ Running fetch_images.js...")
        subprocess.run([
            "node", "./scripts/fetch_images.js", location, str(radius)
        ], check=True)
        print("✅ fetch_images.js completed")

        print("🧠 Running inference.py...")
        output = subprocess.check_output([
            "python3", "inference.py"
        ])
        print("✅ inference.py completed")

        predictions = [line for line in output.decode().split("\n") if "→ interesting" in line]
        locations = [line.split("→")[0].strip().replace(".jpg", "") for line in predictions]

        print(f"🏁 Final Results: {locations}")
        return { "results": locations }

    except subprocess.CalledProcessError as e:
        print(f"💥 Subprocess error: {e}")
        return {"error": str(e)}
