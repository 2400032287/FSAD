import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, "../../data.json");

export async function readData() {
  const raw = await fs.readFile(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function writeData(data) {
  await fs.writeFile(DB_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
