# 📸 SnapBooth

A fun, Snapchat-style AR photo booth web app built with **React + Vite**. Take selfies with real-time face-tracked AR filters, apply aesthetic color presets, add stickers, create film strip collages, and save to your gallery!

---

## ✨ Features

- 🎭 **Real-time AR Filters** — Face detection powered by face-api.js. Filters automatically track and stick to your face as you move
  - 🐰 Bunny — ears + whiskers
  - 🐱 Cat — ears + whiskers
  - 💗 Hearts — floating above head
  - ☁️ Clouds — cute puffs above head
  - 🎀 Bow — hair clip style on side of head
  - 🎃 Pumpkin — spooky hat

- 🎨 **Aesthetic Color Filters**
  - Filmy · Summery · Mild · Candy

- 📷 **Single & Collage Mode** — Take 2, 3, or 4 shots that combine into a film strip

- 🖼️ **Sticker Editor** — Add emoji stickers from 4 packs (Cute, Spooky, Hype, Nature) + custom caption

- 🗂️ **Gallery** — All your snaps saved locally, with download & share support

- 🔄 **Mirror & Flip Camera** — Front/back camera switch + mirror toggle

---

## 🛠️ Tech Stack

| Tool | Usage |
|------|-------|
| React 18 | UI & state management |
| Vite | Build tool & dev server |
| face-api.js | Real-time face detection & landmarks |
| Canvas API | AR filter rendering & photo capture |
| localStorage | Gallery persistence |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/prachisamantaray/SnapBooth.git
cd SnapBooth

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

---
## 📁 Project Structure
```
SnapBooth/
├── public/
├── src/
│   ├── main.jsx          # Entry point
│   └── PhotoBhoot.jsx    # Main app component
├── index.html
├── package.json
└── vite.config.js
```
---
## 🌐 Live Demo
🔗 [snapbooth.vercel.app](https://snapbooth.vercel.app)
---
## 📸 Screenshots

> _Face filters tracking in real time, aesthetic color presets, sticker editor & gallery_
---
## 🙋‍♀️ Author

**Prachi Samantaray**
- GitHub: [@prachisamantaray](https://github.com/prachisamantaray)
