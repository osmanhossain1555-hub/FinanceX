# ✕ Finance X

> **Command Your Money** — A dark-themed, offline-first personal finance PWA built with plain HTML, CSS, and JavaScript.

![Finance X](https://img.shields.io/badge/Finance_X-v1.0.0-00e5a0?style=flat-square&labelColor=0a0a0f)
![PWA](https://img.shields.io/badge/PWA-Ready-0aefff?style=flat-square&labelColor=0a0a0f)
![Offline](https://img.shields.io/badge/Offline-First-ffca3a?style=flat-square&labelColor=0a0a0f)

---

## 📁 Project Structure

```
finance-x/
├── index.html              ← Main app shell (all pages, modals, navigation)
├── style.css               ← Full styling (dark theme, responsive, animations)
├── script.js               ← All app logic (state, charts, filters, advisor)
├── manifest.json           ← PWA manifest (install, icons, shortcuts)
├── sw.js                   ← Service worker (offline caching, strategies)
├── generate-icons.js       ← Icon generator using canvas package (optional)
├── create-icons-simple.js  ← Icon generator using pure Node.js (no deps)
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   ├── icon-512.png
│   └── screenshot-mobile.png
└── README.md
```

---

## 📄 What Each File Does

### `index.html`
The entire app shell. Contains:
- Splash screen (shown on first load)
- Top header with brand, install button, notification dot, settings icon
- Four pages: Dashboard, Transactions, AI Advisor, Settings
- Filter bars (synced across pages)
- Transaction list, chart containers, monthly summary
- All modals: Add/Edit Transaction, Confirm Delete, Add Goal
- Bottom navigation with FAB button
- All semantic HTML and ARIA-friendly structure

### `style.css`
Complete stylesheet with:
- CSS custom properties (variables) for the entire design system
- Dark premium theme with gaming-dashboard aesthetic
- Syne display font + DM Mono for numbers
- Glass morphism cards
- Animated charts and transitions
- Mobile-first responsive layout (phone → tablet → desktop)
- Bottom navigation with safe-area insets for modern phones
- Modal slide-up animation with spring physics
- Toast notification system
- All component styles: cards, forms, charts, badges, etc.

### `script.js`
Full application logic:
- **Central state object** (`appState`) holding all transactions, categories, settings, goals, and filters
- **Persistence**: `loadData()` / `saveData()` using localStorage
- **Filter engine**: `getFilteredTransactions()` — powers all UI in one pass
- **Chart rendering**: Chart.js trend (line), category breakdown (doughnut), income vs expense (bar)
- **Dashboard render**: totals, period comparisons, percentage changes, recent transactions
- **Transaction CRUD**: add, edit, delete with full modal forms
- **AI Advisor**: rule-based engine analyzing current vs previous month, spending patterns, health score
- **Financial Health Score**: composite 0–100 score across savings rate, expense control, income, trends
- **Goal tracker**: add/delete savings goals with progress bars
- **Settings**: profile, currency, categories CRUD, export/import JSON, QR code
- **PWA install**: `beforeinstallprompt` handling, install button lifecycle
- **Service worker registration**
- **Sample data**: 45 days of realistic transactions for meaningful first-load charts

### `manifest.json`
PWA web app manifest:
- App name: "Finance X", short name: "Finance X"
- `display: "standalone"` — hides browser chrome when installed
- Dark theme color matching the app
- All required icon sizes (72 → 512px)
- Two app shortcuts: "Add Expense" and "Dashboard"
- Portrait orientation lock

### `sw.js`
Service worker with two caching strategies:
- **Cache First**: own files (`index.html`, `style.css`, `script.js`) and CDN assets
- **Network First**: Google Fonts and dynamic requests
- **App Shell caching** on install
- **Old cache cleanup** on activate
- **Offline fallback**: always returns `index.html` for navigation requests
- Handles `SKIP_WAITING` messages for hot updates

---

## 🚀 How to Run Locally

### Option 1: Python (simplest)
```bash
cd finance-x
python3 -m http.server 8080
# Open http://localhost:8080 in Chrome
```

### Option 2: Node.js
```bash
cd finance-x
npx serve .
# or
npx http-server . -p 8080
```

### Option 3: VS Code Live Server
1. Install the **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**

> ⚠️ **Important**: The app must be served over HTTP/HTTPS (not `file://`) for the Service Worker and PWA features to work. Always use a local server.

---

## 🌐 How to Host on GitHub Pages

1. **Create a GitHub repository** (e.g., `finance-x`)

2. **Push your files**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Finance X PWA"
   git remote add origin https://github.com/YOUR_USERNAME/finance-x.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repo on GitHub
   - Click **Settings** → **Pages** (left sidebar)
   - Under **Source**, select `main` branch and `/ (root)`
   - Click **Save**

4. **Your app will be live at**:
   ```
   https://YOUR_USERNAME.github.io/finance-x/
   ```
   (It may take 1–2 minutes to go live)

5. **Update the QR hosted URL** in Settings (see below)

---

## 📱 How to Install on Android

### Automatic Install (recommended)
1. Open your hosted URL (GitHub Pages or local server) in **Chrome on Android**
2. Wait a few seconds — Chrome will show a **"Add Finance X to home screen"** banner at the bottom
3. Tap **Add** to install
4. The app appears on your home screen and runs fullscreen like a native app

### Manual Install
1. Open the app in Chrome on Android
2. Tap the **three dots menu** (⋮) in Chrome
3. Tap **"Add to Home screen"**
4. Confirm the name and tap **Add**

### In-App Install Button
- If the install prompt is available, a **download icon** appears in the top-right header
- In Settings → **Install App** section, an install button also appears
- Tap either button to trigger the native install flow

> 💡 The install prompt only appears once per session. If you dismiss it, reload the page and it may appear again. Chrome requires the site to be served over HTTPS for PWA install to work.

---

## 🔗 How to Update the Hosted QR URL

The QR code in Settings links to wherever you host the app, so others can scan it to open it.

1. After hosting (e.g., on GitHub Pages), go to the **Settings** page in Finance X
2. Scroll to **Share App**
3. Paste your full hosted URL in the **"Hosted URL"** field, e.g.:
   ```
   https://yourusername.github.io/finance-x/
   ```
4. Tap **Generate QR Code** — a scannable QR code appears
5. The URL is saved automatically — it persists in localStorage

You can also update `appState.settings.hostedUrl` directly in `script.js` as a default:
```javascript
// In script.js, around line 20:
const DEFAULT_HOSTED_URL = 'https://yourusername.github.io/finance-x/';
```

---

## ✨ Features Summary

| Feature | Details |
|---|---|
| Dashboard | Balance, income, expenses, savings cards with period comparison |
| Charts | Trend (7D/30D line), category donut, income vs expense bar (6 months) |
| Filters | Period, type, category — sync across all pages instantly |
| Transactions | Add, edit, delete, search, filter, paginated list |
| AI Advisor | Financial health score, rule-based insights, quick goals |
| Settings | Profile, currency, custom categories, export/import JSON |
| PWA | Installable, offline-first, service worker, manifest |
| QR Share | Generate QR linking to hosted version |
| Data | All data in localStorage, no backend needed |

---

## 🔧 Customization

### Change Currency
Settings → Currency Symbol field (e.g., `€`, `£`, `¥`)

### Add Custom Categories
Settings → Categories → type a name → select expense/income/both → Add

### Reset to Clean State
Settings → Data Management → **Reset All Data**
This clears all transactions, resets categories to defaults, and wipes settings.

### Export Backup
Settings → **Export JSON** — downloads a `.json` backup file

### Import Backup
Settings → **Import JSON** — select a previously exported `.json` file

---

## 🛠️ Regenerating Icons

If you want to regenerate the icons with Node.js:

```bash
# Pure Node.js (no npm install needed)
node create-icons-simple.js

# Or with canvas package (higher quality)
npm install canvas
node generate-icons.js
```

For production, replace the icons with custom-designed ones at each required size.

---

## 📦 Dependencies

All loaded from CDN (cached by service worker):
- **Chart.js** v4.4.0 — charts and data visualization
- **QRCode.js** v1.5.3 — QR code generation
- **Syne + DM Mono** (Google Fonts) — typography

No build step. No npm required for the app itself.

---

## 🏗️ Architecture Notes

- **Single state object**: `appState` in `script.js` is the single source of truth
- **Reactive updates**: `updateAll()` re-renders everything from state
- **Filter engine**: one `getFilteredTransactions()` function powers all lists and charts
- **No frameworks**: vanilla JS only — fast, no dependencies, works everywhere
- **localStorage**: all data persists offline automatically

---

*Finance X v1.0.0 — Built with ✕*
