const fs = require('fs');
const path = require('path');

const libPath = path.join('src', 'pages', 'dashboard', 'LibrarianDashboard.tsx');
let libContent = fs.readFileSync(libPath, 'utf8');

libContent = libContent.replace(
  "setTrends(trendsRes.data);",
  `setTrends(trendsRes.data);
        
        const catRes = await api.get('/categories');
        setCategories(catRes.data.filter((c: any) => parseInt(c.book_count) > 0));`
);

fs.writeFileSync(libPath, libContent);
console.log('Fixed LibrarianDashboard category fetching.');
