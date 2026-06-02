# 🎮 Sho Games — Project Overview & Tech Stack

> **Last Updated:** February 17, 2026  
> **Project Name:** Sho Games  
> **Project Type:** Static Game Discovery Website  
> **Status:** In Development (Prototype / Early Stage)

---

## 📁 Project Structure

```
game website/
├── index.html              # Homepage — main landing page (76 KB, 1055 lines)
├── games.html              # Games listing page with search (51 KB, 616 lines)
├── code.html               # Alternate layout page / WIP (15 KB, 206 lines)
├── test.html               # Testing / sandbox page (2 KB, 48 lines)
├── slideshow.js            # JavaScript for image slideshow + sidebar toggle (762 B, 25 lines)
│
├── images/                 # All image assets (14 files)
│   ├── My logo.png         # Sho Games brand logo
│   ├── facebook.png        # Facebook social icon
│   ├── instargram.png      # Instagram social icon
│   ├── whatsapp.png        # WhatsApp social icon
│   └── game1.jpg – game10  # Game thumbnail/banner images (.jpg, .png, .webp)
│
└── game project md/        # 📂 This documentation folder
    └── PROJECT_OVERVIEW.md # You are here
```

---

## 🛠️ Tech Stack

| Layer          | Technology                         | Details                                                |
|----------------|------------------------------------|--------------------------------------------------------|
| **Markup**     | HTML5                              | Semantic HTML, inline SVG icons, `<meta viewport>`     |
| **Styling**    | Vanilla CSS (inline `<style>`)     | No external CSS files; all styles are embedded in each HTML file |
| **JavaScript** | Vanilla JS (ES6)                   | Arrow functions, `classList`, `querySelector`, `addEventListener` |
| **Icons**      | Inline SVG                         | All icons (home, games, help, settings, language, search, menu, star) are hand-coded inline SVGs |
| **Images**     | Local assets                       | `.jpg`, `.png`, `.webp` formats stored in `/images/`   |
| **External JS**| [EmailJS](https://www.emailjs.com/) CDN (`emailjs-com@3`) | Used for sending geolocation data via email |
| **Fonts**      | System font (`Arial, sans-serif`)  | No external font libraries (e.g., Google Fonts)        |
| **Framework**  | None                               | Pure static HTML/CSS/JS — no React, Vue, Next.js, etc. |
| **Build Tools**| None                               | No bundlers, no npm, no package.json                   |
| **Backend**    | None                               | Fully client-side; no server or database               |
| **Hosting**    | GitHub Pages (implied)             | Logo links to `michealshodipo56.github.io`             |

---

## 📄 Page-by-Page Breakdown

### 1. `index.html` — Homepage (Main Landing Page)

**Size:** ~76 KB · 1,055 lines

**Layout:**
- **Sidebar (15% width, fixed)** — Yellow-to-blue gradient background with diagonal black decorative lines
  - Brand logo (custom SVG text "Sho Games" + PNG icon)
  - Navigation links: Home, Games, Help, Setting, Support (each with inline SVG icon)
  - Social media links: Facebook, Instagram, WhatsApp (PNG icons)
- **Main Content Area (84.7% width)**
  - **Image Slideshow** — 10 game images auto-cycling every 3.5 seconds
  - Decorative overlay elements (yellow triangle top-left, blue triangle bottom-right)
  - **Top Navigation Bar** — Links: Friends, Categories, Subscription
  - **Game Card Rows** — Two rows labeled "Adventure", each with 6 horizontally-scrolling game cards
    - Each card: game image, placeholder name ("Name here"), lorem ipsum description, 5-star SVG rating (3 gold / 2 white)

**JavaScript Features:**
- Sidebar toggle (show/hide on mobile via CSS class `.visible`)
- Image slideshow (`slideshow.js`) — cycles through `.mySlides` elements
- Location modal — requests geolocation on game card click, sends coordinates via EmailJS
- EmailJS integration (service: `service_vt7jvak`, template: `template_ef0a01o`)

**Responsive Breakpoints:**
| Breakpoint     | Changes                                                    |
|----------------|------------------------------------------------------------|
| `≤ 960px`      | Sidebar logo stacks vertically                             |
| `≤ 850px`      | Sidebar collapses off-screen; hamburger menu appears; main content goes full width |
| `≤ 400px`      | Top nav text shrinks                                       |
| `≤ 300px`      | Menu button shifts down                                    |

---

### 2. `games.html` — Games Listing Page

**Size:** ~51 KB · 616 lines

**Layout:**
- Same sidebar as `index.html` (duplicated code)
- **Top Bar** — Hidden logo (left) + Search input with SVG search icon (right)
- **Game Cards** — One "Adventure" row with 6 horizontally-scrolling game cards (same structure as homepage)

**Differences from `index.html`:**
- No slideshow
- Has a search bar (not yet functional — no JS search logic)
- Sidebar links: Home links to `index.html`
- Inline JS for sidebar toggle only (no slideshow, no EmailJS)

---

### 3. `code.html` — Alternate Layout (WIP)

**Size:** ~15 KB · 206 lines

**Layout:**
- Same sidebar structure as other pages
- **Main area** — Red background, displays a single image (`images/lof.jpg` — likely missing)
- No JavaScript functionality
- Appears to be a work-in-progress / layout experiment

---

### 4. `test.html` — Sandbox / Experimentation Page

**Size:** ~2 KB · 48 lines

**Features:**
- CSS slide-in animation test (`.box` element with `translateX` transition)
- Button to toggle a red box in/out of view
- Embedded iframe loading a game from GameDistribution (`Monster Dash`)
- External image loaded from URL (God of War Ragnarök)
- SVG search icon test

---

### 5. `coding/` — Location Tracker Experiments (Code1–Code5)

All 5 files are **variations of a geolocation tracker** that:
1. Shows a modal asking for location permission
2. Uses the browser's Geolocation API (`navigator.geolocation`)
3. Sends latitude/longitude via **EmailJS** to a configured email

| File         | Trigger                        | Modal Behavior                          |
|--------------|--------------------------------|-----------------------------------------|
| `Code1.html` | "Share Location" button click | Modal opens → user clicks "Allow"       |
| `Code2.html` | **Auto on page load**         | Modal shows immediately                 |
| `Code3.html` | "Share Location" button click | Uses `.hidden` CSS class toggle         |
| `Code4.html` | "Get My Location" button      | Auto-requests location when modal opens |
| `Code5.html` | "Get My Location" button      | Two-step: modal opens → "Allow" button  |

**Shared EmailJS Config Across All Files:**
```
Service ID:  service_vt7jvak
Template ID: template_ef0a01o
User ID:     ja1S8dOJkJiD3GVZD
```

---

## 🖼️ Image Assets

| File               | Size       | Format | Usage                              |
|--------------------|------------|--------|------------------------------------|
| `My logo.png`      | 10.5 KB    | PNG    | Brand logo in sidebar              |
| `facebook.png`     | 4.3 KB     | PNG    | Social media icon                  |
| `instargram.png`   | 8.6 KB     | PNG    | Social media icon                  |
| `whatsapp.png`     | 10.2 KB    | PNG    | Social media icon                  |
| `game1.jpg`        | 769 KB     | JPEG   | Game thumbnail / slideshow         |
| `game2.png`        | 1.3 MB     | PNG    | Game thumbnail / slideshow         |
| `game3.jpg`        | 200 KB     | JPEG   | Game thumbnail / slideshow         |
| `game4.webp`       | 78 KB      | WebP   | Game thumbnail / slideshow         |
| `game5.jpg`        | 157 KB     | JPEG   | Game thumbnail / slideshow         |
| `game6.jpg`        | 166 KB     | JPEG   | Game thumbnail / slideshow         |
| `game7.jpg`        | 67 KB      | JPEG   | Game thumbnail / slideshow         |
| `game8.png`        | 1.3 MB     | PNG    | Game thumbnail / slideshow         |
| `game9.jpg`        | 1.1 MB     | JPEG   | Game thumbnail / slideshow         |
| `game10.jpg`       | 1.2 MB     | JPEG   | Game thumbnail / slideshow         |

**Total image size:** ~5.6 MB

---

## 🎨 Design System

### Color Palette
| Color                    | Hex / Value                              | Usage                    |
|--------------------------|------------------------------------------|--------------------------|
| Background               | `#000000` (Black)                       | Page background          |
| Text                     | `#FFFFFF` (White)                       | Body text, icons         |
| Sidebar Gradient         | `yellow` → `blue` (diagonal)           | Sidebar background       |
| Button Primary           | `#007BFF` (Blue)                        | Buttons                  |
| Button Success           | `#28a745` (Green)                       | "Allow" button           |
| Star Rating (Active)     | `#FFD700` (Gold)                        | Filled stars             |
| Star Rating (Inactive)   | `#FFFFFF` (White)                       | Empty stars              |
| Hover State              | `rgba(78, 78, 78, 0.452)`              | Sidebar link hover       |
| Decorative Lines         | `rgb(0, 0, 0)` (Black)                 | Diagonal sidebar lines   |

### Typography
- **Font Family:** `Arial, sans-serif` (system font only)
- **Game Category Titles:** `25px` font-size, centered
- **Game Card Names:** Bold, centered

### Layout Pattern
- **Desktop:** Sidebar (15%) + Main Content (85%) using `display: flex`
- **Mobile (≤ 850px):** Full-width content with collapsible off-canvas sidebar
- **Game Cards:** Horizontal scroll containers (`overflow-x: scroll`) with fixed-width cards (`15em`)

---

## ⚙️ JavaScript Functionality

### `slideshow.js` (External File)
```
- Sidebar toggle (show/hide via .visible class)
- Auto-advancing image slideshow (3.5s interval)
- Cycles through elements with class .mySlides
```

### Inline Scripts (in `index.html`)
```
- EmailJS initialization
- Geolocation modal (open/close)
- Geolocation API request
- Coordinates sent via EmailJS
- Error handling for denied/unavailable/timeout
```

---

## 🔗 External Dependencies

| Dependency   | Version | CDN URL                                                    | Purpose              |
|--------------|---------|------------------------------------------------------------|----------------------|
| EmailJS      | v3      | `https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js` | Send location emails |

---

## 📝 Notable Observations

1. **No CSS file separation** — All styles are embedded inline in `<style>` tags within each HTML file, leading to significant code duplication across pages.

2. **Heavy SVG duplication** — The sidebar SVG icons and star rating SVGs are copy-pasted in full across every page and every game card, making files very large (e.g., `index.html` is 76 KB / 1,055 lines mostly due to repeated SVGs).

3. **No build tooling** — No `package.json`, bundlers, or preprocessors. This is a raw static site.

4. **Sidebar code duplication** — The entire sidebar markup + styles are duplicated across `index.html`, `games.html`, and `code.html`.

5. **Placeholder content** — Game cards use "Name here" as the title and lorem ipsum for descriptions. No real game data is connected.

6. **No functional search** — `games.html` has a search bar UI but no JavaScript to filter/search.

7. **Geolocation feature** — The location tracking + EmailJS integration is embedded directly in the main site (triggered by clicking game cards on `index.html`). The `coding/` folder contains 5 standalone prototype variations of this feature.

8. **No backend / database** — Everything is client-side. No user accounts, no game data API, no server.

9. **Responsive design** — Basic responsive breakpoints exist at 960px, 850px, 400px, and 300px using `@media` queries.

10. **Missing assets** — `code.html` references `images/lof.jpg` which is not present in the images folder.
