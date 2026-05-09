import re
with open('routes/books.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"type DetailTrendPeriod[\s\S]*?(?=router\.get\('/',)",
    '',
    content
)

content = re.sub(
    r"const activityWindowClause = getActivityWindowClause\(activityPeriod, 'br\.borrow_date'\);(.*?)res\.json\(\{[\s\S]*?relatedBooks: relatedBooksResult\.rows\.map\(\(row\) => \(\{[\s\S]*?\}\)\),\s*\}\);",
    r"        const details = await getBookDetailStatsService(id, book, user, trendPeriod, activityPeriod);\n\n        res.json({\n            ...book,\n            trend: details.trend,\n            currentBorrowers: details.currentBorrowers,\n            history: details.history,\n            metrics: details.metrics,\n            relatedBooks: details.relatedBooks,\n        });",
    content,
    flags=re.DOTALL
)

with open('routes/books.ts', 'w', encoding='utf-8') as f:
    f.write(content)
