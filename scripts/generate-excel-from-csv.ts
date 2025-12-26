import fs from "fs";
import path from "path";
import { utils, writeFile } from "xlsx";

const root = process.cwd();
const csvFiles = [
  { name: "brands", file: "brands.csv" },
  { name: "colors", file: "colors.csv" },
  { name: "components", file: "components.csv" }
];

const workbook = utils.book_new();

for (const { name, file } of csvFiles) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing CSV file: ${file}`);
  }
  const csvText = fs.readFileSync(filePath, "utf8");
  const worksheet = utils.csv_to_sheet(csvText);
  utils.book_append_sheet(workbook, worksheet, name);
}

const outputPath = path.join(root, "paintmix-test.xlsx");
writeFile(workbook, outputPath, { bookType: "xlsx" });

console.log(`Generated ${outputPath}`);
