const fs = require('fs');
const users = JSON.parse(fs.readFileSync('c:\\Users\\PC\\Downloads\\StatisticBUH\\webcabinet\\data\\users.json', 'utf8'));
const doc = users.find(u => u.login === 'bihovshchyts.sofiya');
console.log(JSON.stringify(doc.stats.salary.multuk1C, null, 2));
