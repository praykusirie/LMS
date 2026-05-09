const fs = require('fs');
const path = require('path');

const adminPath = path.join('src', 'pages', 'dashboard', 'AdminDashboard.tsx');
let adminContent = fs.readFileSync(adminPath, 'utf8');
adminContent = adminContent.replace(/icon=\{<BookOpen className="h-5 w-5" \/>\}/g, 'icon={BookOpen}');
adminContent = adminContent.replace(/color="bg-primary\/10 text-primary"/g, 'color="navy"');
fs.writeFileSync(adminPath, adminContent);

const libPath = path.join('src', 'pages', 'dashboard', 'LibrarianDashboard.tsx');
let libContent = fs.readFileSync(libPath, 'utf8');
libContent = libContent.replace(/icon=\{<BookOpen className="h-5 w-5" \/>\}/g, 'icon={BookOpen}');
libContent = libContent.replace(/color="bg-primary\/10 text-primary"/g, 'color="navy"');

// also removing the second setCategories issue in LibrarianDashboard.tsx if it exists
fs.writeFileSync(libPath, libContent);
console.log('Fixed StatsCard properties.');
