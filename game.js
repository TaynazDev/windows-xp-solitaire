/**
 * game.js – Windows XP Solitaire Core Logic
 * Implements: Deck, shuffle, full Klondike rules, click-to-move, touch support.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS = ['♥', '♦', '♣', '♠'];
const SUIT_NAMES = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * @typedef {{ suit: string, suitName: string, rank: string, value: number, faceUp: boolean }} Card
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

/**
 * selectedSource tracks which card(s) are currently selected.
 * null                              – nothing selected
 * { type: 'waste' }                 – top waste card selected
 * { type: 'tableau', col, cardIdx } – tableau card at col/cardIdx (+ all below it)
 * { type: 'foundation', idx }       – top foundation card selected
 */
let selectedSource = null;

// ─── Deck Utilities ───────────────────────────────────────────────────────────

function createDeck() {
    const deck = [];
    for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
            deck.push({
                suit: SUITS[s],
                suitName: SUIT_NAMES[s],
                rank: RANKS[r],
                value: r + 1,   // Ace=1 … King=13
                faceUp: false,
            });
        }
    }
    return deck;
}

/** Fisher-Yates shuffle in-place. */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function isRed(suit) {
    return suit === '♥' || suit === '♦';
}

// ─── Card Dimensions (responsive) ────────────────────────────────────────────

/** Read the current rendered height of the stock pile slot (= card height). */
function getCardHeight() {
    const stockEl = document.getElementById('stock-pile');
    return stockEl ? stockEl.offsetHeight : 100;
}

// ─── Game Initialization ──────────────────────────────────────────────────────

function initGame() {
    gameState.stock = [];
    gameState.waste = [];
    gameState.foundations = [[], [], [], []];
    gameState.tableau = [[], [], [], [], [], [], []];
    score = 0;
    timerSeconds = 0;
    selectedSource = null;

    if (timerInterval) clearInterval(timerInterval);

    gameState.deck = shuffle(createDeck());

    // Deal to tableau: column i gets i+1 cards; last card face-up
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = gameState.deck[cardIndex++];
            card.faceUp = (row === col);
            gameState.tableau[col].push(card);
        }
    }

    // Remaining cards → stock (face-down)
    for (; cardIndex < gameState.deck.length; cardIndex++) {
        const card = gameState.deck[cardIndex];
        card.faceUp = false;
        gameState.stock.push(card);
    }

    render();
    startTimer();
}

// ─── Move Validation ─────────────────────────────────────────────────────────

function canPlaceOnTableauColumn(card, targetCol) {
    const column = gameState.tableau[targetCol];
    if (column.length === 0) {
        return card.value === 13; // Only Kings on empty columns
    }
    const topCard = column[column.length - 1];
    if (!topCard.faceUp) return false;
    return card.value === topCard.value - 1 && isRed(card.suit) !== isRed(topCard.suit);
}

function canPlaceOnFoundation(card, foundationIdx) {
    const pile = gameState.foundations[foundationIdx];
    if (pile.length === 0) {
        return card.value === 1; // Only Aces start a foundation
    }
    const topCard = pile[pile.length - 1];
    return card.suit === topCard.suit && card.value === topCard.value + 1;
}

// ─── Move Execution ───────────────────────────────────────────────────────────

/**
 * Try to execute a move from source to dest.
 * Returns true if the move succeeded.
 */
function executeMove(source, dest) {
    if (dest.type === 'foundation') {
        let card;
        if (source.type === 'waste') {
            card = gameState.waste[gameState.waste.length - 1];
            if (!card || !canPlaceOnFoundation(card, dest.idx)) return false;
            gameState.waste.pop();
            gameState.foundations[dest.idx].push(card);
            score += 10;
        } else if (source.type === 'tableau') {
            const col = gameState.tableau[source.col];
            if (source.cardIdx !== col.length - 1) return false; // Only the top card
            card = col[source.cardIdx];
            if (!card || !canPlaceOnFoundation(card, dest.idx)) return false;
            col.pop();
            gameState.foundations[dest.idx].push(card);
            score += 10;
            // Flip new top of source column if face-down
            if (col.length > 0 && !col[col.length - 1].faceUp) {
                col[col.length - 1].faceUp = true;
                score += 5;
            }
        } else {
            return false; // Foundation-to-foundation not allowed
        }
        score = Math.max(0, score);
        return true;
    }

    if (dest.type === 'tableau') {
        if (source.type === 'waste') {
            const card = gameState.waste[gameState.waste.length - 1];
            if (!card || !canPlaceOnTableauColumn(card, dest.col)) return false;
            gameState.waste.pop();
            gameState.tableau[dest.col].push(card);
            score += 5;
        } else if (source.type === 'tableau') {
            const srcCol = gameState.tableau[source.col];
            const cards = srcCol.slice(source.cardIdx);
            if (cards.length === 0 || !cards[0].faceUp) return false;
            if (!canPlaceOnTableauColumn(cards[0], dest.col)) return false;
            srcCol.splice(source.cardIdx);
            gameState.tableau[dest.col].push(...cards);
            // Flip new top of source column if face-down
            if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
                srcCol[srcCol.length - 1].faceUp = true;
                score += 5;
            }
        } else if (source.type === 'foundation') {
            const pile = gameState.foundations[source.idx];
            const card = pile[pile.length - 1];
            if (!card || !canPlaceOnTableauColumn(card, dest.col)) return false;
            pile.pop();
            gameState.tableau[dest.col].push(card);
            score = Math.max(0, score - 15);
        }
        score = Math.max(0, score);
        return true;
    }

    return false;
}

// ─── Selection Helpers ────────────────────────────────────────────────────────

function clearSelection() {
    selectedSource = null;
}

// ─── Click / Tap Handlers ─────────────────────────────────────────────────────

function handleStockClick() {
    clearSelection();
    if (gameState.stock.length === 0) {
        // Recycle: flip waste back to stock
        while (gameState.waste.length > 0) {
            const card = gameState.waste.pop();
            card.faceUp = false;
            gameState.stock.push(card);
        }
        score = Math.max(0, score - 100);
    } else {
        const card = gameState.stock.pop();
        card.faceUp = true;
        gameState.waste.push(card);
        score = Math.max(0, score - 2);
    }
    render();
}

function handleWasteClick() {
    if (gameState.waste.length === 0) return;
    if (selectedSource && selectedSource.type === 'waste') {
        clearSelection();
    } else {
        selectedSource = { type: 'waste' };
    }
    render();
}

function handleFoundationClick(idx) {
    if (selectedSource) {
        if (selectedSource.type === 'foundation' && selectedSource.idx === idx) {
            clearSelection();
            render();
            return;
        }
        const moved = executeMove(selectedSource, { type: 'foundation', idx });
        clearSelection();
        render();
        if (moved) checkWin();
    } else {
        if (gameState.foundations[idx].length > 0) {
            selectedSource = { type: 'foundation', idx };
            render();
        }
    }
}

/**
 * Handle a click/tap on a tableau column.
 * @param {number} col   - column index (0-6)
 * @param {number|null} cardIdx - card index within the column, or null for empty column area
 */
function handleTableauClick(col, cardIdx) {
    if (cardIdx === null) {
        // Clicked on the empty part of a column
        if (selectedSource) {
            executeMove(selectedSource, { type: 'tableau', col });
            clearSelection();
            render();
            checkWin();
        }
        return;
    }

    const column = gameState.tableau[col];
    const card = column[cardIdx];
    if (!card) return;

    if (!card.faceUp) {
        // Tap a face-down card: only flip if it's the top card
        if (cardIdx === column.length - 1) {
            clearSelection();
            card.faceUp = true;
            score += 5;
            render();
        }
        return;
    }

    if (selectedSource) {
        if (
            selectedSource.type === 'tableau' &&
            selectedSource.col === col &&
            selectedSource.cardIdx === cardIdx
        ) {
            // Tapping the already-selected card deselects it
            clearSelection();
            render();
            return;
        }
        // Try to move the selection onto this column
        const moved = executeMove(selectedSource, { type: 'tableau', col });
        if (moved) {
            clearSelection();
            render();
            checkWin();
        } else {
            // Invalid destination – reselect the tapped card instead
            clearSelection();
            selectedSource = { type: 'tableau', col, cardIdx };
            render();
        }
    } else {
        selectedSource = { type: 'tableau', col, cardIdx };
        render();
    }
}

// ─── Win Detection ────────────────────────────────────────────────────────────

function checkWin() {
    if (gameState.foundations.every(pile => pile.length === 13)) {
        if (timerInterval) clearInterval(timerInterval);
        setTimeout(() => {
            alert(`You win! 🎉\nScore: ${score}\nTime: ${timerSeconds}s`);
        }, 200);
    }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

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
            'position:absolute;bottom:4px;right:6px;color:rgba(255,255,255,0.7);font-size:11px;pointer-events:none;';
        countLabel.textContent = gameState.stock.length;
        stockEl.appendChild(countLabel);
    } else {
        const recycleEl = document.createElement('span');
        recycleEl.textContent = '↺';
        recycleEl.style.cssText = 'font-size:36px;color:rgba(255,255,255,0.4);pointer-events:none;';
        stockEl.appendChild(recycleEl);
    }
}

function renderWaste() {
    const wasteEl = document.getElementById('waste-pile');
    wasteEl.innerHTML = '';

    if (gameState.waste.length > 0) {
        const topCard = gameState.waste[gameState.waste.length - 1];
        const cardEl = createCardElement(topCard);
        if (selectedSource && selectedSource.type === 'waste') {
            cardEl.classList.add('selected');
        }
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
            if (selectedSource && selectedSource.type === 'foundation' && selectedSource.idx === i) {
                cardEl.classList.add('selected');
            }
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
    const cardH = getCardHeight();
    const FACE_DOWN_OFFSET = Math.round(cardH * 0.20);
    const FACE_UP_OFFSET   = Math.round(cardH * 0.28);

    for (let col = 0; col < 7; col++) {
        const colEl = document.getElementById(`tableau-${col}`);
        colEl.innerHTML = '';

        const cards = gameState.tableau[col];

        if (cards.length === 0) {
            colEl.style.minHeight = `${cardH}px`;
            colEl.style.height = '';
            continue;
        }

        let offset = 0;

        cards.forEach((card, index) => {
            const cardEl = createCardElement(card);
            cardEl.classList.add('card-in-tableau');
            cardEl.style.top = `${offset}px`;
            cardEl.dataset.idx = index;

            // Highlight all selected cards in the sequence
            if (
                selectedSource &&
                selectedSource.type === 'tableau' &&
                selectedSource.col === col &&
                index >= selectedSource.cardIdx &&
                card.faceUp
            ) {
                cardEl.classList.add('selected');
            }

            colEl.appendChild(cardEl);

            if (index < cards.length - 1) {
                offset += card.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
            }
        });

        const totalHeight = offset + cardH;
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

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Stock
    document.getElementById('stock-pile').addEventListener('click', handleStockClick);

    // Waste
    document.getElementById('waste-pile').addEventListener('click', handleWasteClick);

    // Foundations – event listeners per pile
    for (let i = 0; i < 4; i++) {
        document.getElementById(`foundation-${i}`).addEventListener('click', () => handleFoundationClick(i));
    }

    // Tableau – event delegation per column
    for (let col = 0; col < 7; col++) {
        const colEl = document.getElementById(`tableau-${col}`);
        colEl.addEventListener('click', (e) => {
            const cardEl = e.target.closest('.card[data-idx]');
            if (cardEl) {
                handleTableauClick(col, parseInt(cardEl.dataset.idx, 10));
            } else {
                handleTableauClick(col, null);
            }
        });
    }

    // Game menu dropdown
    const gameMenuDropdown = document.getElementById('game-menu-dropdown');
    document.getElementById('menu-game').addEventListener('click', (e) => {
        e.stopPropagation();
        gameMenuDropdown.hidden = !gameMenuDropdown.hidden;
    });
    document.getElementById('menu-new-game').addEventListener('click', () => {
        gameMenuDropdown.hidden = true;
        initGame();
    });
    document.addEventListener('click', () => {
        if (gameMenuDropdown && !gameMenuDropdown.hidden) {
            gameMenuDropdown.hidden = true;
        }
    });

    // Help modal
    const helpOverlay = document.getElementById('help-overlay');
    const openModal  = () => { helpOverlay.hidden = false; };
    const closeModal = () => { helpOverlay.hidden = true; };

    document.getElementById('menu-help').addEventListener('click', openModal);
    document.getElementById('help-close-btn').addEventListener('click', closeModal);
    document.getElementById('help-ok-btn').addEventListener('click', closeModal);
    helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) closeModal();
    });

    // Re-render on viewport resize (recalculates card-height-based offsets)
    window.addEventListener('resize', render);

    initGame();
});
