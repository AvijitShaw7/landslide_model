const fs = require('fs');
const path = require('path');
const neevCss = fs.readFileSync('../Neev/styles.css', 'utf8');
const rootVarsToAdd = `
  --bg-primary: var(--canvas);
  --bg-secondary: var(--surface);
  --bg-card: var(--surface);
  --bg-card-hover: var(--canvas);
  --border-subtle: var(--border);
  --border-accent: var(--ink-soft);
  --text-primary: var(--ink);
  --text-secondary: var(--ink-soft);
  --text-muted: var(--ink-soft);
  --accent-blue: var(--focus);
  --accent-cyan: var(--focus);
  --accent-emerald: var(--safe);
  --accent-red: var(--danger);
  --accent-amber: var(--warn);
  --accent-orange: var(--warn);
  --accent-purple: var(--focus);
`;
let newCss = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');\n@import "tailwindcss";\n\n` + neevCss;

// Inject missing vars into :root
newCss = newCss.replace(/:root\s*\{([\s\S]*?)\}/, (match, content) => `:root {\n${content}\n${rootVarsToAdd}}`);

// Fix image URLs
newCss = newCss.replace(/url\("([^"]+)"\)/g, 'url("/$1")');
newCss = newCss.replace(/url\('([^']+)'\)/g, 'url("/$1")');

// Add Leaflet overrides to avoid dark theme for map
newCss += `
/* Leaflet Overrides */
.leaflet-container {
  background: #FCFBF7 !important;
  font-family: 'Inter', sans-serif !important;
}
.leaflet-tile { filter: none !important; }
.leaflet-popup-content-wrapper {
  background: rgba(255, 255, 255, 0.96) !important;
  color: #2B2D2F !important;
  border: 1px solid var(--border) !important;
  box-shadow: 0 4px 14px var(--shadow-lg) !important;
}
.leaflet-popup-tip { background: rgba(255, 255, 255, 0.96) !important; border-top-color: transparent !important; }
`;

fs.writeFileSync('src/app/globals.css', newCss);

// Copy images
const imgs = ['Expect Assam floods to worsen in the next few days.jpg', 'Neev-logo.png', 'disaster1.jpg', 'pic.jpg'];
imgs.forEach(img => {
  if (fs.existsSync('../Neev/' + img)) {
    fs.copyFileSync('../Neev/' + img, 'public/' + img);
  }
});
console.log('CSS and images copied successfully.');
