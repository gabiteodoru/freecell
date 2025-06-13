class FreeCellGame {
    constructor() {
        this.engine = new FreeCellEngine();
        this.selectedCard = null;
        this.selectedSource = null;
        this.draggedCard = null;
        this.debugLog = [];
        this.clickTimeout = null;
        this.lastClickTime = 0;
        this.lastClickedCard = null;
        
        this.initializeGame();
        this.setupEventListeners();
    }
    
    logEvent(message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const logEntry = `[${timestamp}] ${message}`;
        
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            const logDiv = document.createElement('div');
            logDiv.textContent = logEntry;
            debugLog.appendChild(logDiv);
            
            debugLog.scrollTop = debugLog.scrollHeight;
            
            while (debugLog.children.length > 100) {
                debugLog.removeChild(debugLog.firstChild);
            }
        }
        
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
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        if (undoBtn) {
            undoBtn.disabled = !this.engine.canUndo();
        }
        if (redoBtn) {
            redoBtn.disabled = !this.engine.canRedo();
        }
    }
    
    initializeGame() {
        const gameState = this.engine.newGame();
        this.clearSelection();
        this.render(gameState);
        this.updateStatus("Game started! Move all cards to foundations.");
        this.updateUndoRedoButtons();
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
            const gameState = this.engine.undo();
            if (gameState) {
                this.clearSelection();
                this.render(gameState);
                this.updateUndoRedoButtons();
            }
        });
        
        document.getElementById('redo').addEventListener('click', () => {
            const gameState = this.engine.redo();
            if (gameState) {
                this.clearSelection();
                this.render(gameState);
                this.updateUndoRedoButtons();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('undo').click();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    document.getElementById('redo').click();
                }
            }
        });
        
        
        document.addEventListener('click', (e) => {
            this.logEvent(`CLICK on element: ${e.target.tagName}.${e.target.className} (${e.target.id || 'no-id'})`);
        }, true);
        
        document.addEventListener('click', (e) => {
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
                
                if (this.lastClickedCard === cardElement && timeDiff < 600 && timeDiff > 50) {
                    this.logEvent(`CUSTOM DOUBLE-CLICK detected: ${cardInfo}`);
                    
                    if (this.clickTimeout) {
                        clearTimeout(this.clickTimeout);
                        this.clickTimeout = null;
                    }
                    
                    this.handleCardDoubleClick(cardElement);
                    this.lastClickTime = 0;
                    this.lastClickedCard = null;
                    return;
                }
                
                this.lastClickTime = now;
                this.lastClickedCard = cardElement;
                
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                }
                
                this.clickTimeout = setTimeout(() => {
                    this.logEvent(`Processing delayed single click: ${cardInfo}`);
                    this.handleCardClick(cardElement);
                }, 300);
                
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
        
        document.addEventListener('dragstart', (e) => {
            let cardElement = null;
            if (e.target.classList.contains('card')) {
                cardElement = e.target;
            } else if (e.target.closest('.card')) {
                cardElement = e.target.closest('.card');
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
        
        document.addEventListener('dragend', (e) => {
            if (this.draggedCard) {
                this.draggedCard.classList.remove('dragging');
                this.draggedCard = null;
            }
        });
        
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('card')) {
                const cardInfo = `${e.target.dataset.rank}${e.target.dataset.suit}`;
                this.logEvent(`DOUBLE CLICK on card: ${cardInfo}`);
                
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                    this.clickTimeout = null;
                }
                
                e.preventDefault();
                this.handleCardDoubleClick(e.target);
            }
        });
    }
    
    handleCardClick(cardElement) {
        const location = this.getCardLocation(cardElement);
        
        if (this.selectedCard && this.selectedCard.element === cardElement) {
            this.clearSelection();
            return;
        }
        
        if (this.selectedCard) {
            const result = this.engine.executeMove(this.selectedSource, location);
            if (result.success) {
                this.logEvent(`MOVE successful: ${JSON.stringify(this.selectedSource)} to ${JSON.stringify(location)}`);
                this.clearSelection();
                this.render(result.gameState);
                this.updateUndoRedoButtons();
                if (result.isWon) {
                    this.updateStatus("Congratulations! You won!", true);
                }
                this.triggerContinuousAutoMove();
            } else {
                this.logEvent(`MOVE failed: ${result.error}`);
                this.selectCard(cardElement, location);
            }
        } else {
            this.selectCard(cardElement, location);
        }
    }
    
    handleFreecellClick(freecellElement) {
        const index = parseInt(freecellElement.id.split('-')[1]);
        const location = { type: 'freecell', index: index };
        
        if (this.selectedCard) {
            const result = this.engine.executeMove(this.selectedSource, location);
            if (result.success) {
                this.clearSelection();
                this.render(result.gameState);
                this.updateUndoRedoButtons();
                this.triggerContinuousAutoMove();
            }
        } else {
            const cardEl = freecellElement.querySelector('.card');
            if (cardEl) {
                this.selectCard(cardEl, location);
            }
        }
    }
    
    handleFoundationClick(foundationElement) {
        const index = parseInt(foundationElement.id.split('-')[1]);
        const location = { type: 'foundation', index: index };
        
        if (this.selectedCard) {
            const result = this.engine.executeMove(this.selectedSource, location);
            if (result.success) {
                this.clearSelection();
                this.render(result.gameState);
                this.updateUndoRedoButtons();
                if (result.isWon) {
                    this.updateStatus("Congratulations! You won!", true);
                }
                this.triggerContinuousAutoMove();
            }
        }
    }
    
    handleColumnClick(columnElement) {
        const index = parseInt(columnElement.id.split('-')[1]);
        const location = { type: 'column', index: index };
        
        if (this.selectedCard) {
            const result = this.engine.executeMove(this.selectedSource, location);
            if (result.success) {
                this.clearSelection();
                this.render(result.gameState);
                this.updateUndoRedoButtons();
                this.triggerContinuousAutoMove();
            }
        }
    }
    
    handleCardDoubleClick(cardElement) {
        const cardInfo = `${cardElement.dataset.rank}${cardElement.dataset.suit}`;
        this.logEvent(`handleCardDoubleClick called for: ${cardInfo}`);
        
        this.clearSelection();
        
        const location = this.getCardLocation(cardElement);
        const result = this.engine.executeDoubleClick(location);
        
        if (result.success) {
            this.logEvent(`Double-click successful: ${cardInfo}`);
            this.render(result.gameState);
            this.updateUndoRedoButtons();
            if (result.isWon) {
                this.updateStatus("Congratulations! You won!", true);
            }
            this.triggerContinuousAutoMove();
        } else {
            this.logEvent(`Double-click failed: ${result.error}`);
        }
    }
    
    selectCard(element, location) {
        this.clearSelection();
        this.selectedCard = { element };
        this.selectedSource = location;
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
    
    getCardLocation(element) {
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
    
    getCardIndexInColumn(cardElement, columnIndex) {
        const column = document.getElementById(`column-${columnIndex}`);
        const cards = Array.from(column.querySelectorAll('.card'));
        return cards.indexOf(cardElement);
    }
    
    autoMove() {
        const result = this.engine.executeAutoMove();
        if (result.success) {
            this.render(result.gameState);
            this.updateUndoRedoButtons();
            if (result.isWon) {
                this.updateStatus("Congratulations! You won!", true);
            }
            setTimeout(() => this.autoMove(), 300);
        } else {
            this.logEvent(`AUTO-MOVE: ${result.error}`);
        }
    }
    
    triggerContinuousAutoMove() {
        const checkbox = document.getElementById('continuous-auto-move');
        if (checkbox && checkbox.checked) {
            setTimeout(() => {
                this.continuousAutoMove();
            }, 150);
        }
    }
    
    continuousAutoMove() {
        const result = this.engine.executeAutoMove();
        if (result.success) {
            this.render(result.gameState);
            this.updateUndoRedoButtons();
            if (result.isWon) {
                this.updateStatus("Congratulations! You won!", true);
            }
            setTimeout(() => this.continuousAutoMove(), 200);
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
    
    // scaleCardFonts() {
        // document.querySelectorAll('.card').forEach(card => {
            // const cardWidth = card.offsetWidth;
            
            // // Scale fonts based on card width
            // const rankSize = cardWidth * 0.15;  // 15% of card width
            // const centerSize = cardWidth * 0.25; // 25% of card width
            
            // card.querySelectorAll('.card-rank').forEach(rank => {
                // rank.style.fontSize = `${rankSize}px`;
            // });
            
            // const center = card.querySelector('.card-center');
            // if (center) {
                // center.style.fontSize = `${centerSize}px`;
            // }
        // });
    // }
    
    render(gameState) {
        for (let i = 0; i < 8; i++) {
            const columnEl = document.getElementById(`column-${i}`);
            columnEl.innerHTML = '';
            
            gameState.columns[i].forEach((card, index) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.top = `${index * 25}px`;
                cardEl.style.zIndex = `${index + 1}`;
                columnEl.appendChild(cardEl);
            });
        }
        
        for (let i = 0; i < 4; i++) {
            const freecellEl = document.getElementById(`freecell-${i}`);
            freecellEl.innerHTML = '';
            
            if (gameState.freecells[i]) {
                const cardEl = this.createCardElement(gameState.freecells[i]);
                freecellEl.appendChild(cardEl);
            }
        }
        
        for (let i = 0; i < 4; i++) {
            const foundationEl = document.getElementById(`foundation-${i}`);
            foundationEl.innerHTML = '';
            
            const foundationRank = gameState.foundations[i];
            if (foundationRank > 0) {
                // Create card object from rank and suit
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                const topCard = {
                    suit: suits[i],
                    rank: ranks[foundationRank - 1],
                    color: (suits[i] === 'hearts' || suits[i] === 'diamonds') ? 'red' : 'black',
                    value: foundationRank
                };
                const cardEl = this.createCardElement(topCard);
                foundationEl.appendChild(cardEl);
            }
        }
        
        document.getElementById('move-count').textContent = gameState.moveCount;
        
        // Scale fonts after all cards are rendered and have their final dimensions
        setTimeout(() => this.scaleCardFonts(), 0);
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
        
        const dropTarget = e.target.closest('.freecell, .foundation, .column');
        if (!dropTarget) return;
        
        const sourceLocation = this.getCardLocation(this.draggedCard);
        let targetLocation = null;
        
        if (dropTarget.classList.contains('freecell')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            targetLocation = { type: 'freecell', index: index };
        } else if (dropTarget.classList.contains('foundation')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            targetLocation = { type: 'foundation', index: index };
        } else if (dropTarget.classList.contains('column')) {
            const index = parseInt(dropTarget.id.split('-')[1]);
            targetLocation = { type: 'column', index: index };
        }
        
        if (targetLocation) {
            const result = this.engine.executeMove(sourceLocation, targetLocation);
            if (result.success) {
                this.render(result.gameState);
                this.updateUndoRedoButtons();
                if (result.isWon) {
                    this.updateStatus("Congratulations! You won!", true);
                }
                this.triggerContinuousAutoMove();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FreeCellGame();
});