// Simple test framework for FreeCellEngine
class TestFramework {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    run() {
        console.log('Running FreeCellEngine Tests...\n');
        
        for (const test of this.tests) {
            try {
                test.testFunction();
                console.log(`✓ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.log(`✗ ${test.name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed === 0) {
            console.log('All tests passed! 🎉');
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            const details = `Expected ${expected}, got ${actual}`;
            const fullMessage = message ? `${details}: ${message}` : details;
            throw new Error(fullMessage);
        }
    }

    assertArrayEquals(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }
}

// Test suite for FreeCellEngine
const test = new TestFramework();

// Helper function to create a specific card
function createCard(rank, suit) {
    return {
        rank,
        suit,
        color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
        value: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(rank) + 1
    };
}

// Test basic engine initialization
test.test('Engine initializes correctly', () => {
    const engine = new FreeCellEngine();
    test.assertEquals(engine.columns.length, 8, 'Should have 8 columns');
    test.assertEquals(engine.freecells.length, 4, 'Should have 4 freecells');
    test.assertEquals(engine.foundations.length, 4, 'Should have 4 foundations');
    test.assertEquals(engine.moveCount, 0, 'Move count should start at 0');
});

// Test deck creation
test.test('Deck creation works correctly', () => {
    const engine = new FreeCellEngine();
    const deck = engine.createDeck();
    test.assertEquals(deck.length, 52, 'Deck should have 52 cards');
    
    // Check we have all suits and ranks
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            const card = deck.find(c => c.suit === suit && c.rank === rank);
            test.assert(card, `Should have ${rank} of ${suit}`);
        }
    }
});

// Test setting up a predetermined game state
test.test('Can set up predetermined game state', () => {
    const engine = new FreeCellEngine();
    
    // Set up a simple test state with one card in column 0 and one in freecell 0
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('A', 'hearts')];
    
    const freecells = [createCard('2', 'spades'), null, null, null];
    const foundations = [0, 0, 0, 0]; // 0 = empty
    
    engine.setGameState(columns, freecells, foundations, 5);
    
    const gameState = engine.getGameState();
    test.assertEquals(gameState.columns[0].length, 1, 'Column 0 should have one card');
    test.assertEquals(gameState.columns[0][0].rank, 'A', 'Card should be Ace');
    test.assertEquals(gameState.freecells[0].rank, '2', 'Freecell should have 2');
    test.assertEquals(gameState.moveCount, 5, 'Move count should be set correctly');
});

// Test move validation - valid move to foundation
test.test('Valid move to foundation works', () => {
    const engine = new FreeCellEngine();
    
    // Set up state with Ace of hearts in column 0
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('A', 'hearts')];
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    const result = engine.executeMove(
        { type: 'column', index: 0 },
        { type: 'foundation', index: 0 } // Hearts foundation
    );
    
    test.assert(result.success, 'Move should succeed');
    test.assertEquals(result.gameState.foundations[0], 1, 'Foundation should have Ace (rank 1)');
    test.assertEquals(result.gameState.columns[0].length, 0, 'Column should be empty');
    test.assertEquals(result.gameState.moveCount, 1, 'Move count should increment');
});

// Test move validation - invalid move to foundation
test.test('Invalid move to foundation fails', () => {
    const engine = new FreeCellEngine();
    
    // Set up state with 2 of hearts in column 0 (can't put 2 on empty foundation)
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('2', 'hearts')];
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    const result = engine.executeMove(
        { type: 'column', index: 0 },
        { type: 'foundation', index: 0 }
    );
    
    test.assert(!result.success, 'Move should fail');
    test.assertEquals(result.error, 'Cannot move card to foundation', 'Should have correct error message');
});

// Test double-click command
test.test('Double-click moves Ace to foundation', () => {
    const engine = new FreeCellEngine();
    
    // Set up state with Ace of hearts in column 0
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('A', 'hearts')];
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    const result = engine.executeDoubleClick({ type: 'column', index: 0 });
    
    test.assert(result.success, 'Double-click should succeed');
    test.assertEquals(result.gameState.foundations[0], 1, 'Foundation should have Ace (rank 1)');
    test.assertEquals(result.gameState.columns[0].length, 0, 'Column should be empty');
});

// Test sequence movement
test.test('Valid sequence movement works', () => {
    const engine = new FreeCellEngine();
    
    // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'),
        createCard('3', 'diamonds')
    ];
    columns[1] = [createCard('6', 'clubs')]; // Black 6 to receive the sequence
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Move the entire sequence starting from index 0 (Red 5, Black 4, Red 3)
    const result = engine.executeMove(
        { type: 'column', index: 0, cardIndex: 0 },
        { type: 'column', index: 1 }
    );
    
    test.assert(result.success, 'Sequence move should succeed');
    test.assertEquals(result.gameState.columns[0].length, 0, 'Source column should be empty');
    test.assertEquals(result.gameState.columns[1].length, 4, 'Target column should have four cards');
    test.assertEquals(result.gameState.columns[1][3].rank, '3', 'Top card should be Red 3');
});

// Test invalid sequence movement (corrected - this SHOULD fail)
test.test('Invalid sequence movement correctly fails', () => {
    const engine = new FreeCellEngine();
    
    // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'),
        createCard('3', 'diamonds')
    ];
    columns[1] = [createCard('6', 'clubs')]; // Black 6 - cannot receive Black 4!
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Try to move the sequence starting from index 1 (Black 4, Red 3) - this should FAIL
    const result = engine.executeMove(
        { type: 'column', index: 0, cardIndex: 1 },
        { type: 'column', index: 1 }
    );
    
    test.assert(!result.success, 'Move should fail - Black 4 cannot go on Black 6');
    test.assert(result.error.includes('Cannot move'), 'Should have appropriate error message');
});

// Test valid sequence movement (corrected - move entire stack)
test.test('Valid sequence movement works correctly', () => {
    const engine = new FreeCellEngine();
    
    // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('5', 'hearts'),    // Red 5
        createCard('4', 'clubs'),     // Black 4
        createCard('3', 'diamonds')   // Red 3
    ];
    columns[1] = [createCard('6', 'clubs')]; // Black 6 - CAN receive Red 5
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Move the entire sequence starting from index 0 (Red 5, Black 4, Red 3)
    const result = engine.executeMove(
        { type: 'column', index: 0, cardIndex: 0 },
        { type: 'column', index: 1 }
    );
    
    test.assert(result.success, 'Sequence move should succeed - Red 5 can go on Black 6');
    test.assertEquals(result.gameState.columns[0].length, 0, 'Source column should be empty');
    test.assertEquals(result.gameState.columns[1].length, 4, 'Target column should have four cards');
    test.assertEquals(result.gameState.columns[1][3].rank, '3', 'Top card should be Red 3');
    test.assertEquals(result.gameState.columns[1][1].rank, '5', 'Second card should be Red 5');
});

// Test invalid sequence movement
test.test('Invalid sequence movement fails', () => {
    const engine = new FreeCellEngine();
    
    // Set up column 0 with invalid sequence: Red 5, Red 4 (same color)
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'hearts') // Same color - invalid sequence
    ];
    columns[1] = [];
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Try to move "sequence" starting from index 0
    const result = engine.executeMove(
        { type: 'column', index: 0, cardIndex: 0 },
        { type: 'column', index: 1 }
    );
    
    test.assert(result.success, 'Should move valid part of sequence');
    test.assertEquals(result.gameState.columns[1].length, 1, 'Should only move one card');
});

// Test undo/redo functionality
test.test('Undo and redo work correctly', () => {
    const engine = new FreeCellEngine();
    
    // Set up initial state
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('A', 'hearts')];
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Make a move
    engine.executeMove(
        { type: 'column', index: 0 },
        { type: 'foundation', index: 0 }
    );
    
    test.assert(engine.canUndo(), 'Should be able to undo');
    test.assert(!engine.canRedo(), 'Should not be able to redo');
    
    // Undo the move
    const undoState = engine.undo();
    test.assertEquals(undoState.columns[0].length, 1, 'Column should have card back');
    test.assertEquals(undoState.foundations[0], 0, 'Foundation should be empty');
    
    test.assert(!engine.canUndo(), 'Should not be able to undo further');
    test.assert(engine.canRedo(), 'Should be able to redo');
    
    // Redo the move
    const redoState = engine.redo();
    test.assertEquals(redoState.foundations[0], 1, 'Foundation should have Ace (rank 1)');
});

// Test win condition
test.test('Win condition detection works', () => {
    const engine = new FreeCellEngine();
    
    // Set up a winning state (all cards in foundations)
    const foundations = [13, 13, 13, 13]; // All foundations have King (rank 13)
    
    engine.setGameState(Array(8).fill().map(() => []), [null, null, null, null], foundations, 0);
    
    test.assert(engine.checkWin(), 'Should detect win condition');
    
    const gameState = engine.getGameState();
    test.assert(gameState.isWon, 'Game state should indicate win');
});

// Test auto-move functionality
test.test('Auto-move finds and executes safe moves', () => {
    const engine = new FreeCellEngine();
    
    // Set up state where Ace can be auto-moved to foundation
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('A', 'hearts')];
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    const moves = engine.getAutoMoves();
    test.assertEquals(moves.length, 1, 'Should find one auto-move');
    test.assertEquals(moves[0].card.rank, 'A', 'Should be the Ace');
    
    const result = engine.executeAutoMove();
    test.assert(result.success, 'Auto-move should succeed');
    test.assertEquals(result.gameState.foundations[0], 1, 'Ace should be in foundation (rank 1)');
});

// Test auto-move safety with specific scenario
test.test('Auto-move safety: 3♥ with mixed foundations', () => {
    const engine = new FreeCellEngine();
    
    // User's real scenario: 2♥, 0♦, A♣, 2♠ foundations
    const foundations = [2, 0, 1, 2]; // hearts=2, diamonds=0, clubs=A, spades=2
    const columns = Array(8).fill().map(() => []);
    columns[0] = [createCard('3', 'hearts')];
    
    engine.setGameState(columns, [null, null, null, null], foundations, 0);
    
    const card3Hearts = engine.getCard({ type: 'column', index: 0 });
    test.assert(engine.isSafeToAutoMove(card3Hearts), '3♥ should be safe - both A♣ and A♠ are in foundations');
    
    const autoMoves = engine.getAutoMoves();
    test.assertEquals(autoMoves.length, 1, 'Should find 3♥ as auto-moveable');
    test.assertEquals(autoMoves[0].card.rank, '3', 'Should be the 3♥');
});

// Test sequence move internal logic
test.test('Sequence move validates cardIndex correctly', () => {
    const engine = new FreeCellEngine();
    
    // Set up sequence: 5♥, 4♣, 3♦ in column 0
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'), 
        createCard('3', 'diamonds')
    ];
    columns[1] = [createCard('6', 'clubs')]; // Target for sequence
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Test cardIndex: 0 (should move entire sequence)
    const sequence0 = engine.getMovableSequence(0, 0);
    test.assertEquals(sequence0.length, 3, 'cardIndex 0 should get full valid sequence');
    
    // Test cardIndex: 1 (should move 4♣, 3♦)  
    const sequence1 = engine.getMovableSequence(0, 1);
    test.assertEquals(sequence1.length, 2, 'cardIndex 1 should get 2-card sequence');
    
    // Test cardIndex: 2 (should move just 3♦)
    const sequence2 = engine.getMovableSequence(0, 2);
    test.assertEquals(sequence2.length, 1, 'cardIndex 2 should get single card');
    
    // Verify the || operator bug is fixed - cardIndex: 0 should not default to top card
    const result = engine.executeMove(
        { type: 'column', index: 0, cardIndex: 0 },
        { type: 'column', index: 1 }
    );
    test.assert(result.success, 'Should move entire sequence starting from cardIndex 0');
    test.assertEquals(result.gameState.columns[0].length, 0, 'Source column should be empty');
    test.assertEquals(result.gameState.columns[1].length, 4, 'Target should have 4 cards');
});

// Test complex scenario with predetermined setup
test.test('Complex scenario: freecell strategy', () => {
    const engine = new FreeCellEngine();
    
    // Set up a scenario where we need to use freecells strategically
    const columns = Array(8).fill().map(() => []);
    columns[0] = [
        createCard('K', 'clubs'),    // Bottom
        createCard('Q', 'hearts'),   // Can't move - has King below
        createCard('J', 'clubs')     // Top - can move to freecell
    ];
    columns[1] = [createCard('K', 'spades')]; // Can receive red Queen
    
    engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
    
    // Move Jack to freecell to expose Queen
    let result = engine.executeMove(
        { type: 'column', index: 0 },
        { type: 'freecell', index: 0 }
    );
    test.assert(result.success, 'Should move Jack to freecell');
    
    // Now move Queen hearts to column 1 (onto King spades)
    result = engine.executeMove(
        { type: 'column', index: 0 },
        { type: 'column', index: 1 }
    );
    test.assert(result.success, 'Should move Queen hearts to King spades');
    
    // Move Jack clubs back from freecell to column 1 (onto Queen hearts)
    result = engine.executeMove(
        { type: 'freecell', index: 0 },
        { type: 'column', index: 1 }
    );
    test.assert(result.success, 'Should move Jack clubs onto Queen hearts');
    
    const finalState = result.gameState;
    test.assertEquals(finalState.columns[1].length, 3, 'Column 1 should have 3 cards');
    test.assertEquals(finalState.freecells[0], null, 'Freecell should be empty');
    test.assertEquals(finalState.moveCount, 3, 'Should have made 3 moves');
});

// Export for use in HTML test page or run directly
if (typeof window !== 'undefined') {
    window.FreeCellTests = {
        run: () => test.run(),
        createCard: createCard
    };
} else {
    // Run tests directly in Node.js environment
    test.run();
}