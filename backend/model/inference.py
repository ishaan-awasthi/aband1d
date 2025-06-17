import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import os

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
        return

    img = Image.open(image_path).convert("RGB")
    input_tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.softmax(outputs, dim=1)[0]
        predicted = torch.argmax(probs).item()

    label = "interesting" if predicted == 1 else "boring"
    confidence = probs[predicted].item() * 100
    print(f"🖼️ {os.path.basename(image_path)} → {label} ({confidence:.2f}%)")

if __name__ == "__main__":
    image_dir = os.path.abspath(os.path.join(script_dir, "../images"))
    for fname in os.listdir(image_dir):

        if not os.listdir(image_dir):
            print("📂 No images found in /images — skipping inference.")


        print(f"🔍 Processing image: {fname}") 
        if fname.endswith(".jpg"):
            predict_image(os.path.join(image_dir, fname))
    print("✅ Finished processing all images")
