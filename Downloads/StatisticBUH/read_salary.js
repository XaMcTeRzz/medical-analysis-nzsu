const xlsx = require('xlsx');
const fs = require('fs');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\Зарплата таблиця - 2026 (1).xlsx";

if (fs.existsSync(file)) {
    const wb = xlsx.readFile(file);
    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const rowStr = JSON.stringify(row).toLowerCase();
            if (rowStr.includes('біговщиць') || rowStr.includes('биговщиц')) {
                console.log(`Row: ${i + 1}`);
                console.log(row);
            }
        }
    }
}
