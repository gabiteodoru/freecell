import 'package:test/test.dart';
import '../lib/freecell_engine.dart';

// Helper function to create a specific card
Card createCard(String rank, String suit) {
  return Card(
    rank: rank,
    suit: suit,
    color: (suit == 'hearts' || suit == 'diamonds') ? 'red' : 'black',
    value: FreeCellEngine.ranks.indexOf(rank) + 1,
  );
}

void main() {
  group('FreeCellEngine Tests', () {
    // Test basic engine initialization
    test('Engine initializes correctly', () {
      final engine = FreeCellEngine();
      expect(engine.columns.length, equals(8), reason: 'Should have 8 columns');
      expect(engine.freecells.length, equals(4), reason: 'Should have 4 freecells');
      expect(engine.foundations.length, equals(4), reason: 'Should have 4 foundations');
      expect(engine.moveCount, equals(0), reason: 'Move count should start at 0');
    });

    // Test deck creation
    test('Deck creation works correctly', () {
      final engine = FreeCellEngine();
      final deck = engine.createDeck();
      expect(deck.length, equals(52), reason: 'Deck should have 52 cards');
      
      // Check we have all suits and ranks
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      for (final suit in suits) {
        for (final rank in ranks) {
          final card = deck.firstWhere(
            (c) => c.suit == suit && c.rank == rank,
            orElse: () => throw Exception('Missing card: $rank of $suit'),
          );
          expect(card.suit, equals(suit));
          expect(card.rank, equals(rank));
        }
      }
    });

    // Test setting up a predetermined game state
    test('Can set up predetermined game state', () {
      final engine = FreeCellEngine();
      
      // Set up a simple test state with one card in column 0 and one in freecell 0
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('A', 'hearts')];
      
      final freecells = <Card?>[createCard('2', 'spades'), null, null, null];
      final foundations = [0, 0, 0, 0]; // 0 = empty
      
      engine.setGameState(columns, freecells, foundations, 5);
      
      final gameState = engine.getGameState();
      expect(gameState.columns[0].length, equals(1), reason: 'Column 0 should have one card');
      expect(gameState.columns[0][0].rank, equals('A'), reason: 'Card should be Ace');
      expect(gameState.freecells[0]!.rank, equals('2'), reason: 'Freecell should have 2');
      expect(gameState.moveCount, equals(5), reason: 'Move count should be set correctly');
    });

    // Test move validation - valid move to foundation
    test('Valid move to foundation works', () {
      final engine = FreeCellEngine();
      
      // Set up state with Ace of hearts in column 0
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('A', 'hearts')];
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0),
        GameLocation(type: 'foundation', index: 0), // Hearts foundation
      );
      
      expect(result.success, isTrue, reason: 'Move should succeed');
      expect(result.gameState!.foundations[0], equals(1), reason: 'Foundation should have Ace (rank 1)');
      expect(result.gameState!.columns[0].length, equals(0), reason: 'Column should be empty');
      expect(result.gameState!.moveCount, equals(1), reason: 'Move count should increment');
    });

    // Test move validation - invalid move to foundation
    test('Invalid move to foundation fails', () {
      final engine = FreeCellEngine();
      
      // Set up state with 2 of hearts in column 0 (can't put 2 on empty foundation)
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('2', 'hearts')];
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0),
        GameLocation(type: 'foundation', index: 0),
      );
      
      expect(result.success, isFalse, reason: 'Move should fail');
      expect(result.error, equals('Cannot move card to foundation'), reason: 'Should have correct error message');
    });

    // Test double-click command
    test('Double-click moves Ace to foundation', () {
      final engine = FreeCellEngine();
      
      // Set up state with Ace of hearts in column 0
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('A', 'hearts')];
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      final result = engine.executeDoubleClick(GameLocation(type: 'column', index: 0));
      
      expect(result.success, isTrue, reason: 'Double-click should succeed');
      expect(result.gameState!.foundations[0], equals(1), reason: 'Foundation should have Ace (rank 1)');
      expect(result.gameState!.columns[0].length, equals(0), reason: 'Column should be empty');
    });

    // Test sequence movement
    test('Valid sequence movement works', () {
      final engine = FreeCellEngine();
      
      // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'),
        createCard('3', 'diamonds')
      ];
      columns[1] = [createCard('6', 'clubs')]; // Black 6 to receive the sequence
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Move the entire sequence starting from index 0 (Red 5, Black 4, Red 3)
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0, cardIndex: 0),
        GameLocation(type: 'column', index: 1),
      );
      
      expect(result.success, isTrue, reason: 'Sequence move should succeed');
      expect(result.gameState!.columns[0].length, equals(0), reason: 'Source column should be empty');
      expect(result.gameState!.columns[1].length, equals(4), reason: 'Target column should have four cards');
      expect(result.gameState!.columns[1][3].rank, equals('3'), reason: 'Top card should be Red 3');
    });

    // Test invalid sequence movement (corrected - this SHOULD fail)
    test('Invalid sequence movement correctly fails', () {
      final engine = FreeCellEngine();
      
      // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'),
        createCard('3', 'diamonds')
      ];
      columns[1] = [createCard('6', 'clubs')]; // Black 6 - cannot receive Black 4!
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Try to move the sequence starting from index 1 (Black 4, Red 3) - this should FAIL
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0, cardIndex: 1),
        GameLocation(type: 'column', index: 1),
      );
      
      expect(result.success, isFalse, reason: 'Move should fail - Black 4 cannot go on Black 6');
      expect(result.error!.contains('Cannot move'), isTrue, reason: 'Should have appropriate error message');
    });

    // Test valid sequence movement (corrected - move entire stack)
    test('Valid sequence movement works correctly', () {
      final engine = FreeCellEngine();
      
      // Set up column 0 with a valid sequence: Red 5, Black 4, Red 3
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('5', 'hearts'),    // Red 5
        createCard('4', 'clubs'),     // Black 4
        createCard('3', 'diamonds')   // Red 3
      ];
      columns[1] = [createCard('6', 'clubs')]; // Black 6 - CAN receive Red 5
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Move the entire sequence starting from index 0 (Red 5, Black 4, Red 3)
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0, cardIndex: 0),
        GameLocation(type: 'column', index: 1),
      );
      
      expect(result.success, isTrue, reason: 'Sequence move should succeed - Red 5 can go on Black 6');
      expect(result.gameState!.columns[0].length, equals(0), reason: 'Source column should be empty');
      expect(result.gameState!.columns[1].length, equals(4), reason: 'Target column should have four cards');
      expect(result.gameState!.columns[1][3].rank, equals('3'), reason: 'Top card should be Red 3');
      expect(result.gameState!.columns[1][1].rank, equals('5'), reason: 'Second card should be Red 5');
    });

    // Test invalid sequence movement
    test('Invalid sequence movement fails', () {
      final engine = FreeCellEngine();
      
      // Set up column 0 with invalid sequence: Red 5, Red 4 (same color)
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'hearts') // Same color - invalid sequence
      ];
      columns[1] = <Card>[];
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Try to move "sequence" starting from index 0
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0, cardIndex: 0),
        GameLocation(type: 'column', index: 1),
      );
      
      expect(result.success, isTrue, reason: 'Should move valid part of sequence');
      expect(result.gameState!.columns[1].length, equals(1), reason: 'Should only move one card');
    });

    // Test undo/redo functionality
    test('Undo and redo work correctly', () {
      final engine = FreeCellEngine();
      
      // Set up initial state
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('A', 'hearts')];
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Make a move
      engine.executeMove(
        GameLocation(type: 'column', index: 0),
        GameLocation(type: 'foundation', index: 0),
      );
      
      expect(engine.canUndo(), isTrue, reason: 'Should be able to undo');
      expect(engine.canRedo(), isFalse, reason: 'Should not be able to redo');
      
      // Undo the move
      final undoState = engine.undo()!;
      expect(undoState.columns[0].length, equals(1), reason: 'Column should have card back');
      expect(undoState.foundations[0], equals(0), reason: 'Foundation should be empty');
      
      expect(engine.canUndo(), isFalse, reason: 'Should not be able to undo further');
      expect(engine.canRedo(), isTrue, reason: 'Should be able to redo');
      
      // Redo the move
      final redoState = engine.redo()!;
      expect(redoState.foundations[0], equals(1), reason: 'Foundation should have Ace (rank 1)');
    });

    // Test win condition
    test('Win condition detection works', () {
      final engine = FreeCellEngine();
      
      // Set up a winning state (all cards in foundations)
      final foundations = [13, 13, 13, 13]; // All foundations have King (rank 13)
      
      engine.setGameState(List.generate(8, (_) => <Card>[]), [null, null, null, null], foundations, 0);
      
      expect(engine.checkWin(), isTrue, reason: 'Should detect win condition');
      
      final gameState = engine.getGameState();
      expect(gameState.isWon, isTrue, reason: 'Game state should indicate win');
    });

    // Test auto-move functionality
    test('Auto-move finds and executes safe moves', () {
      final engine = FreeCellEngine();
      
      // Set up state where Ace can be auto-moved to foundation
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('A', 'hearts')];
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      final moves = engine.getAutoMoves();
      expect(moves.length, equals(1), reason: 'Should find one auto-move');
      expect((moves[0]['card'] as Card).rank, equals('A'), reason: 'Should be the Ace');
      
      final result = engine.executeAutoMove();
      expect(result.success, isTrue, reason: 'Auto-move should succeed');
      expect(result.gameState!.foundations[0], equals(1), reason: 'Ace should be in foundation (rank 1)');
    });

    // Test auto-move safety with specific scenario
    test('Auto-move safety: 3♥ with mixed foundations', () {
      final engine = FreeCellEngine();
      
      // User's real scenario: 2♥, 0♦, A♣, 2♠ foundations
      final foundations = [2, 0, 1, 2]; // hearts=2, diamonds=0, clubs=A, spades=2
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [createCard('3', 'hearts')];
      
      engine.setGameState(columns, [null, null, null, null], foundations, 0);
      
      final card3Hearts = engine.getCard(GameLocation(type: 'column', index: 0))!;
      expect(engine.isSafeToAutoMove(card3Hearts), isTrue, reason: '3♥ should be safe - both A♣ and A♠ are in foundations');
      
      final autoMoves = engine.getAutoMoves();
      expect(autoMoves.length, equals(1), reason: 'Should find 3♥ as auto-moveable');
      expect((autoMoves[0]['card'] as Card).rank, equals('3'), reason: 'Should be the 3♥');
    });

    // Test sequence move internal logic
    test('Sequence move validates cardIndex correctly', () {
      final engine = FreeCellEngine();
      
      // Set up sequence: 5♥, 4♣, 3♦ in column 0
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('5', 'hearts'),
        createCard('4', 'clubs'), 
        createCard('3', 'diamonds')
      ];
      columns[1] = [createCard('6', 'clubs')]; // Target for sequence
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Test cardIndex: 0 (should move entire sequence)
      final sequence0 = engine.getMovableSequence(0, 0);
      expect(sequence0.length, equals(3), reason: 'cardIndex 0 should get full valid sequence');
      
      // Test cardIndex: 1 (should move 4♣, 3♦)  
      final sequence1 = engine.getMovableSequence(0, 1);
      expect(sequence1.length, equals(2), reason: 'cardIndex 1 should get 2-card sequence');
      
      // Test cardIndex: 2 (should move just 3♦)
      final sequence2 = engine.getMovableSequence(0, 2);
      expect(sequence2.length, equals(1), reason: 'cardIndex 2 should get single card');
      
      // Verify the || operator bug is fixed - cardIndex: 0 should not default to top card
      final result = engine.executeMove(
        GameLocation(type: 'column', index: 0, cardIndex: 0),
        GameLocation(type: 'column', index: 1),
      );
      expect(result.success, isTrue, reason: 'Should move entire sequence starting from cardIndex 0');
      expect(result.gameState!.columns[0].length, equals(0), reason: 'Source column should be empty');
      expect(result.gameState!.columns[1].length, equals(4), reason: 'Target should have 4 cards');
    });

    // Test complex scenario with predetermined setup
    test('Complex scenario: freecell strategy', () {
      final engine = FreeCellEngine();
      
      // Set up a scenario where we need to use freecells strategically
      final columns = List.generate(8, (_) => <Card>[]);
      columns[0] = [
        createCard('K', 'clubs'),    // Bottom
        createCard('Q', 'hearts'),   // Can't move - has King below
        createCard('J', 'clubs')     // Top - can move to freecell
      ];
      columns[1] = [createCard('K', 'spades')]; // Can receive red Queen
      
      engine.setGameState(columns, [null, null, null, null], [0, 0, 0, 0], 0);
      
      // Move Jack to freecell to expose Queen
      var result = engine.executeMove(
        GameLocation(type: 'column', index: 0),
        GameLocation(type: 'freecell', index: 0),
      );
      expect(result.success, isTrue, reason: 'Should move Jack to freecell');
      
      // Now move Queen hearts to column 1 (onto King spades)
      result = engine.executeMove(
        GameLocation(type: 'column', index: 0),
        GameLocation(type: 'column', index: 1),
      );
      expect(result.success, isTrue, reason: 'Should move Queen hearts to King spades');
      
      // Move Jack clubs back from freecell to column 1 (onto Queen hearts)
      result = engine.executeMove(
        GameLocation(type: 'freecell', index: 0),
        GameLocation(type: 'column', index: 1),
      );
      expect(result.success, isTrue, reason: 'Should move Jack clubs onto Queen hearts');
      
      final finalState = result.gameState!;
      expect(finalState.columns[1].length, equals(3), reason: 'Column 1 should have 3 cards');
      expect(finalState.freecells[0], isNull, reason: 'Freecell should be empty');
      expect(finalState.moveCount, equals(3), reason: 'Should have made 3 moves');
    });
  });
}