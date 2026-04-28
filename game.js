/**
 * game.js – Windows XP Solitaire Core Logic
 * Implements: Deck generation, shuffle, and initial game state setup.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS = ['♥', '♦', '♣', '♠'];
const SUIT_NAMES = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ─── Data Structures ─────────────────────────────────────────────────────────

/**
 * A single playing card.
 * @typedef {{ suit: string, suitName: string, rank: string, value: number, faceUp: boolean }} Card
 */

/**
 * Game state object.
 * @type {{
 *   deck: Card[],
 *   stock: Card[],
 *   waste: Card[],
 *   foundations: Card[][],
 *   tableau: Card[][]
 * }}
 */
const gameState = {
    deck: [],
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
};

let score = 0;
let timerSeconds = 0;
let timerInterval = null;

// ─── Deck Utilities ───────────────────────────────────────────────────────────

/**
 * Generate a standard 52-card deck.
 * @returns {Card[]}
 */
function createDeck() {
    const deck = [];
    for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
            deck.push({
                suit: SUITS[s],
                suitName: SUIT_NAMES[s],
                rank: RANKS[r],
                value: r + 1,   // Ace=1, 2=2, … King=13
                faceUp: false,
            });
        }
    }
    return deck;
}

/**
 * Shuffle an array in-place using the Fisher-Yates algorithm.
 * @param {any[]} array
 * @returns {any[]} The same array, shuffled.
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Returns true if a suit is red (Hearts or Diamonds).
 * @param {string} suit
 * @returns {boolean}
 */
function isRed(suit) {
    return suit === '♥' || suit === '♦';
}

// ─── Game Initialization ──────────────────────────────────────────────────────

/**
 * Set up the initial Klondike Solitaire game state:
 *  - Tableau columns 0-6 receive 1-7 cards respectively.
 *    The top card of each column is face-up; the rest are face-down.
 *  - Remaining cards go to the Stock pile (face-down).
 *  - Waste and Foundation piles start empty.
 */
function initGame() {
    // Reset state
    gameState.stock = [];
    gameState.waste = [];
    gameState.foundations = [[], [], [], []];
    gameState.tableau = [[], [], [], [], [], [], []];
    score = 0;
    timerSeconds = 0;

    // Create and shuffle the deck
    gameState.deck = shuffle(createDeck());

    // Deal to tableau
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = gameState.deck[cardIndex++];
            card.faceUp = (row === col); // Only the last card in each column is face-up
            gameState.tableau[col].push(card);
        }
    }

    // Remaining cards go to the stock
    for (; cardIndex < gameState.deck.length; cardIndex++) {
        const card = gameState.deck[cardIndex];
        card.faceUp = false;
        gameState.stock.push(card);
    }

    // Render the initial state
    render();
    startTimer();
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/**
 * Build an HTML element for a single card.
 * @param {Card} card
 * @returns {HTMLElement}
 */
function createCardElement(card) {
    const el = document.createElement('div');
    el.classList.add('card');

    if (!card.faceUp) {
        el.classList.add('face-down');
        return el;
    }

    el.classList.add(isRed(card.suit) ? 'red' : 'black');

    const rankEl = document.createElement('div');
    rankEl.classList.add('card-rank');
    rankEl.textContent = card.rank;

    const suitSmall = document.createElement('div');
    suitSmall.classList.add('card-suit-small');
    suitSmall.textContent = card.suit;

    const suitCenter = document.createElement('div');
    suitCenter.classList.add('card-suit-center');
    suitCenter.textContent = card.suit;

    el.appendChild(rankEl);
    el.appendChild(suitSmall);
    el.appendChild(suitCenter);

    return el;
}

/**
 * Render the entire game state to the DOM.
 */
function render() {
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    renderScore();
}

function renderStock() {
    const stockEl = document.getElementById('stock-pile');
    stockEl.innerHTML = '';

    if (gameState.stock.length > 0) {
        const topCard = document.createElement('div');
        topCard.classList.add('card', 'face-down');
        stockEl.appendChild(topCard);

        const countLabel = document.createElement('span');
        countLabel.style.cssText =
            'position:absolute;bottom:4px;right:6px;color:rgba(255,255,255,0.7);font-size:11px;';
        countLabel.textContent = gameState.stock.length;
        stockEl.appendChild(countLabel);
    } else {
        // Empty stock – show recycle indicator
        const recycleEl = document.createElement('span');
        recycleEl.textContent = '↺';
        recycleEl.style.cssText = 'font-size:36px;color:rgba(255,255,255,0.4);';
        stockEl.appendChild(recycleEl);
    }
}

function renderWaste() {
    const wasteEl = document.getElementById('waste-pile');
    wasteEl.innerHTML = '';

    if (gameState.waste.length > 0) {
        const topCard = gameState.waste[gameState.waste.length - 1];
        const cardEl = createCardElement(topCard);
        wasteEl.appendChild(cardEl);
    } else {
        const label = document.createElement('span');
        label.classList.add('pile-label');
        label.textContent = 'Waste';
        wasteEl.appendChild(label);
    }
}

function renderFoundations() {
    for (let i = 0; i < 4; i++) {
        const foundationEl = document.getElementById(`foundation-${i}`);
        foundationEl.innerHTML = '';

        const pile = gameState.foundations[i];
        if (pile.length > 0) {
            const topCard = pile[pile.length - 1];
            const cardEl = createCardElement(topCard);
            foundationEl.appendChild(cardEl);
        } else {
            const suitEl = document.createElement('span');
            suitEl.classList.add('pile-suit');
            suitEl.textContent = SUITS[i];
            foundationEl.appendChild(suitEl);
        }
    }
}

function renderTableau() {
    for (let col = 0; col < 7; col++) {
        const colEl = document.getElementById(`tableau-${col}`);
        colEl.innerHTML = '';

        const cards = gameState.tableau[col];

        if (cards.length === 0) {
            // Keep the empty column placeholder visible
            colEl.style.minHeight = '100px';
            continue;
        }

        // Dynamically size the column to fit the stacked cards
        const FACE_DOWN_OFFSET = 20;
        const FACE_UP_OFFSET = 28;

        let totalHeight = 100; // minimum
        let offset = 0;

        cards.forEach((card, index) => {
            const cardEl = createCardElement(card);
            cardEl.classList.add('card-in-tableau');
            cardEl.style.top = `${offset}px`;
            colEl.appendChild(cardEl);

            if (index < cards.length - 1) {
                offset += card.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
            }
        });

        totalHeight = offset + 100; // last card is full height
        colEl.style.minHeight = `${totalHeight}px`;
        colEl.style.height = `${totalHeight}px`;
    }
}

function renderScore() {
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = score;
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerSeconds++;
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = timerSeconds;
    }, 1000);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

/** Draw one card from the stock to the waste pile. */
function drawFromStock() {
    if (gameState.stock.length === 0) {
        // Recycle waste back to stock (face-down, reversed)
        while (gameState.waste.length > 0) {
            const card = gameState.waste.pop();
            card.faceUp = false;
            gameState.stock.push(card);
        }
    } else {
        const card = gameState.stock.pop();
        card.faceUp = true;
        gameState.waste.push(card);
        score = Math.max(0, score - 2); // XP Solitaire: -2 points per card drawn from stock
    }
    render();
}

// Bind stock click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('stock-pile').addEventListener('click', drawFromStock);
    initGame();
});
