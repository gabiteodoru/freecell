class Card {
  final String suit;
  final String rank;
  final String color;
  final int value;

  Card({
    required this.suit,
    required this.rank,
    required this.color,
    required this.value,
  });

  Card copyWith({
    String? suit,
    String? rank,
    String? color,
    int? value,
  }) {
    return Card(
      suit: suit ?? this.suit,
      rank: rank ?? this.rank,
      color: color ?? this.color,
      value: value ?? this.value,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Card &&
        other.suit == suit &&
        other.rank == rank &&
        other.color == color &&
        other.value == value;
  }

  @override
  int get hashCode {
    return suit.hashCode ^ rank.hashCode ^ color.hashCode ^ value.hashCode;
  }

  @override
  String toString() {
    return '$rank of $suit';
  }
}

class GameLocation {
  final String type;
  final int index;
  final int? cardIndex;

  GameLocation({
    required this.type,
    required this.index,
    this.cardIndex,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is GameLocation &&
        other.type == type &&
        other.index == index &&
        other.cardIndex == cardIndex;
  }

  @override
  int get hashCode {
    return type.hashCode ^ index.hashCode ^ (cardIndex?.hashCode ?? 0);
  }

  @override
  String toString() {
    return 'GameLocation(type: $type, index: $index, cardIndex: $cardIndex)';
  }
}

class GameState {
  final List<List<Card>> columns;
  final List<Card?> freecells;
  final List<int> foundations;
  final int moveCount;
  final bool isWon;

  GameState({
    required this.columns,
    required this.freecells,
    required this.foundations,
    required this.moveCount,
    required this.isWon,
  });
}

class MoveResult {
  final bool success;
  final String? error;
  final GameState? gameState;
  final bool? isWon;

  MoveResult({
    required this.success,
    this.error,
    this.gameState,
    this.isWon,
  });
}

class FreeCellEngine {
  static const List<String> suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  static const List<String> ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  List<List<Card>> columns = [];
  List<Card?> freecells = [];
  List<int> foundations = [];
  int moveCount = 0;
  List<Map<String, dynamic>> gameHistory = [];
  int historyIndex = -1;
  int maxHistorySize = 100;

  FreeCellEngine() {
    reset();
  }

  void reset() {
    columns = List.generate(8, (_) => <Card>[]);
    freecells = List.filled(4, null);
    foundations = List.filled(4, 0); // 0 = empty, 1-13 = rank value
    moveCount = 0;
    gameHistory = [];
    historyIndex = -1;
  }

  List<Card> createDeck() {
    final deck = <Card>[];
    for (final suit in suits) {
      for (final rank in ranks) {
        deck.add(Card(
          suit: suit,
          rank: rank,
          color: (suit == 'hearts' || suit == 'diamonds') ? 'red' : 'black',
          value: ranks.indexOf(rank) + 1,
        ));
      }
    }
    return deck;
  }

  List<Card> shuffleDeck(List<Card> deck) {
    final shuffled = List<Card>.from(deck);
    for (int i = shuffled.length - 1; i > 0; i--) {
      final j = (DateTime.now().millisecondsSinceEpoch + i) % (i + 1);
      final temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }

  void dealCards([List<Card>? deck]) {
    deck ??= shuffleDeck(createDeck());
    
    columns = List.generate(8, (_) => <Card>[]);
    int cardIndex = 0;
    
    for (int col = 0; col < 8; col++) {
      final cardsInColumn = col < 4 ? 7 : 6;
      for (int row = 0; row < cardsInColumn; row++) {
        if (cardIndex < deck.length) {
          columns[col].add(deck[cardIndex++]);
        }
      }
    }
  }

  GameState newGame([List<Card>? predeterminedDeck]) {
    reset();
    dealCards(predeterminedDeck);
    saveGameState();
    return getGameState();
  }

  void setGameState(List<List<Card>> newColumns, List<Card?> newFreecells, List<int> newFoundations, [int newMoveCount = 0]) {
    columns = newColumns.map((col) => col.map((card) => Card(
      suit: card.suit,
      rank: card.rank,
      color: card.color,
      value: card.value,
    )).toList()).toList();
    freecells = List.from(newFreecells);
    foundations = List.from(newFoundations);
    moveCount = newMoveCount;
    saveGameState();
  }

  GameState getGameState() {
    return GameState(
      columns: columns.map((col) => col.map((card) => Card(
        suit: card.suit,
        rank: card.rank,
        color: card.color,
        value: card.value,
      )).toList()).toList(),
      freecells: List.from(freecells),
      foundations: List.from(foundations),
      moveCount: moveCount,
      isWon: checkWin(),
    );
  }

  void saveGameState() {
    final state = {
      'columns': columns.map((col) => List.from(col)).toList(),
      'freecells': List.from(freecells),
      'foundations': List.from(foundations),
      'moveCount': moveCount,
    };
    
    if (historyIndex < gameHistory.length - 1) {
      gameHistory = gameHistory.sublist(0, historyIndex + 1);
    }
    
    gameHistory.add(state);
    historyIndex = gameHistory.length - 1;
    
    if (gameHistory.length > maxHistorySize) {
      gameHistory.removeAt(0);
      historyIndex--;
    }
  }

  void restoreGameState(Map<String, dynamic> state) {
    columns = (state['columns'] as List).map((col) => List<Card>.from(col)).toList();
    freecells = List<Card?>.from(state['freecells']);
    foundations = List<int>.from(state['foundations']);
    moveCount = state['moveCount'] as int;
  }

  bool canUndo() {
    return historyIndex > 0;
  }

  bool canRedo() {
    return historyIndex < gameHistory.length - 1;
  }

  GameState? undo() {
    if (canUndo()) {
      historyIndex--;
      restoreGameState(gameHistory[historyIndex]);
      return getGameState();
    }
    return null;
  }

  GameState? redo() {
    if (canRedo()) {
      historyIndex++;
      restoreGameState(gameHistory[historyIndex]);
      return getGameState();
    }
    return null;
  }

  Card? getCard(GameLocation location) {
    switch (location.type) {
      case 'column':
        if (location.cardIndex != null) {
          return location.cardIndex! < columns[location.index].length 
              ? columns[location.index][location.cardIndex!] 
              : null;
        }
        final column = columns[location.index];
        return column.isNotEmpty ? column.last : null;
      
      case 'freecell':
        return freecells[location.index];
      
      case 'foundation':
        final topRank = foundations[location.index];
        if (topRank == 0) return null;
        return Card(
          suit: suits[location.index],
          rank: ranks[topRank - 1],
          color: (suits[location.index] == 'hearts' || suits[location.index] == 'diamonds') ? 'red' : 'black',
          value: topRank,
        );
      
      default:
        return null;
    }
  }

  List<Card> getMovableSequence(int columnIndex, int startCardIndex) {
    final column = columns[columnIndex];
    final sequence = <Card>[];
    
    for (int i = startCardIndex; i < column.length; i++) {
      final card = column[i];
      
      if (sequence.isEmpty) {
        sequence.add(card);
      } else {
        final prevCard = sequence.last;
        if (card.color != prevCard.color && card.value == prevCard.value - 1) {
          sequence.add(card);
        } else {
          break;
        }
      }
    }
    
    return sequence;
  }

  bool canMoveToColumn(Card card, int columnIndex) {
    final column = columns[columnIndex];
    if (column.isEmpty) return true;
    
    final topCard = column.last;
    return card.color != topCard.color && card.value == topCard.value - 1;
  }

  bool canMoveSequence(List<Card> sequence, int targetColumnIndex) {
    if (sequence.isEmpty) return false;
    
    final emptyCells = freecells.where((cell) => cell == null).length;
    final emptyColumns = columns.where((col) => col.isEmpty).length;
    final targetIsEmpty = columns[targetColumnIndex].isEmpty;
    
    final usableEmptyColumns = targetIsEmpty ? emptyColumns - 1 : emptyColumns;
    final maxMovable = (emptyCells + 1) * (1 << usableEmptyColumns); // Math.pow(2, usableEmptyColumns)
    
    if (sequence.length > maxMovable) return false;
    
    final firstCard = sequence.first;
    return canMoveToColumn(firstCard, targetColumnIndex);
  }

  bool canMoveToFoundation(Card card, int foundationIndex) {
    final suitIndex = suits.indexOf(card.suit);
    
    if (foundationIndex != suitIndex) return false;
    
    final currentTopRank = foundations[foundationIndex];
    
    if (currentTopRank == 0) {
      return card.rank == 'A';
    }
    
    return card.value == currentTopRank + 1;
  }

  MoveResult executeMove(GameLocation sourceLocation, GameLocation targetLocation) {
    final sourceCard = getCard(sourceLocation);
    if (sourceCard == null) {
      return MoveResult(success: false, error: 'Source card not found');
    }

    if (sourceLocation.type == 'column' && targetLocation.type == 'column') {
      final startIndex = sourceLocation.cardIndex ?? columns[sourceLocation.index].length - 1;
      final sequence = getMovableSequence(sourceLocation.index, startIndex);
      
      if (!canMoveSequence(sequence, targetLocation.index)) {
        return MoveResult(success: false, error: 'Cannot move sequence to target column');
      }
      columns[sourceLocation.index].removeRange(startIndex, columns[sourceLocation.index].length);
      columns[targetLocation.index].addAll(sequence);
      
    } else if (targetLocation.type == 'freecell') {
      if (freecells[targetLocation.index] != null) {
        return MoveResult(success: false, error: 'Freecell is occupied');
      }
      
      if (sourceLocation.type == 'column') {
        if (sourceLocation.cardIndex != null && sourceLocation.cardIndex != columns[sourceLocation.index].length - 1) {
          return MoveResult(success: false, error: 'Can only move top card to freecell');
        }
        freecells[targetLocation.index] = columns[sourceLocation.index].removeLast();
      } else if (sourceLocation.type == 'freecell') {
        freecells[targetLocation.index] = freecells[sourceLocation.index];
        freecells[sourceLocation.index] = null;
      }
      
    } else if (targetLocation.type == 'foundation') {
      if (!canMoveToFoundation(sourceCard, targetLocation.index)) {
        return MoveResult(success: false, error: 'Cannot move card to foundation');
      }
      
      if (sourceLocation.type == 'column') {
        if (sourceLocation.cardIndex != null && sourceLocation.cardIndex != columns[sourceLocation.index].length - 1) {
          return MoveResult(success: false, error: 'Can only move top card to foundation');
        }
        final card = columns[sourceLocation.index].removeLast();
        foundations[targetLocation.index] = card.value;
      } else if (sourceLocation.type == 'freecell') {
        final card = freecells[sourceLocation.index]!;
        foundations[targetLocation.index] = card.value;
        freecells[sourceLocation.index] = null;
      }
      
    } else if (targetLocation.type == 'column') {
      if (sourceLocation.type == 'freecell') {
        if (!canMoveToColumn(sourceCard, targetLocation.index)) {
          return MoveResult(success: false, error: 'Cannot move card to column');
        }
        columns[targetLocation.index].add(freecells[sourceLocation.index]!);
        freecells[sourceLocation.index] = null;
      }
    }

    moveCount++;
    saveGameState();
    
    return MoveResult(
      success: true,
      gameState: getGameState(),
      isWon: checkWin(),
    );
  }

  MoveResult executeDoubleClick(GameLocation location) {
    final card = getCard(location);
    if (card == null) {
      return MoveResult(success: false, error: 'No card at location');
    }

    if (location.type == 'column') {
      final columnCards = columns[location.index];
      final cardIndex = location.cardIndex ?? columnCards.length - 1;
      if (cardIndex != columnCards.length - 1) {
        return MoveResult(success: false, error: 'Can only double-click top card in column');
      }
    }

    for (int i = 0; i < 4; i++) {
      if (canMoveToFoundation(card, i)) {
        return executeMove(location, GameLocation(type: 'foundation', index: i));
      }
    }

    // If double-clicking from freecell, try empty columns
    if (location.type == 'freecell') {
      for (int i = 0; i < 8; i++) {
        if (columns[i].isEmpty) {
          return executeMove(location, GameLocation(type: 'column', index: i));
        }
      }
    } else {
      // If double-clicking from column, try freecells as fallback
      for (int i = 0; i < 4; i++) {
        if (freecells[i] == null) {
          return executeMove(location, GameLocation(type: 'freecell', index: i));
        }
      }
    }

    return MoveResult(success: false, error: 'No valid moves available');
  }

  bool checkWin() {
    final totalFoundationCards = foundations.reduce((sum, topRank) => sum + topRank);
    return totalFoundationCards == 52;
  }

  bool isSafeToAutoMove(Card card) {
    if (card.rank == 'A' || card.rank == '2') {
      return true;
    }
    
    final twoLowerValue = card.value - 2;
    if (twoLowerValue < 1) return true;
    
    final oppositeColors = card.color == 'red' ? ['clubs', 'spades'] : ['hearts', 'diamonds'];
    
    for (final suit in oppositeColors) {
      final foundationIndex = suits.indexOf(suit);
      final foundationTopRank = foundations[foundationIndex];
      
      if (foundationTopRank < twoLowerValue) {
        return false;
      }
    }
    
    return true;
  }

  bool isCardInPlay(String rank, String suit) {
    for (final column in columns) {
      if (column.any((card) => card.rank == rank && card.suit == suit)) {
        return true;
      }
    }
    
    for (final card in freecells) {
      if (card != null && card.rank == rank && card.suit == suit) {
        return true;
      }
    }
    
    return false;
  }

  List<Map<String, dynamic>> getAutoMoves() {
    final moves = <Map<String, dynamic>>[];
    
    for (int col = 0; col < 8; col++) {
      if (columns[col].isNotEmpty) {
        final card = columns[col].last;
        final foundationIndex = suits.indexOf(card.suit);
        
        if (canMoveToFoundation(card, foundationIndex) && isSafeToAutoMove(card)) {
          moves.add({
            'from': GameLocation(type: 'column', index: col),
            'to': GameLocation(type: 'foundation', index: foundationIndex),
            'card': card,
          });
        }
      }
    }
    
    for (int i = 0; i < 4; i++) {
      if (freecells[i] != null) {
        final card = freecells[i]!;
        final foundationIndex = suits.indexOf(card.suit);
        
        if (canMoveToFoundation(card, foundationIndex) && isSafeToAutoMove(card)) {
          moves.add({
            'from': GameLocation(type: 'freecell', index: i),
            'to': GameLocation(type: 'foundation', index: foundationIndex),
            'card': card,
          });
        }
      }
    }
    
    return moves;
  }

  MoveResult executeAutoMove() {
    final moves = getAutoMoves();
    if (moves.isNotEmpty) {
      final move = moves.first;
      return executeMove(move['from'] as GameLocation, move['to'] as GameLocation);
    }
    return MoveResult(success: false, error: 'No auto moves available');
  }
}