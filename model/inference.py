import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import sys
import os

# === Load model ===
model = models.resnet18()
model.fc = torch.nn.Linear(model.fc.in_features, 2)  # binary classifier
model.load_state_dict(torch.load("../model/best_model.pt"))
model.eval()

# === Image preprocessing ===
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# === Predict single image ===
def predict_image(image_path):
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return

    img = Image.open(image_path).convert("RGB")
    input_tensor = transform(img).unsqueeze(0)  # add batch dimension

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.softmax(outputs, dim=1)[0]
        predicted = torch.argmax(probs).item()
    
    label = "interesting" if predicted == 1 else "boring"
    confidence = probs[predicted].item() * 100

    print(f"🖼️ {os.path.basename(image_path)} → {label} ({confidence:.2f}%)")

# === CLI usage ===
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 inference.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    predict_image(image_path)
