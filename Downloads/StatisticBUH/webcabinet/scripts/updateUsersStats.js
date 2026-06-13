const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../json_inputs');
const fallbackFile = path.join(__dirname, '../ZaKBITEHb.json');
const usersFile = path.join(__dirname, '../data/users.json');

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

function getLatestInputFile() {
  const files = fs.readdirSync(inputDir).filter(name => name.toLowerCase().endsWith('.json'));
  if (files.length === 0) {
    return fallbackFile;
  }

  const latestFile = files
    .map(name => ({
      name,
      mtime: fs.statSync(path.join(inputDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0];

  return path.join(inputDir, latestFile.name);
}

function updateData() {
  const originalFile = getLatestInputFile();
  if (!fs.existsSync(originalFile) || !fs.existsSync(usersFile)) {
    console.error('Files not found');
    return;
  }

  const rawData = fs.readFileSync(originalFile, 'utf-8');
  const data = JSON.parse(rawData);

  const usersRaw = fs.readFileSync(usersFile, 'utf-8');
  const users = JSON.parse(usersRaw);

  if (data.processedData && Array.isArray(data.processedData)) {
    data.processedData.forEach(doc => {
      // Find the corresponding user
      const user = users.find(u => u.name === doc.doctorName);
      if (user && user.stats) {
        user.stats.patients = doc.patients || [];
        user.stats.errors = doc.errors || [];
      }
    });
  }

  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log('Successfully updated users.json with detailed patients and errors data.');
}

updateData();
