from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import subprocess
import os
import traceback
import json
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'model'))
from model.inference import predict_image

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aband1d.com",
        "https://www.aband1d.com",
        "https://aband1d.vercel.app",
        "https://aband1d-git-main-ishaanawasthis-projects.vercel.app",
        "http://localhost:3000",  # Local development
    ],
    allow_origin_regex=r"^https://aband1d-.*-ishaanawasthis-projects\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the images directory
app.mount("/images", StaticFiles(directory="images"), name="images")

@app.post("/api/search")
async def classify_location(request: Request):
    print("📥 [BACKEND] Received request to /api/search")
    print(f"BACKEND CWD: {os.getcwd()}")

    try:
        body = await request.json()
        print("📦 [BACKEND] Request JSON:", body)

        coordinates = body.get("coordinates")
        if not coordinates:
            print("❌ [BACKEND] Missing polygon coordinates")
            return {"error": "Missing polygon coordinates"}

        print(f"📍 [BACKEND] Processing polygon with coordinates:", coordinates)

        # Run Node.js script with polygon coordinates
        print("🛰️ [BACKEND] Running fetch_images.mjs...")
        subprocess.run(
            ["node", "scripts/fetch_images.mjs", json.dumps(coordinates)],
            check=True
        )
        print("✅ [BACKEND] fetch_images.mjs completed")

        # Return downloaded image names
        images_dir = os.path.join(os.getcwd(), "images")
        all_images = [f for f in os.listdir(images_dir) if f.endswith(".jpg")]
        interesting_images = []
        for f in all_images:
            img_path = os.path.join(images_dir, f)
            label, confidence, caption = predict_image(img_path)
            if label == "interesting" or (label == "boring" and confidence < 85.0):
                # Parse lat/lng from filename
                name = f.replace('.jpg', '')
                try:
                    lat, lng = map(float, name.split('_'))
                except Exception:
                    lat, lng = None, None
                interesting_images.append({
                    "lat": lat,
                    "lng": lng,
                    "filename": f,
                    "caption": caption
                })
        print(f"📸 [BACKEND] Returning image filenames: {interesting_images}")

        return {"results": interesting_images}

    except subprocess.CalledProcessError as e:
        print("💥 [BACKEND] Subprocess error:")
        print(e.output.decode() if e.output else str(e))
        return {"error": "subprocess failed"}

    except Exception as e:
        print("💥 [BACKEND] General error:")
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}