const xlsx = require('xlsx');
const fs = require('fs');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\Зарплата таблиця - 2026 (1).xlsx";

if (fs.existsSync(file)) {
    const wb = xlsx.readFile(file);
    const sheet = wb.Sheets['квітень'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    const columnsOfInterest = [37, 41, 45];
    
    console.log("Headers for columns of interest:");
    for (let i = 0; i < 5; i++) {
        if (!data[i]) continue;
        const row = data[i];
        let rowStr = `Row ${i + 1}: `;
        for (const colIdx of columnsOfInterest) {
            const colLetter = xlsx.utils.encode_col(colIdx);
            rowStr += `${colLetter}(${colIdx}): ${row[colIdx]} | `;
        }
        console.log(rowStr);
    }
}
