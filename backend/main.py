from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import json

app = FastAPI()

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/search")
async def classify_location(request: Request):
    body = await request.json()
    location = body.get("location")
    radius = body.get("radius")

    if not location or not radius:
        return {"error": "Missing location or radius"}

    try:
        # Run fetch_images.js
        subprocess.run([
            "node", "./scripts/fetch_images.js", location, str(radius)
        ], check=True)

        # Run classification
        output = subprocess.check_output([
            "python3", "inference.py"
        ])

        predictions = [line for line in output.decode().split("\n") if "→ interesting" in line]
        locations = [line.split("→")[0].strip().replace(".jpg", "") for line in predictions]

        return { "results": locations }

    except subprocess.CalledProcessError as e:
        return {"error": str(e)}

