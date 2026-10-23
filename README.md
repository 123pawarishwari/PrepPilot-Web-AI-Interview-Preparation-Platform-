# PrepPilot AI (HTML + CSS + JavaScript)

Interview practice website. No build step, no server, no dependencies.

## Run
Double-click `index.html` (needs internet once for Google Fonts, otherwise falls back to system fonts), or in VS Code install "Live Server" and click "Go Live".

## Features
- Dashboard: interviews completed, average score, questions practiced, streak, trend chart, recent sessions
- Mock interview: type, difficulty and length, one question at a time, scored report
- Question bank: search, filters, answers, favorites, completed tracking
- Answer evaluator: score, strengths, improvements, sample answer
- Progress is stored in your browser (localStorage)

## Important
Scoring is a **rule-based demo engine** (keyword coverage, length, structure). It is not an AI model and the app labels it that way.

## Add screenshots
Save images in a `screenshots/` folder and link them here.

## Push to GitHub
```
git init
git add .
git commit -m "PrepPilot AI website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/PrepPilot-Web.git
git push -u origin main
```

MIT License
