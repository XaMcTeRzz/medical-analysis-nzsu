const xlsx = require('xlsx');
const fs = require('fs');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls";

if (fs.existsSync(file)) {
    const wb = xlsx.readFile(file);
    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        for (let i = 0; i < 20; i++) {
            if (data[i]) {
                console.log(`Row ${i + 1}:`, data[i]);
            }
        }
    }
}
