import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const root = process.cwd();
const csvFiles = [
  { name: "brands", file: "brands.csv" },
  { name: "colors", file: "colors.csv" },
  { name: "components", file: "components.csv" },
];

const workbook = XLSX.utils.book_new();

for (const { name, file } of csvFiles) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing CSV file: ${file}`);
  }

  const csvText = fs.readFileSync(filePath, "utf8");

  // ✅ Parse CSV -> worksheet (xlsx không có utils.csv_to_sheet)
  const csvWb = XLSX.read(csvText, { type: "string" }); // CSV được hiểu là 1 workbook tạm
  const firstSheetName = csvWb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error(`CSV parse produced no sheets: ${file}`);
  }
  const worksheet = csvWb.Sheets[firstSheetName];

  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

const outputPath = path.join(root, "paintmix-test.xlsx");
XLSX.writeFile(workbook, outputPath, { bookType: "xlsx" });

console.log(`Generated ${outputPath}`);