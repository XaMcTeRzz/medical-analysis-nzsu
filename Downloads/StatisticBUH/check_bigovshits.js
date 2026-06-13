const xlsx = require('xlsx');

function checkFile(filePath, searchStr) {
    console.log(`Checking ${filePath}`);
    try {
        const workbook = xlsx.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            
            for (let r = 0; r < data.length; r++) {
                const row = data[r];
                if (row.some(cell => String(cell).toLowerCase().includes(searchStr.toLowerCase()))) {
                    console.log(`Found in ${sheetName} row ${r + 1}:`, row);
                }
            }
        }
    } catch (err) {
        console.error(err.message);
    }
}

checkFile('C:\\Users\\PC\\Downloads\\StatisticBUH\\multuk22.xls', 'Біговщиць');
checkFile('C:\\Users\\PC\\Downloads\\StatisticBUH\\Зарплата - 2026.xlsx', 'Біговщиць');
