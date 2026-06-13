const path = require('path');
const { parseSalaryData } = require('../lib/salaryParser');

const usersFilePath = path.join(__dirname, '../data/users.json');
const args = process.argv.slice(2);
const sheetName = args[0] || 'квітень';
const salaryFilePath = args[1] || "c:\\Users\\PC\\Downloads\\StatisticBUH\\Зарплата таблиця - 2026 (1).xlsx";
const multukFilePath = args[2] || "c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls";

(async () => {
    try {
        console.log(`Запуск оновлення зарплати за місяць: ${sheetName}...`);
        const result = await parseSalaryData(sheetName, salaryFilePath, multukFilePath, usersFilePath);
        console.log(`Успішно оновлено ${result.updatedCount} зарплат! З них нових користувачів: ${result.newUsersCount}`);
    } catch (e) {
        console.error('Помилка:', e.message);
    }
})();
