const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function normalizeName(str) {
  if (!str) return '';
  let normalized = String(str).toLowerCase();
  // Normalize all apostrophes and single quotes, backticks
  normalized = normalized.replace(/['’`\u2019\u2018\u02BC\u0027]/g, '');
  // Normalize Latin homoglyphs to Cyrillic
  const homoglyphs = {
    'a': 'а', 'c': 'с', 'e': 'е', 'h': 'н', 'i': 'і', 'k': 'к', 'm': 'м', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у'
  };
  normalized = normalized.split('').map(char => homoglyphs[char] || char).join('');
  // Normalize spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

function calculateEarnedSum(row) {
  if (!row || row.length === 0) return 0;
  const parseVal = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };
  // 12 - Візити лікарів - Сума, 15 - Внесення в МІС - Сума, 18 - Консультації - Сума,
  // 19 - аудіо, 20 - інші візити, 21 - Паліатив (ЕКГ), 24 - Виїзди - Сума
  const cols = [12, 15, 18, 19, 20, 21, 24];
  let sum = 0;
  for (const col of cols) {
    sum += parseVal(row[col]);
  }
  return sum;
}

function findColumnIndices(headers) {
  if (!headers) return { vsyaZPCol: 31, avansCol: 37, zpCol: 45 };
  
  let vsyaZPCol = 31;
  let avansCol = 37;
  let zpCol = 45;
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim().toLowerCase();
    if (h.includes('всього нараховано по розшифровці чистими') || h === 'вся зарплата') {
      vsyaZPCol = i;
    } else if (h.includes('аванс')) {
      avansCol = i;
    } else if (h === 'зп' || h === 'зп від окладу') {
      zpCol = i;
    }
  }
  return { vsyaZPCol, avansCol, zpCol };
}

function findPremiumColumns(headers) {
  if (!headers) return [41];
  const cols = [];
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim().toLowerCase();
    if (h === 'премія лікарям') {
      cols.push(i);
    }
  }
  return cols.length > 0 ? cols : [41];
}

function getPremiumSum(row, cols) {
  if (!row || row.length === 0) return 0;
  const parseVal = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };
  let sum = 0;
  for (const col of cols) {
    sum += parseVal(row[col]);
  }
  return sum;
}

function pushCategoryRows(table, r, period) {
  if (!r || r.length === 0) return;
  
  const parseVal = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const categories = [
    { colVal: 15, label: 'внесення', col1: 13, col2: 14 },
    { colVal: 12, label: 'нараховано по візитам', col1: 10, col2: 11 },
    { colVal: 18, label: 'консультації', col1: 16, col2: 17 },
    { colVal: 19, label: 'аудіо', col1: -1, col2: -1 },
    { colVal: 20, label: 'інші візити', col1: -1, col2: -1 },
    { colVal: 21, label: 'паліатив (ЕКГ)', col1: -1, col2: -1 },
    { colVal: 24, label: 'виїзди', col1: 22, col2: 23 }
  ];

  for (const cat of categories) {
    const amt = parseVal(r[cat.colVal]);
    if (amt !== 0) {
      const col1Val = cat.col1 !== -1 ? String(r[cat.col1] || '') : '';
      const col2Val = cat.col2 !== -1 ? String(r[cat.col2] || '') : '';
      table.push({
        rowLabel: '21 рядок',
        period: period,
        col1: col1Val,
        col2: col2Val,
        amount: String(r[cat.colVal]),
        desc: cat.label,
        notes: `дані з таблиці ${period}`
      });
    }
  }
}

async function parseSalaryData(sheetName, salaryFilePath, multukFilePath, usersFilePath) {
    let usersData = [];
    
    // Спробуємо завантажити з Neon PostgreSQL
    let useDatabase = false;
    if (sql) {
        try {
            const data = await sql`SELECT * FROM users`;
            if (data) {
                usersData = data;
                useDatabase = true;
                console.log(`Завантажено ${usersData.length} користувачів із Neon PostgreSQL.`);
            }
        } catch (e) {
            console.warn('Помилка підключення до Neon, використовуємо users.json', e.message);
        }
    }

    // Fallback: читаємо з файлу
    if (!useDatabase && fs.existsSync(usersFilePath)) {
        usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    }
    
    // Parse Multuk
    let multukMap = {};
    if (multukFilePath) {
        let wbMultuk;
        if (Buffer.isBuffer(multukFilePath)) {
            wbMultuk = XLSX.read(multukFilePath, { type: 'buffer' });
        } else if (fs.existsSync(multukFilePath)) {
            wbMultuk = XLSX.readFile(multukFilePath);
        }

        if (wbMultuk) {
            const multukJson = XLSX.utils.sheet_to_json(wbMultuk.Sheets[wbMultuk.SheetNames[0]], { header: 1, defval: '' });
            
            for (let i = 0; i < multukJson.length; i++) {
                const row = multukJson[i];
                if (!row || !row[0]) continue;
                
                const firstCell = String(row[0]).trim();
                if (firstCell.includes('Організація') || firstCell.includes('РОЗРАХУНКОВИЙ')) continue;
                
                if (firstCell.split(' ').length >= 2 && firstCell.includes('(')) {
                    const docName = normalizeName(firstCell.split('(')[0]);
                    
                    let mData = {
                        originalName: firstCell.split('(')[0].trim(),
                        header: multukJson[i-1] ? multukJson[i-1][0] : '',
                        org: multukJson[i+1] ? multukJson[i+1][4] : '',
                        department: multukJson[i+2] ? multukJson[i+2][4] : '',
                        position: multukJson[i+1] ? multukJson[i+1][25] : '',
                        oklad: multukJson[i+2] ? multukJson[i+2][25] : '',
                        totalAccrued: multukJson[i+5] ? multukJson[i+5][18] : '',
                        totalWithheld: multukJson[i+5] ? multukJson[i+5][32] : '',
                        totalPaid: '',
                        accrued: [],
                        withheld: [],
                        paid: [],
                        likarTable: []
                    };

                    // Parse LIKAR table (columns 35-41)
                    for (let r = i + 1; r < i + 40; r++) {
                        if (!multukJson[r]) continue;
                        const cell0 = String(multukJson[r][0] || '').trim();
                        if (cell0.split(' ').length >= 2 && cell0.includes('(')) {
                            // Hit the next doctor, stop parsing
                            break;
                        }
                        let lDesc = String(multukJson[r][40] || '').trim();
                        const lPeriod = String(multukJson[r][36] || '').trim();
                        const lAmount = String(multukJson[r][39] || '').trim();
                        if ((lDesc !== '' || lPeriod !== '' || lAmount !== '') && lPeriod.toLowerCase() !== 'лікар') {
                            // Заменяем "вся зарплата за [місяць]" на "Зарплата [місяць]"
                            lDesc = lDesc.replace(/вся зарплата за\s+([а-яіїєґ]+)/gi, 'Зарплата $1');
                            mData.likarTable.push({
                                rowLabel: String(multukJson[r][35] || '').trim(),
                                period: lPeriod,
                                col1: String(multukJson[r][37] || '').trim(),
                                col2: String(multukJson[r][38] || '').trim(),
                                amount: lAmount,
                                desc: lDesc,
                                notes: String(multukJson[r][41] || '').trim()
                            });
                        }
                    }

                    let currentSection = 'withheld';
                    for (let r = i + 1; r < i + 40; r++) {
                        if (!multukJson[r]) continue;
                        
                        if (multukJson[r][0] && String(multukJson[r][0]).includes('Борг підприємства на початок')) break;
                        
                        // Основні нарахування та утримання починаються з i + 6
                        if (r < i + 6) continue;
                        
                        if (multukJson[r][0] && String(multukJson[r][0]).trim() !== '') {
                            let leftAmount = multukJson[r][17];
                            if (leftAmount === undefined) {
                                const cellAddr = XLSX.utils.encode_cell({r: r, c: 17});
                                const cell = wbMultuk.Sheets[wbMultuk.SheetNames[0]][cellAddr];
                                if (cell) leftAmount = cell.v;
                            }
                            mData.accrued.push({
                                name: String(multukJson[r][0]).trim(),
                                period: String(multukJson[r][7] || '').trim(),
                                days: String(multukJson[r][10] || '').trim(),
                                hours: String(multukJson[r][12] || '').trim(),
                                paidDays: String(multukJson[r][14] || '').trim(),
                                amount: String(leftAmount || '').trim()
                            });
                        }

                        const rightName = String(multukJson[r][21] || '').trim();
                        if (rightName === 'Виплачено:') {
                            currentSection = 'paid';
                            mData.totalPaid = String(multukJson[r][32] || '').trim();
                        } else if (rightName !== '') {
                            let amountStr = '';
                            for (let c = 22; c <= 35; c++) {
                                let val = multukJson[r][c];
                                if (val === undefined) {
                                    const cellAddr = XLSX.utils.encode_cell({r: r, c: c});
                                    const cell = wbMultuk.Sheets[wbMultuk.SheetNames[0]][cellAddr];
                                    if (cell) val = cell.v;
                                }
                                if (val !== undefined && val !== null && String(val).trim() !== '') {
                                    let strVal = String(val).trim();
                                    if (/[0-9]/.test(strVal) && !strVal.includes('202')) {
                                        // Очищаємо від літер та пробілів, залишаємо лише цифри, крапку, кому, мінус
                                        let cleaned = strVal.replace(/[^0-9.,-]/g, '');
                                        if (cleaned !== '') {
                                            amountStr = cleaned; // take the rightmost valid number
                                        }
                                    }
                                }
                            }
                            
                            const item = {
                                name: rightName,
                                period: String(multukJson[r][28] || multukJson[r][27] || '').trim(),
                                amount: amountStr
                            };
                            if (currentSection === 'withheld') mData.withheld.push(item);
                            else mData.paid.push(item);
                        }
                    }
                    
                    multukMap[docName] = mData;
                }
            }
        }
    }

    let wbSalary;
    if (Buffer.isBuffer(salaryFilePath)) {
        wbSalary = XLSX.read(salaryFilePath, { type: 'buffer' });
    } else {
        wbSalary = XLSX.readFile(salaryFilePath);
    }

    if (!wbSalary.Sheets[sheetName]) {
        throw new Error(`Лист "${sheetName}" не знайдено у таблиці зарплат.`);
    }

    const salaryJson = XLSX.utils.sheet_to_json(wbSalary.Sheets[sheetName], { header: 1 });
    
    // Logic for previous month likarTable
    const ukrMonths = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
    const lowerSheetName = sheetName.toLowerCase();
    const monthIdx = ukrMonths.indexOf(lowerSheetName);
    let prevMonthSheetName = monthIdx > 0 ? ukrMonths[monthIdx - 1] : (monthIdx === 0 ? 'грудень' : null);
    
    let prevSalaryJson = null;
    if (prevMonthSheetName && wbSalary.Sheets[prevMonthSheetName]) {
        prevSalaryJson = XLSX.utils.sheet_to_json(wbSalary.Sheets[prevMonthSheetName], { header: 1 });
    } else {
        prevMonthSheetName = lowerSheetName;
        prevSalaryJson = salaryJson;
    }

    let prevSalaryMap = {};
    for (let i = 4; i < prevSalaryJson.length; i++) {
        const pr = prevSalaryJson[i];
        if (pr && pr[1]) {
            const docName = normalizeName(pr[1]);
            // Якщо вже є такий лікар, то перезаписуємо тільки якщо цей рядок стосується Прайден Мед
            if (!prevSalaryMap[docName] || String(pr[2]).toLowerCase().includes('прайден')) {
                prevSalaryMap[docName] = pr;
            }
        }
    }
    
    let updatedCount = 0;
    let newUsersCount = 0;
    let updatedUsersList = []; // Збираємо тільки оновлених/нових користувачів для upsert

    function transliterate(text) {
        const normalizedText = normalizeName(text);
        const map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh',
            'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya'
        };
        let result = normalizedText.split('').map(char => map[char] || char).join('');
        // Collapse double l to single l (e.g. alla -> ala)
        result = result.replace(/ll/g, 'l');
        return result;
    }

    let usersToProcess = new Map();

    // 1. Збираємо всіх з Мультика
    for (const docName in multukMap) {
        usersToProcess.set(docName, {
            name: multukMap[docName].originalName,
            m1c: multukMap[docName],
            row: [],
            prevRow: []
        });
    }

    // 2. Додаємо/Оновлюємо з Зарплати поточного місяця
    for (let i = 0; i < salaryJson.length; i++) {
        const row = salaryJson[i];
        if (!row || !row[1]) continue;
        const name = String(row[1]).trim();
        const lowerName = name.toLowerCase();

        if (
            name === 'ПІБ' || 
            lowerName.includes('всього') || 
            lowerName.includes('філіал') || 
            lowerName.includes('разом по закладу') || 
            name === '' || 
            name === 'undefined' || 
            name.split(/\s+/).length < 2 ||
            /[0-9]/.test(name) ||
            lowerName.includes('адміністратор') ||
            lowerName.includes('прибиральниця') ||
            lowerName.includes('сіс адмін')
        ) continue;

        const normalizedName = normalizeName(name);
        const nameParts = normalizedName.split(' ').filter(p => p.length > 2);
        
        let foundKey = null;
        for (const key of usersToProcess.keys()) {
            if (nameParts.every(part => key.includes(part))) {
                foundKey = key;
                break;
            }
        }

        if (row[2] && !String(row[2]).toLowerCase().includes('прайден')) {
            const hasPrayden = salaryJson.some(r => r && r[1] && String(r[1]).trim() === name && r[2] && String(r[2]).toLowerCase().includes('прайден'));
            if (hasPrayden) continue;
        }

        if (foundKey) {
            const obj = usersToProcess.get(foundKey);
            obj.row = row;
            obj.name = name; 
        } else {
            usersToProcess.set(normalizedName, {
                name: name,
                m1c: null,
                row: row,
                prevRow: []
            });
        }
    }

    // 3. Знаходимо попередній рядок (prevRow)
    for (const [key, obj] of usersToProcess.entries()) {
        const normalizedName = normalizeName(obj.name);
        const nameParts = normalizedName.split(' ').filter(p => p.length > 2);
        let pRow = [];
        for (let docName in prevSalaryMap) {
            if (nameParts.every(part => docName.includes(part))) {
                pRow = prevSalaryMap[docName];
                break;
            }
        }
        obj.prevRow = pRow;
    }

    const currIndices = findColumnIndices(salaryJson[0]);
    const prevIndices = findColumnIndices(prevSalaryJson[0]);
    const currPremiumCols = findPremiumColumns(salaryJson[0]);
    const prevPremiumCols = findPremiumColumns(prevSalaryJson[0]);

    // 4. Обробляємо всіх зібраних користувачів
    for (const [key, obj] of usersToProcess.entries()) {
        const name = obj.name;
        const normalizedName = normalizeName(name);
        const nameParts = normalizedName.split(' ').filter(p => p.length > 2);
        let m1c = obj.m1c;
        const row = obj.row;
        const prevRow = obj.prevRow;

        let user = usersData.find(u => {
            if (!u.name) return false;
            const normalizedUName = normalizeName(u.name);
            return nameParts.every(part => normalizedUName.includes(part));
        });

        const loginParts = name.split(' ').map(p => transliterate(p));
        let baseLogin = `${loginParts[0]}.${loginParts[1] || ''}`.replace(/[^a-z\.]/g, '');
        if (baseLogin === '.') baseLogin = `user.${Date.now()}`;
        
        let newLogin = baseLogin;
        let counter = 1;
        while (usersData.some(u => u.login === newLogin && (!user || u.id !== user.id))) {
            newLogin = `${baseLogin}${counter}`;
            counter++;
        }

        const firstTwo = loginParts[0] && loginParts[0].length >= 2 ? loginParts[0].substring(0, 2) : 'us';
        const newPassword = firstTwo.charAt(0).toUpperCase() + firstTwo.slice(1) + '2026';

        if (!user) {
            const tempId = `user_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            user = {
                id: idToUUID(tempId),
                login: newLogin,
                password: newPassword,
                role: 'user',
                name: name,
                position: 'Лікар',
                stats: {}
            };
            usersData.push(user);
            newUsersCount++;
        } else {
            if (/[а-яіїєґ]/.test(user.login)) {
                user.login = newLogin;
                user.password = newPassword;
            }
        }

        // ВАЖЛИВО ДЛЯ МАЙБУТНІХ МІСЯЦІВ (Пам'ятка по колонках):
        // Визначаємо індекси колонок динамічно по заголовках.
        const vsyaZPTotal = prevRow[prevIndices.vsyaZPCol] || '';
        const avans = prevRow[prevIndices.avansCol] || '';
        const zp = prevRow[prevIndices.zpCol] || '';

        const currVsyaZPTotal = row[currIndices.vsyaZPCol] || '';
        const currAvans = row[currIndices.avansCol] || '';
        const currZp = row[currIndices.zpCol] || '';

        // Отримуємо премію за попередній і поточний місяць безпосередньо з колонок премій
        const premiyaNumPrev = getPremiumSum(prevRow, prevPremiumCols);
        const premiyaNum = getPremiumSum(row, currPremiumCols);

        // Розрахунок загальної заробленої суми з урахуванням поточного та попереднього місяців
        const currEarned = calculateEarnedSum(row);
        const prevEarned = (prevMonthSheetName !== lowerSheetName && prevRow.length > 0) ? calculateEarnedSum(prevRow) : 0;
        const totalEarned = currEarned + prevEarned;

        // Оновлюємо зелену комірку (paid) в мультику
        if (m1c && m1c.paid) {
            const pObj = m1c.paid.find(p => p.name && p.name.toLowerCase().includes('премі'));
            if (pObj) {
                pObj.amount = premiyaNum.toFixed(2);
            } else {
                m1c.paid.push({
                    name: 'премія',
                    period: lowerSheetName,
                    amount: premiyaNum.toFixed(2)
                });
            }
        }

        const likarTable = [];

        if (prevMonthSheetName && prevMonthSheetName !== lowerSheetName && prevRow.length > 0) {
            pushCategoryRows(likarTable, prevRow, prevMonthSheetName);
            likarTable.push(
                { rowLabel: '', period: prevMonthSheetName, col1: '', col2: '', amount: String(vsyaZPTotal), desc: `Зарплата ${prevMonthSheetName}`, notes: `дані з таблиці ${prevMonthSheetName}` },
                { rowLabel: '21 рядок', period: prevMonthSheetName, col1: '', col2: '', amount: String(avans), desc: 'аванс', notes: `дані з таблиці ${prevMonthSheetName}` },
                { rowLabel: '21 рядок', period: prevMonthSheetName, col1: '', col2: '', amount: String(zp), desc: 'зп від окладу', notes: `дані з таблиці ${prevMonthSheetName}` },
                { rowLabel: '', period: prevMonthSheetName, col1: '', col2: '', amount: premiyaNumPrev.toFixed(2), desc: `премія за ${prevMonthSheetName}`, notes: '' }
            );
        }

        pushCategoryRows(likarTable, row, lowerSheetName);
        likarTable.push(
            { rowLabel: '', period: lowerSheetName, col1: '', col2: '', amount: String(currVsyaZPTotal), desc: `Зарплата ${lowerSheetName}`, notes: `дані з таблиці ${lowerSheetName}` },
            { rowLabel: '21 рядок', period: lowerSheetName, col1: '', col2: '', amount: String(currAvans), desc: 'аванс', notes: `дані з таблиці ${lowerSheetName}` },
            { rowLabel: '21 рядок', period: lowerSheetName, col1: '', col2: '', amount: String(currZp), desc: 'зп від окладу', notes: `дані з таблиці ${lowerSheetName}` },
            { rowLabel: '', period: lowerSheetName, col1: '', col2: '', amount: premiyaNum.toFixed(2), desc: `премія за ${lowerSheetName}`, notes: '' }
        );

        if (!m1c) {
            m1c = { likarTable: likarTable, header: `РОЗРАХУНКОВИЙ ЛИСТОК ЗА ${sheetName.toUpperCase()} 2026`, org: 'ТОВ"ПРАЙДЕН МЕД"', accrued: [], withheld: [], paid: [] };
        } else if (!m1c.likarTable || m1c.likarTable.length === 0) {
            m1c.likarTable = likarTable;
        }

        if (!user.stats) user.stats = {};
        if (!user.stats.salaries) user.stats.salaries = {};

        const salaryData = {
            period: sheetName,
            vizitiKol: row[10] || '', vizitiTarif: row[11] || '', vizitiSuma: row[12] || '',
            vnesKol: row[13] || '', vnesTarif: row[14] || '', vnesSuma: row[15] || '',
            vsyaZP: totalEarned, avans: currAvans, zpOklad: currZp,
            premiya: premiyaNum ? premiyaNum.toFixed(2) : '',
            multuk1C: m1c
        };

        user.stats.salaries[sheetName.toLowerCase()] = salaryData;
        user.stats.salary = salaryData;

        if (m1c && m1c.position) user.position = m1c.position;

        updatedUsersList.push(user);
        updatedCount++;
    }

    // Оновлення в Neon
    if (useDatabase && updatedUsersList.length > 0) {
        const map = new Map();
        for (const u of updatedUsersList) map.set(u.id, u);
        const uniqueUsersToUpsert = Array.from(map.values());
        
        console.log(`Відправляємо ${uniqueUsersToUpsert.length} оновлених користувачів у Neon PostgreSQL...`);
        try {
            for (const user of uniqueUsersToUpsert) {
                await sql`
                    INSERT INTO users (id, login, password, role, name, position, stats)
                    VALUES (${user.id}, ${user.login}, ${user.password}, ${user.role}, ${user.name}, ${user.position}, ${JSON.stringify(user.stats)}::jsonb)
                    ON CONFLICT (login) 
                    DO UPDATE SET 
                        password = EXCLUDED.password,
                        name = EXCLUDED.name,
                        position = EXCLUDED.position,
                        stats = EXCLUDED.stats
                `;
            }
        } catch (error) {
            console.error('Помилка оновлення Neon:', error);
            throw new Error('Не вдалося зберегти дані в базі даних Neon: ' + error.message);
        }
    }

    // Завжди пишемо в users.json для локальної розробки (якщо ми не на Netlify, де він ephemeral)
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
    } catch (e) {
        console.warn('Не вдалося записати в users.json (швидше за все це Netlify/Read-Only файлова система)');
    }

    return { success: true, updatedCount, newUsersCount, usersData };
}

module.exports = { parseSalaryData };
