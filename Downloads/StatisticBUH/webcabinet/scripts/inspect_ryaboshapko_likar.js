const xlsx = require('xlsx');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls";
const wb = xlsx.readFile(file);
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const firstCell = String(row[0]).trim();
    
    if (firstCell.includes('Рябошапко')) {
        console.log(`Doctor: ${firstCell}`);
        for (let r = i + 1; r < i + 20; r++) {
            if (!data[r]) continue;
            const cols = [];
            for (let c = 35; c <= 41; c++) {
                cols.push(data[r][c]);
            }
            if (cols.some(v => v !== undefined && String(v).trim() !== '')) {
                console.log(`Row ${r+1}:`, cols.map((v, idx) => `col${35+idx}="${v !== undefined ? v : ''}"`).join(', '));
            }
        }
    }
}
