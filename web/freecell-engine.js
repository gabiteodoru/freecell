class FreeCellEngine {
    constructor() {
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.reset();
    }

    reset() {
        this.columns = Array(8).fill().map(() => []);
        this.freecells = Array(4).fill(null);
        this.foundations = Array(4).fill(0); // 0 = empty, 1-13 = rank value
        this.moveCount = 0;
        this.gameHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
    }

    createDeck() {
        const deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                deck.push({
                    suit: suit,
                    rank: rank,
                    color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                    value: this.ranks.indexOf(rank) + 1
                });
            }
        }
        return deck;
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    dealCards(deck = null) {
        if (!deck) {
            deck = this.shuffleDeck(this.createDeck());
        }
        
        this.columns = Array(8).fill().map(() => []);
        let cardIndex = 0;
        
        for (let col = 0; col < 8; col++) {
            const cardsInColumn = col < 4 ? 7 : 6;
            for (let row = 0; row < cardsInColumn; row++) {
                if (cardIndex < deck.length) {
                    this.columns[col].push(deck[cardIndex++]);
                }
            }
        }
    }

    newGame(predeterminedDeck = null) {
        this.reset();
        this.dealCards(predeterminedDeck);
        this.saveGameState();
        return this.getGameState();
    }

    setGameState(columns, freecells, foundations, moveCount = 0) {
        this.columns = columns.map(col => col.map(card => ({ ...card })));
        this.freecells = [...freecells];
        this.foundations = [...foundations]; // Now just array of rank values
        this.moveCount = moveCount;
        this.saveGameState();
    }

    getGameState() {
        return {
            columns: this.columns.map(col => col.map(card => ({ ...card }))),
            freecells: [...this.freecells],
            foundations: [...this.foundations], // Now just array of rank values
            moveCount: this.moveCount,
            isWon: this.checkWin()
        };
    }

    saveGameState() {
        const state = {
            columns: this.columns.map(col => [...col]),
            freecells: [...this.freecells],
            foundations: [...this.foundations], // Now just array of rank values
            moveCount: this.moveCount
        };
        
        if (this.historyIndex < this.gameHistory.length - 1) {
            this.gameHistory = this.gameHistory.slice(0, this.historyIndex + 1);
        }
        
        this.gameHistory.push(state);
        this.historyIndex = this.gameHistory.length - 1;
        
        if (this.gameHistory.length > this.maxHistorySize) {
            this.gameHistory.shift();
            this.historyIndex--;
        }
    }

    restoreGameState(state) {
        this.columns = state.columns.map(col => [...col]);
        this.freecells = [...state.freecells];
        this.foundations = [...state.foundations]; // Now just array of rank values
        this.moveCount = state.moveCount;
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.gameHistory.length - 1;
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.restoreGameState(this.gameHistory[this.historyIndex]);
            return this.getGameState();
        }
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.restoreGameState(this.gameHistory[this.historyIndex]);
            return this.getGameState();
        }
        return null;
    }

    getCard(location) {
        const { type, index, cardIndex } = location;
        
        if (type === 'column') {
            if (cardIndex !== undefined) {
                return this.columns[index][cardIndex] || null;
            }
            const column = this.columns[index];
            return column.length > 0 ? column[column.length - 1] : null;
        } else if (type === 'freecell') {
            return this.freecells[index];
        } else if (type === 'foundation') {
            const topRank = this.foundations[index];
            if (topRank === 0) return null;
            return {
                suit: this.suits[index],
                rank: this.ranks[topRank - 1],
                color: (this.suits[index] === 'hearts' || this.suits[index] === 'diamonds') ? 'red' : 'black',
                value: topRank
            };
        }
        
        return null;
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

    canMoveToColumn(card, columnIndex) {
        const column = this.columns[columnIndex];
        if (column.length === 0) return true;
        
        const topCard = column[column.length - 1];
        return card.color !== topCard.color && card.value === topCard.value - 1;
    }

    canMoveSequence(sequence, targetColumnIndex) {
        if (sequence.length === 0) return false;
        
        const emptyCells = this.freecells.filter(cell => cell === null).length;
        const emptyColumns = this.columns.filter(col => col.length === 0).length;
        const targetIsEmpty = this.columns[targetColumnIndex].length === 0;
        
        const usableEmptyColumns = targetIsEmpty ? emptyColumns - 1 : emptyColumns;
        const maxMovable = (emptyCells + 1) * Math.pow(2, usableEmptyColumns);
        
        if (sequence.length > maxMovable) return false;
        
        const firstCard = sequence[0];
        return this.canMoveToColumn(firstCard, targetColumnIndex);
    }

    canMoveToFoundation(card, foundationIndex) {
        const suitIndex = this.suits.indexOf(card.suit);
        
        if (foundationIndex !== suitIndex) return false;
        
        const currentTopRank = this.foundations[foundationIndex];
        
        if (currentTopRank === 0) {
            return card.rank === 'A';
        }
        
        return card.value === currentTopRank + 1;
    }

    executeMove(sourceLocation, targetLocation) {
        const sourceCard = this.getCard(sourceLocation);
        if (!sourceCard) return { success: false, error: 'Source card not found' };

        if (sourceLocation.type === 'column' && targetLocation.type === 'column') {
            const startIndex = sourceLocation.cardIndex !== undefined ? sourceLocation.cardIndex : this.columns[sourceLocation.index].length - 1;
            const sequence = this.getMovableSequence(sourceLocation.index, startIndex);
            
            if (!this.canMoveSequence(sequence, targetLocation.index)) {
                return { success: false, error: 'Cannot move sequence to target column' };
            }
            this.columns[sourceLocation.index].splice(startIndex, sequence.length);
            this.columns[targetLocation.index].push(...sequence);
            
        } else if (targetLocation.type === 'freecell') {
            if (this.freecells[targetLocation.index] !== null) {
                return { success: false, error: 'Freecell is occupied' };
            }
            
            if (sourceLocation.type === 'column') {
                if (sourceLocation.cardIndex !== undefined && sourceLocation.cardIndex !== this.columns[sourceLocation.index].length - 1) {
                    return { success: false, error: 'Can only move top card to freecell' };
                }
                this.freecells[targetLocation.index] = this.columns[sourceLocation.index].pop();
            } else if (sourceLocation.type === 'freecell') {
                this.freecells[targetLocation.index] = this.freecells[sourceLocation.index];
                this.freecells[sourceLocation.index] = null;
            }
            
        } else if (targetLocation.type === 'foundation') {
            if (!this.canMoveToFoundation(sourceCard, targetLocation.index)) {
                return { success: false, error: 'Cannot move card to foundation' };
            }
            
            if (sourceLocation.type === 'column') {
                if (sourceLocation.cardIndex !== undefined && sourceLocation.cardIndex !== this.columns[sourceLocation.index].length - 1) {
                    return { success: false, error: 'Can only move top card to foundation' };
                }
                const card = this.columns[sourceLocation.index].pop();
                this.foundations[targetLocation.index] = card.value;
            } else if (sourceLocation.type === 'freecell') {
                const card = this.freecells[sourceLocation.index];
                this.foundations[targetLocation.index] = card.value;
                this.freecells[sourceLocation.index] = null;
            }
            
        } else if (targetLocation.type === 'column') {
            if (sourceLocation.type === 'freecell') {
                if (!this.canMoveToColumn(sourceCard, targetLocation.index)) {
                    return { success: false, error: 'Cannot move card to column' };
                }
                this.columns[targetLocation.index].push(this.freecells[sourceLocation.index]);
                this.freecells[sourceLocation.index] = null;
            }
        }

        this.moveCount++;
        this.saveGameState();
        
        return { 
            success: true, 
            gameState: this.getGameState(),
            isWon: this.checkWin()
        };
    }

    executeDoubleClick(location) {
        const card = this.getCard(location);
        if (!card) return { success: false, error: 'No card at location' };

        if (location.type === 'column') {
            const columnCards = this.columns[location.index];
            if (location.cardIndex === undefined) {
                location.cardIndex = columnCards.length - 1;
            }
            if (location.cardIndex !== columnCards.length - 1) {
                return { success: false, error: 'Can only double-click top card in column' };
            }
        }

        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                return this.executeMove(location, { type: 'foundation', index: i });
            }
        }

        // If double-clicking from freecell, try empty columns
        if (location.type === 'freecell') {
            for (let i = 0; i < 8; i++) {
                if (this.columns[i].length === 0) {
                    return this.executeMove(location, { type: 'column', index: i });
                }
            }
        } else {
            // If double-clicking from column, try freecells as fallback
            for (let i = 0; i < 4; i++) {
                if (this.freecells[i] === null) {
                    return this.executeMove(location, { type: 'freecell', index: i });
                }
            }
        }

        return { success: false, error: 'No valid moves available' };
    }

    checkWin() {
        const totalFoundationCards = this.foundations.reduce((sum, topRank) => sum + topRank, 0);
        return totalFoundationCards === 52;
    }

    isSafeToAutoMove(card) {
        if (card.rank === 'A' || card.rank === '2') {
            return true;
        }
        
        const twoLowerValue = card.value - 2;
        if (twoLowerValue < 1) return true;
        
        const oppositeColors = card.color === 'red' ? ['clubs', 'spades'] : ['hearts', 'diamonds'];
        
        for (const suit of oppositeColors) {
            const foundationIndex = this.suits.indexOf(suit);
            const foundationTopRank = this.foundations[foundationIndex];
            
            if (foundationTopRank < twoLowerValue) {
                return false;
            }
        }
        
        return true;
    }

    isCardInPlay(rank, suit) {
        for (const column of this.columns) {
            if (column.some(card => card.rank === rank && card.suit === suit)) {
                return true;
            }
        }
        
        for (const card of this.freecells) {
            if (card && card.rank === rank && card.suit === suit) {
                return true;
            }
        }
        
        return false;
    }

    getAutoMoves() {
        const moves = [];
        
        for (let col = 0; col < 8; col++) {
            if (this.columns[col].length > 0) {
                const card = this.columns[col][this.columns[col].length - 1];
                const foundationIndex = this.suits.indexOf(card.suit);
                
                if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                    moves.push({
                        from: { type: 'column', index: col },
                        to: { type: 'foundation', index: foundationIndex },
                        card: card
                    });
                }
            }
        }
        
        for (let i = 0; i < 4; i++) {
            if (this.freecells[i]) {
                const card = this.freecells[i];
                const foundationIndex = this.suits.indexOf(card.suit);
                
                if (this.canMoveToFoundation(card, foundationIndex) && this.isSafeToAutoMove(card)) {
                    moves.push({
                        from: { type: 'freecell', index: i },
                        to: { type: 'foundation', index: foundationIndex },
                        card: card
                    });
                }
            }
        }
        
        return moves;
    }

    executeAutoMove() {
        const moves = this.getAutoMoves();
        if (moves.length > 0) {
            const move = moves[0];
            return this.executeMove(move.from, move.to);
        }
        return { success: false, error: 'No auto moves available' };
    }
}

// Support both CommonJS (Node/React Native) and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeCellEngine;
} else if (typeof global !== 'undefined') {
    global.FreeCellEngine = FreeCellEngine;
}

// Also export as ES6 module for React Native
if (typeof exports !== 'undefined') {
    exports.default = FreeCellEngine;
}