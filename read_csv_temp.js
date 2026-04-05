import { read, utils } from 'xlsx';
import { readFileSync } from 'fs';

const filePath = '/Users/nicolas/Downloads/Seguimiento_Entrenamiento.xlsx';
const workbook = read(readFileSync(filePath));
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const json = utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Sheet: ${sheetName}`);
  console.log(json.slice(0, 10)); // first 10 rows
  console.log('---');
}
