# 🃏 Windows XP Solitaire

A faithful browser recreation of the classic **Windows XP Solitaire** (Klondike) game, built with plain HTML, CSS, and JavaScript — no frameworks required.

---

## ✨ Features

- Classic Klondike Solitaire gameplay
- Authentic Windows XP visual styling (title bar, menu bar, green felt background)
- Score tracking (XP-style scoring)
- Elapsed game timer
- Draw-one card mode from stock pile
- Automatic stock recycling

---

## 🚀 Getting Started

No installation required. Simply open `index.html` in any modern browser:

```bash
# Clone the repository
git clone https://github.com/TaynazDev/windows-xp-solitaire.git

# Open in browser
open index.html
```

Or just double-click `index.html` from your file explorer.

---

## 🎮 How to Play

### Objective

Move all 52 cards to the four **Foundation** piles (♥ ♦ ♣ ♠), built up from Ace to King by suit.

### Piles

| Pile | Description |
|------|-------------|
| **Stock** | Face-down draw pile. Click to draw a card. |
| **Waste** | Shows the top card drawn from the stock. Can be played onto tableau or foundations. |
| **Foundations** (×4) | Build Ace → King by suit. You win when all four are complete. |
| **Tableau** (×7) | The 7 columns where most of the gameplay happens. |

### Rules

1. **Tableau** columns are built in **descending order** with **alternating colors**  
   (e.g., a red 6 can go on a black 7).
2. **Foundations** are built in **ascending order** (A, 2, 3, … K) by the **same suit**.
3. **Only a King** (or a sequence starting with a King) can be placed in an empty tableau column.
4. Click the **Stock** to draw one card at a time to the Waste pile.
5. When the Stock is empty, clicking it **recycles** the entire Waste pile back to the Stock.
6. You can move the top card from the **Waste** pile onto a valid tableau column or foundation.
7. Sequences of face-up cards in the tableau can be moved together.

### Controls

| Action | How |
|--------|-----|
| Draw from Stock | Click the Stock pile |
| Recycle Waste → Stock | Click the empty Stock pile |
| Open in-game Help | Click **Help** in the menu bar |

### Scoring (Windows XP Style)

| Action | Points |
|--------|--------|
| Move card to Foundation | +10 |
| Move card from Waste to Tableau | +5 |
| Turn over a Tableau card | +5 |
| Move card from Foundation to Tableau | −15 |
| Draw card from Stock | −2 |
| Recycle Stock (Waste → Stock) | −100 |

Scores never drop below 0.

---

## 📁 Project Structure

```
windows-xp-solitaire/
├── index.html      # Game markup and layout
├── styles.css      # Windows XP visual styling
├── game.js         # Core game logic (deck, rendering, events)
├── CHANGELOG.md    # Version history
└── README.md       # This file
```

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## 📄 License

This project is open source. Feel free to fork, modify, and share it.
