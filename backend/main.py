
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
    allow_origin_regex=r"^https://aband1d-.*-ishaanawasthis-projects\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/search")
async def classify_location(request: Request):
    print("📥 [BACKEND] Received request to /api/search")

    try:
        body = await request.json()
        print("📦 [BACKEND] Request JSON:", body)

        location = body.get("location")
        radius = body.get("radius")

        if not location or not radius:
            print("❌ [BACKEND] Missing location or radius")
            return {"error": "Missing location or radius"}

        print(f"📍 [BACKEND] Location: {location}, Radius: {radius}")

        # Run Node.js script
        print("🛰️ [BACKEND] Running fetch_images.mjs...")
        subprocess.run(
            ["node", "scripts/fetch_images.mjs", location, str(radius)],
            check=True
        )
        print("✅ [BACKEND] fetch_images.mjs completed")

        # 🔧 DEBUG: skip inference, just return downloaded image names
        images_dir = os.path.join(os.getcwd(), "images")
        all_images = [f.replace(".jpg", "") for f in os.listdir(images_dir) if f.endswith(".jpg")]
        print(f"📸 [BACKEND] Returning image filenames: {all_images}")

        return {"results": all_images}

    except subprocess.CalledProcessError as e:
        print("💥 [BACKEND] Subprocess error:")
        print(e.output.decode() if e.output else str(e))
        return {"error": "subprocess failed"}

    except Exception as e:
        print("💥 [BACKEND] General error:")
        traceback.print_exc()
        return {"error": str(e)}

# @app.post("/api/search")
# async def classify_location(request: Request):
#     print("📥 [BACKEND] Received request to /api/search")

#     try:
#         body = await request.json()
#         print("📦 [BACKEND] Request JSON:", body)

#         location = body.get("location")
#         radius = body.get("radius")

#         if not location or not radius:
#             print("❌ [BACKEND] Missing location or radius")
#             return {"error": "Missing location or radius"}

#         print(f"📍 [BACKEND] Location: {location}, Radius: {radius}")

#         # Run Node.js script
#         print("🛰️ [BACKEND] Running fetch_images.mjs...")
#         subprocess.run(
#             ["node", "scripts/fetch_images.mjs", location, str(radius)],
#             check=True
#         )
#         print("✅ [BACKEND] fetch_images.mjs completed")

#         # Run Python inference
#         inference_path = os.path.join("model", "inference.py")
        
        
#         try:
#             print(f"🧠 Running inference.py at {inference_path}...")
#             output = subprocess.check_output(["python3", inference_path], stderr=subprocess.STDOUT)
#             print("✅ inference.py completed")
#         except subprocess.CalledProcessError as e:
#             print("💥 inference.py failed!")
#             print(e.output.decode())
#             return {"error": "inference script failed"}


#         print("✅ [BACKEND] inference.py completed")
#         print("📄 [BACKEND] Inference output raw:", output.decode())

#         # Parse output
#         predictions = [
#             line for line in output.decode().split("\n")
#             if "→ interesting" in line
#         ]
#         locations = [
#             line.split("→")[0].strip().replace(".jpg", "")
#             for line in predictions
#         ]

#         print(f"🏁 [BACKEND] Final Results: {locations}")
#         return {"results": locations}

#     except subprocess.CalledProcessError as e:
#         print("💥 [BACKEND] Subprocess error:")
#         print(e.output.decode() if e.output else str(e))
#         return {"error": "subprocess failed"}

#     except Exception as e:
#         print("💥 [BACKEND] General error:")
#         traceback.print_exc()
#         return {"error": str(e)}

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}