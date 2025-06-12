import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export async function runClassificationPipeline(
  location: string,
  radius: number
): Promise<string[]> {
  // 1. Generate satellite images
  const scriptPath = path.join(process.cwd(), "../scripts/fetch_images.js");
  console.log("Running script at:", scriptPath);

  const command = `node "${scriptPath}" "${location}" ${radius}`;
  console.log(`⚙️ Running: ${command}`);
  await execAsync(command); // saves images to /images

  // 2. Classify each image
  const imageDir = path.join(process.cwd(), "../images");
  const imageFiles = fs
    .readdirSync(imageDir)
    .filter((file) => file.endsWith(".jpg"));

  const predictions: string[] = [];

  for (const file of imageFiles) {
    const imagePath = path.join(imageDir, file);
    const inferencePath = path.join(process.cwd(), "../model/inference.py");

    const { stdout } = await execAsync(
      `python3 "${inferencePath}" "${imagePath}"`
    );

    if (stdout.includes("→ interesting")) {
      predictions.push(file.replace(".jpg", ""));
    }
  }

  return predictions;
}
