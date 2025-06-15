from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import json

app = FastAPI()

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aband1d.com", "https://www.aband1d.com"],
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
        # fetch images using node
        print("🛰️ Running fetch_images.mjs...")
        subprocess.run(
            ["node", "./scripts/fetch_images.mjs", location, str(radius)],
            check=True
        )
        print("✅ fetch_images.mjs completed")

        # build absolute path to inference.py
        inference_path = os.path.join(os.path.dirname(__file__), "model", "inference.py")
        print(f"🧠 Running inference.py at {inference_path}...")

        output = subprocess.check_output(["python3", inference_path])
        print("✅ inference.py completed")

        predictions = [line for line in output.decode().split("\n") if "→ interesting" in line]
        locations = [line.split("→")[0].strip().replace(".jpg", "") for line in predictions]

        print(f"🏁 Final Results: {locations}")
        return {"results": locations}

    except subprocess.CalledProcessError as e:
        print(f"💥 Subprocess error: {e}")
        return {"error": str(e)}
    except Exception as e:
        print(f"💥 General error: {e}")
        return {"error": str(e)}


@app.get("/healthz")
async def health_check():
    return {"status": "ok"}
