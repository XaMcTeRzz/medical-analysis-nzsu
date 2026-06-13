const xlsx = require('xlsx');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls";
const wb = xlsx.readFile(file);
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const firstCell = String(row[0]).trim();
    if (firstCell.split(' ').length >= 2 && firstCell.includes('(')) {
        console.log(`Row ${i+1}: ${firstCell}`);
    }
}
