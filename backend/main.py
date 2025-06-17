from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import traceback

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aband1d.com",
        "https://www.aband1d.com",
        "https://aband1d.vercel.app",
        "https://aband1d-git-main-ishaanawasthis-projects.vercel.app",
    ],
    allow_origin_regex=r"^https:\/\/aband1d-.*-ishaanawasthis-projects\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/search")
async def classify_location(request: Request):
    print("📥 Received request to /api/search")

    try:
        body = await request.json()
        location = body.get("location")
        radius = body.get("radius")

        if not location or not radius:
            print("❌ Missing location or radius")
            return {"error": "Missing location or radius"}

        print(f"📍 Location: {location}, 🎯 Radius: {radius}")

        # Run Node.js script
        print("🛰️ Running fetch_images.mjs...")
        subprocess.run(
            ["node", "scripts/fetch_images.mjs", location, str(radius)],
            check=True
        )
        print("✅ fetch_images.mjs completed")

        # Run Python inference
        inference_path = os.path.join("model", "inference.py")
        print(f"🧠 Running inference.py at {inference_path}...")
        output = subprocess.check_output(["python3", inference_path])
        print("✅ inference.py completed")

        # Parse output
        predictions = [
            line for line in output.decode().split("\n")
            if "→ interesting" in line
        ]
        locations = [
            line.split("→")[0].strip().replace(".jpg", "")
            for line in predictions
        ]

        print(f"🏁 Final Results: {locations}")
        return {"results": locations}

    except subprocess.CalledProcessError as e:
        print("💥 Subprocess error:")
        print(e.output.decode() if e.output else str(e))
        return {"error": "subprocess failed"}

    except Exception as e:
        print("💥 General error:")
        traceback.print_exc()
        return {"error": str(e)}


@app.get("/healthz")
async def health_check():
    return {"status": "ok"}
