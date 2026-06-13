const XLSX = require('xlsx');

const file = "c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls";
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];

const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Find Біговщиць
let startIdx = -1;
for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (row.join(' ').includes('Біговщиць Софія Володимирівна')) {
        startIdx = i;
        break;
    }
}

if (startIdx !== -1) {
    console.log("Found at row", startIdx);
    for (let i = startIdx - 2; i < startIdx + 20; i++) {
        if (!json[i]) continue;
        // Print non-empty cells
        const mapped = json[i].map((c, idx) => c !== '' ? `[${idx}]:${c}` : '').filter(c => c !== '').join(' | ');
        console.log(`Row ${i}: ${mapped}`);
    }
}
