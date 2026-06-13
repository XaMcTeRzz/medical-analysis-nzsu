const XLSX = require('xlsx');
const salaryFilePath = "c:\\Users\\PC\\Downloads\\StatisticBUH\\Зарплата таблиця - 2026 (1).xlsx";
const wbSalary = XLSX.readFile(salaryFilePath);
const salaryJson = XLSX.utils.sheet_to_json(wbSalary.Sheets['квітень'], { header: 1 });
for (let i = 0; i < salaryJson.length; i++) {
    const row = salaryJson[i];
    if (row && row[1]) console.log(row[1]);
}
