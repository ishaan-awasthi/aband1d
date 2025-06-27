from dotenv import load_dotenv
import os

# Always load .env from the backend root, regardless of CWD
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dotenv_path = os.path.join(backend_root, ".env")
load_dotenv(dotenv_path)

import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import requests
import base64
from io import BytesIO

MOONDREAM_API_KEY = os.getenv("MOONDREAM_API_KEY")

def image_to_data_uri(image_path):
    img = Image.open(image_path).convert("RGB")
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    img_bytes = buffered.getvalue()
    base64_str = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{base64_str}"

def generate_caption(image_path):
    if not MOONDREAM_API_KEY:
        print("[Moondream] No API key found.")
        return "No description available."
    try:
        data_uri = image_to_data_uri(image_path)
        headers = {
            "X-Moondream-Auth": MOONDREAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "image_url": data_uri,
            "length": "short"
            # "prompt": "Describe what you see in this image. Focus on identifying any abandoned structures, unusual buildings, points of intrigue, or anything that seems out of place or interesting. Be concise and descriptive."
        }
        print(f"[Moondream] Sending caption request for {image_path} (length=short)")
        response = requests.post("https://api.moondream.ai/v1/caption", json=payload, headers=headers, timeout=30)
        print(f"[Moondream] Response status: {response.status_code}")
        print(f"[Moondream] Response text: {response.text}")
        if response.status_code == 200:
            return response.json().get("caption", "No description available.").strip()
        else:
            print("Moondream API error:", response.text)
            return "No description available."
    except Exception as e:
        print(f"❌ Captioning failed for {image_path}: {e}")
        return "No description available."

print("🔍 Running inference.py")

script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "best_model.pt")
print("🧠 Loading model from:", model_path)

model = models.resnet18()
model.fc = torch.nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load(model_path, map_location=torch.device("cpu")))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def predict_image(image_path):
    print(f"🔄 Processing image: {image_path}")
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return None, 0.0, "No description available."

    img = Image.open(image_path).convert("RGB")
    # Crop 25px from bottom and 25px from right
    width, height = img.size
    crop_bottom = 25
    crop_right = 25
    cropped = img.crop((0, 0, width - crop_right, height - crop_bottom))
    img = cropped
    input_tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.softmax(outputs, dim=1)[0]
        predicted = torch.argmax(probs).item()

    label = "interesting" if predicted == 1 else "boring"
    confidence = probs[predicted].item() * 100
    print(f"🖼️ {os.path.basename(image_path)} → {label} ({confidence:.2f}%)")

    # Only generate caption for interesting images (or boring < 85)
    caption = None
    if label == "interesting" or (label == "boring" and confidence < 85.0):
        caption = generate_caption(image_path)
    else:
        caption = "No description available."

    return label, confidence, caption

if __name__ == "__main__":
    image_dir = os.path.abspath(os.path.join(script_dir, "../images"))
    for fname in os.listdir(image_dir):
        if fname.endswith(".jpg"):
            predict_image(os.path.join(image_dir, fname))
    print("✅ Finished processing all images")
