const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../json_inputs');
const fallbackInputFile = path.join(__dirname, '../ZaKBITEHb.json');
const outputFile = path.join(__dirname, '../data/users.json');

// Ensure directories exist
if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getLatestInputFile() {
  const files = fs.readdirSync(inputDir).filter(name => name.toLowerCase().endsWith('.json'));
  if (files.length === 0) {
    return fallbackInputFile;
  }

  const latestFile = files
    .map(name => ({
      name,
      mtime: fs.statSync(path.join(inputDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0];

  return path.join(inputDir, latestFile.name);
}

function generateLogin(fullName) {
  // Transliterate Ukrainian to Latin
  const map = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh',
    'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh',
    'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia', '\'': ''
  };

  function transliterate(word) {
    return word.split('').map(char => map[char] || char).join('');
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) {
    const lastName = transliterate(parts[0]).toLowerCase();
    const firstInitial = transliterate(parts[1][0]).toLowerCase();
    const secondInitial = transliterate(parts[2][0]).toLowerCase();
    return `${lastName}.${firstInitial}${secondInitial}`;
  }
  
  return transliterate(fullName.trim().replace(/\s+/g, '.')).toLowerCase();
}

function processData() {
  const inputFile = getLatestInputFile();
  if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile);
    return;
  }

  console.log('Using input JSON:', inputFile);
  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(rawData);

  const sourceMetadata = {
    filename: path.basename(inputFile),
    title: data.metadata?.title || 'Статистика по лікарям',
    description: data.metadata?.description || '',
    created: data.metadata?.created || null,
    version: data.metadata?.version || null,
  };

  const users = [];

  // Admin account
  users.push({
    id: 'admin',
    login: 'admin',
    password: 'password', // 59847216 according to user, but wait, the prompt said 59847216 as password? "admin / 59847216"
    role: 'admin',
    name: 'Адміністратор',
    stats: {}
  });
  
  // Fix password for admin
  users[0].password = '59847216';

  let defaultPassword = 'med'; // prefix

  if (data.processedData && Array.isArray(data.processedData)) {
    data.processedData.forEach((doc, idx) => {
      const login = generateLogin(doc.doctorName);
      // Let's use a fixed logic password for users, or a default one
      const password = `${login}2026`; // Login + 2026

      users.push({
        id: `user_${idx + 1}`,
        login: login,
        password: password,
        role: 'user',
        name: doc.doctorName,
        position: doc.doctorPosition,
        stats: {
          totalPatients: doc.totalPatients || 0,
          totalAmount: doc.totalAmount || 0,
          errorsCount: doc.errors ? doc.errors.length : 0,
          patients: doc.patients || [],
          errors: doc.errors || [],
          source: sourceMetadata,
        }
      });
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(users, null, 2));
  console.log(`Generated ${users.length} users. Saved to ${outputFile}`);
}

processData();
