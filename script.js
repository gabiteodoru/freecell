class FreeCellGame {
    constructor() {
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];
        this.columns = Array(8).fill().map(() => []);
        this.freecells = Array(4).fill(null);
        this.foundations = Array(4).fill().map(() => []);
        this.selectedCard = null;
        this.selectedSource = null;
        this.moveCount = 0;
        this.draggedCard = null;
        this.debugLog = [];
        this.clickTimeout = null;
        this.isDoubleClick = false;
        this.lastClickTime = 0;
        this.lastClickedCard = null;
        this.gameHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
        this.isAutoMoving = false;
        
        this.initializeGame();
        this.setupEventListeners();
    }
    
    logEvent(message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const logEntry = `[${timestamp}] ${message}`;
        
        // Add to on-page debug log
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            const logDiv = document.createElement('div');
            logDiv.textContent = logEntry;
            debugLog.appendChild(logDiv);
            
            // Auto-scroll to bottom
            debugLog.scrollTop = debugLog.scrollHeight;
            
            // Keep only last 100 entries
            while (debugLog.children.length > 100) {
                debugLog.removeChild(debugLog.firstChild);
            }
        }
        
        // Also store in memory for download
        this.debugLog.push(logEntry);
        if (this.debugLog.length > 100) {
            this.debugLog = this.debugLog.slice(-100);
        }
    }
    
    toggleDebugPanel() {
        const panel = document.getElementById('debug-panel');
        const button = document.getElementById('download-log');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            button.textContent = 'Hide Debug Log';
            this.logEvent('=== Debug panel opened ===');
        } else {
            panel.style.display = 'none';
            button.textContent = 'Show Debug Log';
        }
    }
    
    clearLog() {
        const debugLog = document.getElementById('debug-log');
        debugLog.innerHTML = '';
        this.debugLog = [];
        this.logEvent('=== Log cleared ===');
    }
    
    saveGameState() {
        const state = {
            columns: this.columns.map(col => [...col]), // Deep copy
            freecells: [...this.freecells],
            foundations: this.foundations.map(foundation => [...foundation]),
            moveCount: this.moveCount
        };
        
        // If we're not at the end of history, truncate future states
        if (this.historyIndex < this.gameHistory.length - 1) {
            this.gameHistory = this.gameHistory.slice(0, this.historyIndex + 1);
        }
        
        this.gameHistory.push(state);
        this.historyIndex = this.gameHistory.length - 1;
        
        // Limit history size
        if (this.gameHistory.length > this.maxHistorySize) {
            this.gameHistory.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }
    
    restoreGameState(state) {
        this.columns = state.columns.map(col => [...col]); // Deep copy
        this.freecells = [...state.freecells];
        this.foundations = state.foundations.map(foundation => [...foundation]);
        this.moveCount = state.moveCount;
        this.clearSelection();
        this.render();
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.logEvent(`UNDO to move ${this.gameHistory[this.historyIndex].moveCount}`);
            this.restoreGameState(this.gameHistory[this.historyIndex]);
        }
    }
    
    redo() {
        if (this.historyIndex < this.gameHistory.length - 1) {
            this.historyIndex++;
            this.logEvent(`REDO to move ${this.gameHistory[this.historyIndex].moveCount}`);
            this.restoreGameState(this.gameHistory[this.historyIndex]);
        }
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.gameHistory.length - 1;
        }
    }
    
    downloadLog() {
        // Fallback download for when file access isn't available
        const logContent = this.debugLog.join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'freecell-debug.log';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({
                    suit: suit,
                    rank: rank,
                    color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                    value: this.ranks.indexOf(rank) + 1
                });
            }
        }
        this.shuffleDeck();
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    dealCards() {
        this.columns = Array(8).fill().map(() => []);
        let cardIndex = 0;
        
        // Deal cards to columns (first 4 columns get 7 cards, last 4 get 6)
        for (let col = 0; col < 8; col++) {
            const cardsInColumn = col < 4 ? 7 : 6;
            for (let row = 0; row < cardsInColumn; row++) {
                this.columns[col].push(this.deck[cardIndex++]);
            }
        }
    }
    
    initializeGame() {
        this.createDeck();
        this.dealCards();
        this.freecells = Array(4).fill(null);
        this.foundations = Array(4).fill().map(() => []);
        this.moveCount = 0;
        this.selectedCard = null;
        this.selectedSource = null;
        
        // Reset history
        this.gameHistory = [];
        this.historyIndex = -1;
        
        this.render();
        this.updateStatus("Game started! Move all cards to foundations.");
        
        // Save initial state
        this.saveGameState();
        
        // Trigger auto-move at start if enabled
        this.triggerContinuousAutoMove();
    }
    
    setupEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => {
            this.initializeGame();
        });
        
        document.getElementById('auto-move').addEventListener('click', () => {
            this.autoMove();
        });
        
        document.getElementById('download-log').addEventListener('click', () => {
            this.toggleDebugPanel();
        });
        
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });
        
        document.getElementById('undo').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redo').addEventListener('click', () => {
            this.redo();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
        
        // Mobile touch optimizations
        this.setupMobileInteractions();
        
        // Add debugging for all clicks
        document.addEventListener('click', (e) => {
            // Debug: log what element was actually clicked
            this.logEvent(`CLICK on element: ${e.target.tagName}.${e.target.className} (${e.target.id || 'no-id'})`);
        }, true); // Use capture phase to catch everything
        
        // Add click listeners for game areas
        document.addEventListener('click', (e) => {
            // Check if clicked element is a card or inside a card
            let cardElement = null;
            if (e.target.classList.contains('card')) {
                cardElement = e.target;
            } else if (e.target.closest('.card')) {
                cardElement = e.target.closest('.card');
            }
            
            if (cardElement) {
                const cardInfo = `${cardElement.dataset.rank}${cardElement.dataset.suit}`;
                const now = Date.now();
                const timeDiff = now - this.lastClickTime;
                
                this.logEvent(`CLICK on card: ${cardInfo} (time since last: ${timeDiff}ms)`);
                
                // Custom double-click detection
                if (this.lastClickedCard === cardElement && timeDiff < 600 && timeDiff > 50) {
                    // This is a double-click!
                    this.logEvent(`CUSTOM DOUBLE-CLICK detected: ${cardInfo}`);
                    
                    // Cancel any pending single click
                    if (this.clickTimeout) {
                        clearTimeout(this.clickTimeout);
                        this.clickTimeout = null;
                    }
                    
                    this.handleCardDoubleClick(cardElement);
                    this.lastClickTime = 0; // Reset to prevent triple-click
                    this.lastClickedCard = null;
                    return;
                }
                
                // Store this click for potential double-click detection
                this.lastClickTime = now;
                this.lastClickedCard = cardElement;
                
                // Delay single click processing to see if a double-click is coming
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                }
                
                this.clickTimeout = setTimeout(() => {
                    this.logEvent(`Processing delayed single click: ${cardInfo}`);
                    this.handleCardClick(cardElement);
                }, 300); // 300ms delay
                
            } else if (e.target.classList.contains('freecell')) {
                this.handleFreecellClick(e.target);
            } else if (e.target.classList.contains('foundation')) {
                this.handleFoundationClick(e.target);
            } else if (e.target.classList.contains('column')) {
                this.handleColumnClick(e.target);
            } else {
                this.clearSelection();
            }
        });
        
        // Drag and drop events
        document.addEventListener('dragstart', (e) => {
            // Check if dragging a card or something inside a card
            let cardElement = null;
            if (e.target.classList.contains('card')) {
                cardElement = e.target;
            } else if (e.target.closest('.card')) {
                cardElement = e.target.closest('.card');
                // For child elements, we need to set the card as the drag target
                e.target = cardElement;
            }
            
            if (cardElement) {
                this.handleDragStart(e);
            }
        });
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
        });
        
        // Double-click events
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('card')) {
                const cardInfo = `${e.target.dataset.rank}${e.target.dataset.suit}`;
                this.logEvent(`DOUBLE CLICK on card: ${cardInfo}`);
                
                // Cancel any pending single click
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                    this.clickTimeout = null;
                }
                
                this.isDoubleClick = true;
                e.preventDefault(); // Prevent any default double-click behavior
                this.handleCardDoubleClick(e.target);
            }
        });
    }
    
    handleCardClick(cardElement) {
        const cardData = this.getCardData(cardElement);
        const source = this.getCardSource(cardElement);
        
        if (this.selectedCard && this.selectedCard.element === cardElement) {
            this.clearSelection();
            return;
        }
        
        if (this.selectedCard) {
            // Try to move selected card/sequence to this card's location
            if (this.canMoveToCard(this.selectedCard.data, cardData, source)) {
                this.moveCardSequence(this.selectedSource, source);
                this.clearSelection();
            } else {
                this.selectCard(cardElement, cardData, source);
            }
        } else {
            this.selectCard(cardElement, cardData, source);
        }
    }
    
    handleFreecellClick(freecellElement) {
        const index = parseInt(freecellElement.id.split('-')[1]);
        
        if (this.selectedCard) {
            if (this.freecells[index] === null) {
                this.moveToFreecell(index);
                this.clearSelection();
            }
        } else {
            // Select card in freecell if there is one
            if (this.freecells[index] !== null) {
                const cardEl = freecellElement.querySelector('.card');
                if (cardEl) {
                    const cardData = this.getCardData(cardEl);
                    const source = { type: 'freecell', index: index };
                    this.selectCard(cardEl, cardData, source);
                }
            }
        }
    }
    
    handleFoundationClick(foundationElement) {
        const index = parseInt(foundationElement.id.split('-')[1]);
        
        if (this.selectedCard) {
            if (this.canMoveToFoundation(this.selectedCard.data, index)) {
                this.moveToFoundation(index);
                this.clearSelection();
            }
        }
    }
    
    handleColumnClick(columnElement) {
        const index = parseInt(columnElement.id.split('-')[1]);
        
        if (this.selectedCard) {
            if (this.canMoveToColumn(this.selectedCard.data, index)) {
                this.moveToColumn(index);
                this.clearSelection();
            }
        }
    }
    
    handleCardDoubleClick(cardElement) {
        const cardInfo = `${cardElement.dataset.rank}${cardElement.dataset.suit}`;
        this.logEvent(`handleCardDoubleClick called for: ${cardInfo}`);
        
        // Clear any existing selection to avoid conflicts
        this.clearSelection();
        
        const cardData = this.getCardData(cardElement);
        const source = this.getCardSource(cardElement);
        this.logEvent(`Source: ${JSON.stringify(source)}`);
        
        // For column cards, only allow double-click on the top card
        if (source.type === 'column') {
            const columnCards = this.columns[source.index];
            this.logEvent(`Column has ${columnCards.length} cards, clicked card at index ${source.cardIndex}`);
            if (source.cardIndex !== columnCards.length - 1) {
                this.logEvent(`Not top card, ignoring double-click`);
                return; // Not the top card, ignore double-click
            }
        }
        
        // Handle freecell cards
        if (source.type === 'freecell') {
            this.logEvent(`Trying freecell to foundation move`);
            // Try to move to foundation
            for (let i = 0; i < 4; i++) {
                if (this.canMoveToFoundation(cardData, i)) {
                    this.logEvent(`Moving freecell card to foundation ${i}`);
                    this.selectedCard = { element: cardElement, data: cardData };
                    this.selectedSource = source;
                    this.moveToFoundation(i);
                    this.clearSelection();
                    return;
                }
            }
            this.logEvent(`No foundation move available for freecell card`);
            return; // If can't move to foundation, do nothing
        }
        
        // Only allow double-click auto-move for top cards in columns
        if (source.type !== 'column' || source.cardIndex !== this.columns[source.index].length - 1) {
            return;
        }
        
        // Try to move to foundation first
        this.logEvent(`Trying column card to foundation move`);
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(cardData, i)) {
                this.logEvent(`Moving column card to foundation ${i}`);
                this.selectedCard = { element: cardElement, data: cardData };
                this.selectedSource = source;
                this.moveToFoundation(i);
                this.clearSelection();
                return;
            }
        }
        
        // If foundation move failed, try to move to an available freecell
        this.logEvent(`Foundation move failed, trying freecell move`);
        for (let i = 0; i < 4; i++) {
            if (this.freecells[i] === null) {
                this.logEvent(`Moving column card to freecell ${i}`);
                this.selectedCard = { element: cardElement, data: cardData };
                this.selectedSource = source;
                this.moveToFreecell(i);
                this.clearSelection();
                return;
            }
        }
        
        this.logEvent(`No moves available for this card`);
        // If no moves available, do nothing (could add visual feedback here)
    }
    
    selectCard(element, data, source) {
        this.clearSelection();
        this.selectedCard = { element, data };
        this.selectedSource = source;
        element.classList.add('selected');
    }
    
    clearSelection() {
        if (this.selectedCard) {
            this.selectedCard.element.classList.remove('selected');
        }
        this.selectedCard = null;
        this.selectedSource = null;
        this.clearHighlights();
    }
    
    clearHighlights() {
        document.querySelectorAll('.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
    }
    
    getCardData(element) {
        const suit = element.dataset.suit;
        const rank = element.dataset.rank;
        return {
            suit,
            rank,
            color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
            value: this.ranks.indexOf(rank) + 1
        };
    }
    
    getCardSource(element) {
        const parent = element.parentElement;
        if (parent.classList.contains('freecell')) {
            return { type: 'freecell', index: parseInt(parent.id.split('-')[1]) };
        } else if (parent.classList.contains('column')) {
            const columnIndex = parseInt(parent.id.split('-')[1]);
            const cardIndex = this.getCardIndexInColumn(element, columnIndex);
            return { type: 'column', index: columnIndex, cardIndex: cardIndex };
        }
        return null;
    }
    
    canMoveToCard(sourceCard, targetCard, targetSource) {
        if (targetSource.type === 'column') {
            return this.canMoveToColumn(sourceCard, targetSource.index);
        }
        return false;
    }
    
    canMoveToColumn(card, columnIndex) {
        const column = this.columns[columnIndex];
        if (column.length === 0) return true;
        
        const topCard = column[column.length - 1];
        return card.color !== topCard.color && card.value === topCard.value - 1;
    }
    
    getCardIndexInColumn(cardElement, columnIndex) {
        const column = document.getElementById(`column-${columnIndex}`);
        const cards = Array.from(column.querySelectorAll('.card'));
        return cards.indexOf(cardElement);
    }
    
    getMovableSequence(columnIndex, startCardIndex) {
        const column = this.columns[columnIndex];
        const sequence = [];
        
        for (let i = startCardIndex; i < column.length; i++) {
            const card = column[i];
            
            if (sequence.length === 0) {
                sequence.push(card);
            } else {
                const prevCard = sequence[sequence.length - 1];
                if (card.color !== prevCard.color && card.value === prevCard.value - 1) {
                    sequence.push(card);
                } else {
                    break;
                }
            }
        }
        
        return sequence;
    }
    
    canMoveSequence(sequence, targetColumnIndex) {
        if (sequence.length === 0) return false;
        
        // Calculate max movable cards based on free cells and empty columns
        const emptyCells = this.freecells.filter(cell => cell === null).length;
        const emptyColumns = this.columns.filter(col => col.length === 0).length;
        const targetIsEmpty = this.columns[targetColumnIndex].length === 0;
        
        // If target is empty, we have one less empty column to use
        const usableEmptyColumns = targetIsEmpty ? emptyColumns - 1 : emptyColumns;
        const maxMovable = (emptyCells + 1) * Math.pow(2, usableEmptyColumns);
        
        if (sequence.length > maxMovable) return false;
        
        // Check if the sequence can be placed on the target
        const firstCard = sequence[0];
        return this.canMoveToColumn(firstCard, targetColumnIndex);
    }
    
    canMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        const suitIndex = this.suits.indexOf(card.suit);
        
        if (foundationIndex !== suitIndex) return false;
        
        if (foundation.length === 0) {
            return card.rank === 'A';
        }
        
        const topCard = foundation[foundation.length - 1];
        return card.value === topCard.value + 1;
    }
    
    moveCard(source, target) {
        let card;
        
        // Remove card from source
        if (source.type === 'freecell') {
            card = this.freecells[source.index];
            this.freecells[source.index] = null;
        } else if (source.type === 'column') {
            card = this.columns[source.index].pop();
        }
        
        // Add card to target
        if (target.type === 'column') {
            this.columns[target.index].push(card);
        }
        
        this.moveCount++;
        this.render();
        this.checkWin();
        
        // Save state after successful move
        this.saveGameState();
        
        // Trigger continuous auto-move if enabled
        this.triggerContinuousAutoMove();
    }
    
    moveCardSequence(source, target) {
        if (source.type === 'freecell') {
            // Freecells only hold single cards
            this.moveCard(source, target);
            return;
        }
        
        if (source.type === 'column' && target.type === 'column') {
            const sequence = this.getMovableSequence(source.index, source.cardIndex);
            
            if (this.canMoveSequence(sequence, target.index)) {
                // Remove cards from source column
                this.columns[source.index].splice(source.cardIndex, sequence.length);
                
                // Add cards to target column
                this.columns[target.index].push(...sequence);
                
                this.moveCount++;
                this.render();
                this.checkWin();
                
                // Save state after successful move
                this.saveGameState();
                
                // Trigger continuous auto-move if enabled
                this.triggerContinuousAutoMove();
            }
        }
    }
    
    moveToFreecell(index) {
        let card;
        
        if (this.selectedSource.type === 'column') {
            // Only move the specific card that was selected, not the top card
            const cardIndex = this.selectedSource.cardIndex;
            if (cardIndex === this.columns[this.selectedSource.index].length - 1) {
                // If it's the top card, just pop it
                card = this.columns[this.selectedSource.index].pop();
            } else {
                // If it's not the top card, we can't move it to freecell
                return;
            }
        }
        
        this.freecells[index] = card;
        this.moveCount++;
        this.render();
        
        // Save state after successful move
        this.saveGameState();
        
        // Trigger continuous auto-move if enabled
        this.triggerContinuousAutoMove();
    }
    
    moveToFoundation(index) {
        let card;
        
        if (this.selectedSource.type === 'freecell') {
            card = this.freecells[this.selectedSource.index];
            this.freecells[this.selectedSource.index] = null;
        } else if (this.selectedSource.type === 'column') {
            // Only move the top card to foundation
            const cardIndex = this.selectedSource.cardIndex;
            if (cardIndex === this.columns[this.selectedSource.index].length - 1) {
                card = this.columns[this.selectedSource.index].pop();
            } else {
                // Can't move buried cards to foundation
                return;
            }
        }
        
        this.foundations[index].push(card);
        this.moveCount++;
        this.render();
        this.checkWin();
        
        // Save state after successful move
        this.saveGameState();
        
        // Trigger continuous auto-move if enabled
        this.triggerContinuousAutoMove();
    }
    
    moveToColumn(index) {
        if (this.selectedSource.type === 'freecell') {
            const card = this.freecells[this.selectedSource.index];
            this.freecells[this.selectedSource.index] = null;
            this.columns[index].push(card);
        } else if (this.selectedSource.type === 'column') {
            const sequence = this.getMovableSequence(this.selectedSource.index, this.selectedSource.cardIndex);
            
            if (this.canMoveSequence(sequence, index)) {
                // Remove cards from source column
                this.columns[this.selectedSource.index].splice(this.selectedSource.cardIndex, sequence.length);
                
                // Add cards to target column
                this.columns[index].push(...sequence);
            }
        }
        
        this.moveCount++;
        this.render();
        
        // Save state after successful move
        this.saveGameState();
        
        // Trigger continuous auto-move if enabled
        this.triggerContinuousAutoMove();
    }
    
    isSafeToAutoMove(card) {
        // Aces and 2s are always safe to move
        // Aces: Nothing can build on them
        // 2s: Only Aces can build on them, and Aces go directly to foundations
        if (card.rank === 'A' || card.rank === '2') {
            return true;
        }
        
        // For other cards, check if all cards that could build on it are already in foundations
        const lowerRankIndex = this.ranks.indexOf(card.rank) - 1;
        if (lowerRankIndex < 0) return true; // Should not happen, but safe
        
        const lowerRank = this.ranks[lowerRankIndex];
        const oppositeColors = card.color === 'red' ? ['clubs', 'spades'] : ['hearts', 'diamonds'];
        
        // Check if both cards of opposite color and one rank lower are in foundations
        for (const suit of oppositeColors) {
            const foundationIndex = this.suits.indexOf(suit);
            const foundation = this.foundations[foundationIndex];
            
            // Check if this suit's foundation has the required lower card
            const hasLowerCard = foundation.some(foundationCard => foundationCard.rank === lowerRank);
            
            if (!hasLowerCard) {
                // This lower card is not in foundations, so it might still be in play
                // Check if it's actually still somewhere in the game
                if (this.isCardInPlay(lowerRank, suit)) {
                    return false; // Not safe to move - this building sequence is still possible
                }
            }
        }
        
        return true; // Safe to move
    }
    
    isCardInPlay(rank, suit) {
        // Check columns
        for (const column of this.columns) {
            if (column.some(card => card.rank === rank && card.suit === suit)) {
                return true;
            }
        }
        
        // Check freecells
        for (const card of this.freecells) {
            if (card && card.rank === rank && card.suit === suit) {
                return true;
            }
        }
        
        return false;
    }
    
    autoMove() {
        if (this.isAutoMoving) {
            return; // Prevent multiple auto-move chains running simultaneously
        }
        
        this.isAutoMoving = true;
        let moved = false;
        
        // Try to move cards to foundations (with safety check)
        for (let col = 0; col < 8; col++) {
            if (this.columns[col].length > 0) {
                const card = this.columns[col][this.columns[col].length - 1];
                const foundationIndex = this.suits.indexOf(card.suit);
                
                if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                    this.logEvent(`AUTO-MOVE: ${card.rank}${card.suit} to foundation (safe)`);
                    this.columns[col].pop();
                    this.foundations[foundationIndex].push(card);
                    this.moveCount++;
                    moved = true;
                    break;
                } else if (this.canMoveToFoundation(card, foundationIndex)) {
                    this.logEvent(`AUTO-MOVE: Skipping ${card.rank}${card.suit} - not safe (lower opposite color cards still in play)`);
                }
            }
        }
        
        // Try to move cards from freecells to foundations (with safety check)
        if (!moved) {
            for (let i = 0; i < 4; i++) {
                if (this.freecells[i]) {
                    const card = this.freecells[i];
                    const foundationIndex = this.suits.indexOf(card.suit);
                    
                    if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                        this.logEvent(`AUTO-MOVE: ${card.rank}${card.suit} from freecell to foundation (safe)`);
                        this.freecells[i] = null;
                        this.foundations[foundationIndex].push(card);
                        this.moveCount++;
                        moved = true;
                        break;
                    } else if (this.canMoveToFoundation(card, foundationIndex)) {
                        this.logEvent(`AUTO-MOVE: Skipping ${card.rank}${card.suit} from freecell - not safe`);
                    }
                }
            }
        }
        
        if (moved) {
            this.render();
            this.checkWin();
            // Save state after auto-move
            this.saveGameState();
            // Continue auto-moving
            setTimeout(() => this.autoMove(), 300);
        } else {
            this.logEvent(`AUTO-MOVE: No more safe moves available`);
            this.isAutoMoving = false;
        }
    }
    
    triggerContinuousAutoMove() {
        const checkbox = document.getElementById('continuous-auto-move');
        this.logEvent(`CONTINUOUS: Checking auto-move - enabled: ${checkbox?.checked}`);
        if (checkbox && checkbox.checked) {
            this.logEvent(`CONTINUOUS: Triggering auto-move`);
            // Use a separate method that doesn't conflict with manual auto-move
            setTimeout(() => {
                this.continuousAutoMove();
            }, 150);
        }
    }
    
    continuousAutoMove() {
        this.logEvent(`CONTINUOUS: Starting continuous auto-move`);
        let moved = false;
        
        // Try to move cards to foundations (with safety check)
        for (let col = 0; col < 8; col++) {
            if (this.columns[col].length > 0) {
                const card = this.columns[col][this.columns[col].length - 1];
                const foundationIndex = this.suits.indexOf(card.suit);
                
                if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                    this.logEvent(`CONTINUOUS: Moving ${card.rank}${card.suit} to foundation`);
                    this.columns[col].pop();
                    this.foundations[foundationIndex].push(card);
                    this.moveCount++;
                    moved = true;
                    break;
                }
            }
        }
        
        // Try to move cards from freecells to foundations (with safety check)
        if (!moved) {
            for (let i = 0; i < 4; i++) {
                if (this.freecells[i]) {
                    const card = this.freecells[i];
                    const foundationIndex = this.suits.indexOf(card.suit);
                    
                    if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                        this.logEvent(`CONTINUOUS: Moving ${card.rank}${card.suit} from freecell to foundation`);
                        this.freecells[i] = null;
                        this.foundations[foundationIndex].push(card);
                        this.moveCount++;
                        moved = true;
                        break;
                    }
                }
            }
        }
        
        if (moved) {
            this.render();
            this.checkWin();
            this.saveGameState();
            // Continue if more moves are available
            setTimeout(() => this.continuousAutoMove(), 200);
        } else {
            this.logEvent(`CONTINUOUS: No more safe moves available`);
        }
    }
    
    setupMobileInteractions() {
        // Mobile touch state
        let lastTap = 0;
        let isDragging = false;
        let startY = 0;
        
        // Touch start
        document.addEventListener('touchstart', (e) => {
            if (this.isGameElement(e.target)) {
                startY = e.touches[0].clientY;
                isDragging = false;
            }
        }, { passive: true });
        
        // Touch move - prevent scrolling during drags
        document.addEventListener('touchmove', (e) => {
            if (this.isGameElement(e.target)) {
                const currentY = e.touches[0].clientY;
                const deltaY = Math.abs(currentY - startY);
                
                // Only prevent scrolling if user is actually dragging (moved more than 10px)
                if (deltaY > 10) {
                    isDragging = true;
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        // Touch end - handle taps and moves
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (!isDragging) {
                // Check what was tapped
                let cardElement = e.target;
                if (!cardElement.classList.contains('card')) {
                    cardElement = e.target.closest('.card');
                }
                
                if (cardElement) {
                    // Quick double tap for auto-move
                    if (tapLength < 400 && tapLength > 0) {
                        e.preventDefault();
                        this.logEvent(`MOBILE: Double tap auto-move`);
                        this.handleCardDoubleClick(cardElement);
                    } else {
                        // Single tap for selection/move
                        this.logEvent(`MOBILE: Single tap on card`);
                        this.handleCardClick(cardElement);
                    }
                } else if (e.target.classList.contains('freecell')) {
                    this.logEvent(`MOBILE: Tap on freecell`);
                    this.handleFreecellClick(e.target);
                } else if (e.target.classList.contains('foundation')) {
                    this.logEvent(`MOBILE: Tap on foundation`);
                    this.handleFoundationClick(e.target);
                } else if (e.target.classList.contains('column')) {
                    this.logEvent(`MOBILE: Tap on column`);
                    this.handleColumnClick(e.target);
                } else {
                    // Tap elsewhere - clear selection
                    this.clearSelection();
                }
            }
            
            lastTap = currentTime;
            isDragging = false; // Reset drag state
        });
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Add haptic feedback for successful moves (if supported)
        this.addHapticFeedback();
    }
    
    isGameElement(element) {
        // Check if the touched element is part of the game (cards, foundations, freecells, columns)
        return element.closest('.card') || 
               element.closest('.foundation') || 
               element.closest('.freecell') || 
               element.closest('.column') || 
               element.closest('.game-board');
    }
    
    addHapticFeedback() {
        // Store original move functions to add haptic feedback
        const originalMoveToFoundation = this.moveToFoundation.bind(this);
        const originalMoveToFreecell = this.moveToFreecell.bind(this);
        
        this.moveToFoundation = function(index) {
            originalMoveToFoundation(index);
            this.vibrate(50); // Short vibration for foundation moves
        };
        
        this.moveToFreecell = function(index) {
            originalMoveToFreecell(index);
            this.vibrate(30); // Shorter vibration for freecell moves
        };
    }
    
    vibrate(duration) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
    
    checkWin() {
        const totalFoundationCards = this.foundations.reduce((sum, foundation) => sum + foundation.length, 0);
        if (totalFoundationCards === 52) {
            this.updateStatus("Congratulations! You won!", true);
        }
    }
    
    createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.color}`;
        cardEl.draggable = true;
        cardEl.dataset.suit = card.suit;
        cardEl.dataset.rank = card.rank;
        
        const suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        
        cardEl.innerHTML = `
            <div class="card-rank">${card.rank}${suitSymbols[card.suit]}</div>
            <div class="card-center">${suitSymbols[card.suit]}</div>
            <div class="card-rank" style="transform: rotate(180deg);">${card.rank}${suitSymbols[card.suit]}</div>
        `;
        
        return cardEl;
    }
    
    render() {
        // Render columns
        for (let i = 0; i < 8; i++) {
            const columnEl = document.getElementById(`column-${i}`);
            columnEl.innerHTML = '';
            
            this.columns[i].forEach((card, index) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.top = `${index * 25}px`;
                cardEl.style.zIndex = `${index + 1}`; // Higher cards appear on top
                columnEl.appendChild(cardEl);
            });
        }
        
        // Render freecells
        for (let i = 0; i < 4; i++) {
            const freecellEl = document.getElementById(`freecell-${i}`);
            freecellEl.innerHTML = '';
            
            if (this.freecells[i]) {
                const cardEl = this.createCardElement(this.freecells[i]);
                freecellEl.appendChild(cardEl);
            }
        }
        
        // Render foundations
        for (let i = 0; i < 4; i++) {
            const foundationEl = document.getElementById(`foundation-${i}`);
            foundationEl.innerHTML = '';
            
            const foundation = this.foundations[i];
            if (foundation.length > 0) {
                const topCard = foundation[foundation.length - 1];
                const cardEl = this.createCardElement(topCard);
                foundationEl.appendChild(cardEl);
            }
        }
        
        // Update move count
        document.getElementById('move-count').textContent = this.moveCount;
    }
    
    updateStatus(message, isWin = false) {
        const statusEl = document.getElementById('game-status');
        statusEl.textContent = message;
        statusEl.className = isWin ? 'win-message' : '';
    }
    
    handleDragStart(e) {
        this.draggedCard = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }
    
    handleDrop(e) {
        if (!this.draggedCard) return;
        
        this.draggedCard.classList.remove('dragging');
        
        const dropTarget = e.target.closest('.freecell, .foundation, .column');
        if (!dropTarget) return;
        
        const cardData = this.getCardData(this.draggedCard);
        const source = this.getCardSource(this.draggedCard);
        
        if (dropTarget.classList.contains('freecell')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            if (this.freecells[index] === null) {
                // Only allow single cards in freecells, and only if it's the top card of the column
                if (source.type === 'column' && source.cardIndex === this.columns[source.index].length - 1) {
                    this.selectedCard = { element: this.draggedCard, data: cardData };
                    this.selectedSource = source;
                    this.moveToFreecell(index);
                    this.clearSelection();
                } else if (source.type === 'freecell') {
                    // Moving from one freecell to another
                    const card = this.freecells[source.index];
                    this.freecells[source.index] = null;
                    this.freecells[index] = card;
                    this.moveCount++;
                    this.render();
                }
            }
        } else if (dropTarget.classList.contains('foundation')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            if (this.canMoveToFoundation(cardData, index)) {
                // Only allow single cards in foundations, and only if it's the top card
                if (source.type === 'column' && source.cardIndex === this.columns[source.index].length - 1) {
                    this.selectedCard = { element: this.draggedCard, data: cardData };
                    this.selectedSource = source;
                    this.moveToFoundation(index);
                    this.clearSelection();
                } else if (source.type === 'freecell') {
                    this.selectedCard = { element: this.draggedCard, data: cardData };
                    this.selectedSource = source;
                    this.moveToFoundation(index);
                    this.clearSelection();
                }
            }
        } else if (dropTarget.classList.contains('column')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            
            if (source.type === 'column') {
                const sequence = this.getMovableSequence(source.index, source.cardIndex);
                if (this.canMoveSequence(sequence, index)) {
                    this.selectedCard = { element: this.draggedCard, data: cardData };
                    this.selectedSource = source;
                    this.moveToColumn(index);
                    this.clearSelection();
                }
            } else if (this.canMoveToColumn(cardData, index)) {
                this.selectedCard = { element: this.draggedCard, data: cardData };
                this.selectedSource = source;
                this.moveToColumn(index);
                this.clearSelection();
            }
        }
        
        this.draggedCard = null;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FreeCellGame();
});