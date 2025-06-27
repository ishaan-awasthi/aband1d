import os
from PIL import Image

# Input folders
input_folders = {
    'interesting': '../images/interesting',
    'boring': '../images/boring'
}

# Output base folder
output_base = '../model/cropped'

# Crop settings
crop_bottom = 25
crop_right = 25

for label, input_folder in input_folders.items():
    output_folder = os.path.join(output_base, label)
    os.makedirs(output_folder, exist_ok=True)
    for filename in os.listdir(input_folder):
        if filename.lower().endswith('.jpg'):
            img_path = os.path.join(input_folder, filename)
            img = Image.open(img_path)
            width, height = img.size
            # Crop: left, upper, right, lower
            cropped = img.crop((0, 0, width - crop_right, height - crop_bottom))
            cropped = cropped.convert("RGB")
            cropped.save(os.path.join(output_folder, filename))
            print(f'Cropped and saved: {label}/{filename}')