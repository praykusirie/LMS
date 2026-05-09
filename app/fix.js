const fs = require('fs');
let s = fs.readFileSync('d:/projects/LMS/app/src/pages/Overdue.tsx', 'utf8');
s = s.replace(/api\.patch\([\s\S]*?\{/, 'api.patch(\/borrow-records/\, {');
s = s.replace(/api\.post\([\s\S]*?\)/, 'api.post(\/borrow-records/\/remind)');
fs.writeFileSync('d:/projects/LMS/app/src/pages/Overdue.tsx', s);
