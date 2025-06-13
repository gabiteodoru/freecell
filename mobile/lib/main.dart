import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'freecell_engine.dart' as engine;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FreeCell Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const FreeCellGame(),
    );
  }
}

class FreeCellGame extends StatefulWidget {
  const FreeCellGame({super.key});

  @override
  State<FreeCellGame> createState() => _FreeCellGameState();
}

class _FreeCellGameState extends State<FreeCellGame> {
  late engine.FreeCellEngine gameEngine;
  engine.GameState? gameState;
  engine.Card? selectedCard;
  engine.GameLocation? selectedLocation;
  int lastPressTime = 0;
  engine.Card? lastPressedCard;
  Timer? _autoMoveTimer;

  @override
  void initState() {
    super.initState();
    gameEngine = engine.FreeCellEngine();
    newGame();
  }

  @override
  void dispose() {
    _autoMoveTimer?.cancel();
    super.dispose();
  }

  void newGame() {
    _autoMoveTimer?.cancel();
    setState(() {
      gameState = gameEngine.newGame();
      selectedCard = null;
      selectedLocation = null;
    });
    _scheduleAutoMove();
  }

  void _scheduleAutoMove() {
    _autoMoveTimer?.cancel();
    _autoMoveTimer = Timer(const Duration(milliseconds: 300), () {
      _executeAutoMove();
    });
  }

  void _executeAutoMove() {
    final result = gameEngine.executeAutoMove();
    if (result.success) {
      setState(() {
        gameState = result.gameState;
      });
      if (result.isWon == true) {
        showWinDialog();
      } else {
        // Schedule another auto-move if this one succeeded
        _scheduleAutoMove();
      }
    }
  }

  void handleCardPress(engine.Card card, engine.GameLocation location) {
    final currentTime = DateTime.now().millisecondsSinceEpoch;
    final isDoubleClick = lastPressedCard != null &&
        lastPressedCard!.suit == card.suit &&
        lastPressedCard!.rank == card.rank &&
        currentTime - lastPressTime < 500;

    lastPressTime = currentTime;
    lastPressedCard = card;

    if (isDoubleClick) {
      handleCardDoublePress(location);
      return;
    }

    if (selectedCard != null && selectedLocation != null) {
      if (selectedCard!.suit == card.suit && selectedCard!.rank == card.rank) {
        // Deselect current card
        setState(() {
          selectedCard = null;
          selectedLocation = null;
        });
      } else {
        // Attempt move
        final result = gameEngine.executeMove(selectedLocation!, location);
        if (result.success) {
          setState(() {
            gameState = result.gameState;
            selectedCard = null;
            selectedLocation = null;
          });
          if (result.isWon == true) {
            showWinDialog();
          } else {
            _scheduleAutoMove();
          }
        } else {
          // Move failed, select new card
          setState(() {
            selectedCard = card;
            selectedLocation = location;
          });
        }
      }
    } else {
      // Select card
      setState(() {
        selectedCard = card;
        selectedLocation = location;
      });
    }
  }

  void handleCardDoublePress(engine.GameLocation location) {
    final result = gameEngine.executeDoubleClick(location);
    if (result.success) {
      setState(() {
        gameState = result.gameState;
        selectedCard = null;
        selectedLocation = null;
      });
      if (result.isWon == true) {
        showWinDialog();
      } else {
        _scheduleAutoMove();
      }
    }
  }

  void handleEmptySlotPress(engine.GameLocation location) {
    if (selectedCard != null && selectedLocation != null) {
      final result = gameEngine.executeMove(selectedLocation!, location);
      if (result.success) {
        setState(() {
          gameState = result.gameState;
          selectedCard = null;
          selectedLocation = null;
        });
        if (result.isWon == true) {
          showWinDialog();
        } else {
          _scheduleAutoMove();
        }
      }
    }
  }

  void handleUndo() {
    _autoMoveTimer?.cancel(); // Stop auto-move when user undoes
    final state = gameEngine.undo();
    if (state != null) {
      setState(() {
        gameState = state;
        selectedCard = null;
        selectedLocation = null;
      });
      // No auto-move after undo
    }
  }

  void handleRedo() {
    _autoMoveTimer?.cancel(); // Stop auto-move when user redoes
    final state = gameEngine.redo();
    if (state != null) {
      setState(() {
        gameState = state;
        selectedCard = null;
        selectedLocation = null;
      });
      // No auto-move after redo
    }
  }

  void handleAutoMove() {
    final result = gameEngine.executeAutoMove();
    if (result.success) {
      setState(() {
        gameState = result.gameState;
      });
      if (result.isWon == true) {
        showWinDialog();
      } else {
        // Continue auto-moving
        Future.delayed(const Duration(milliseconds: 300), handleAutoMove);
      }
    }
  }

  void handleDragStart(engine.Card card, engine.GameLocation location) {
    // Optional: Visual feedback when drag starts
    setState(() {
      selectedCard = card;
      selectedLocation = location;
    });
  }

  void handleDrop(Map<String, dynamic> dragData, engine.GameLocation targetLocation) {
    final draggedCard = dragData['card'] as engine.Card;
    final sourceLocation = dragData['location'] as engine.GameLocation;
    
    final result = gameEngine.executeMove(sourceLocation, targetLocation);
    if (result.success) {
      setState(() {
        gameState = result.gameState;
        selectedCard = null;
        selectedLocation = null;
      });
      if (result.isWon == true) {
        showWinDialog();
      } else {
        _scheduleAutoMove();
      }
    }
  }

  void showWinDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Congratulations!'),
        content: const Text('You won the game!'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              newGame();
            },
            child: const Text('New Game'),
          ),
        ],
      ),
    );
  }

  bool isCardSelected(engine.Card card, engine.GameLocation location) {
    if (selectedCard == null || selectedLocation == null) return false;
    return selectedCard!.suit == card.suit && selectedCard!.rank == card.rank;
  }

  @override
  Widget build(BuildContext context) {
    if (gameState == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = ((screenWidth - 40) / 8).clamp(30.0, double.infinity); // Ensure minimum width
    final cardHeight = cardWidth * 1.4;

    return Scaffold(
      backgroundColor: const Color(0xFF0F4C3A),
      appBar: AppBar(
        title: const Text('FreeCell'),
        backgroundColor: const Color(0xFF0F4C3A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(
              child: Text(
                'Moves: ${gameState?.moveCount ?? 0}',
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('FreeCell Solitaire'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Version: 1.0.0'),
                    const SizedBox(height: 8),
                    const Text('© 2025 Gabi Teodoru'),
                    const Text('Open Source Learning Tool'),
                    const SizedBox(height: 16),
                    const Text('An educational project showcasing modern game development techniques.'),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () async {
                        final url = Uri.parse('https://github.com/gabiteodoru/freecell');
                        try {
                          await launchUrl(url, mode: LaunchMode.externalApplication);
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Could not open GitHub link')),
                          );
                        }
                      },
                      child: const Text(
                        'View source code on GitHub:\ngithub.com/gabiteodoru/freecell',
                        style: TextStyle(
                          color: Colors.blue,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Close'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(10),
          child: Column(
            children: [
              // Header
              const SizedBox(height: 10),

              // Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  ElevatedButton(
                    onPressed: newGame,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    child: const Text(
                      'New Game',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: gameEngine.canUndo() ? handleUndo : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: gameEngine.canUndo() ? Colors.green : Colors.grey,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    child: const Text(
                      'Undo',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: gameEngine.canRedo() ? handleRedo : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: gameEngine.canRedo() ? Colors.green : Colors.grey,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    child: const Text(
                      'Redo',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: handleAutoMove,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    child: const Text(
                      'Auto Move',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Top row: Free cells and Foundations
              Row(
                children: [
                  // Free cells
                  Expanded(
                    child: Column(
                      children: [
                        const Text(
                          'Free Cells',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 5),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: List.generate(4, (index) {
                            final card = gameState!.freecells[index];
                            return Flexible(
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 1),
                                child: card != null
                                  ? CardWidget(
                                      card: card,
                                      width: cardWidth * 0.9,
                                      height: cardHeight * 0.9,
                                      selected: isCardSelected(card, engine.GameLocation(type: 'freecell', index: index)),
                                      onTap: () => handleCardPress(card, engine.GameLocation(type: 'freecell', index: index)),
                                      location: engine.GameLocation(type: 'freecell', index: index),
                                      onDragStart: handleDragStart,
                                    )
                                  : EmptySlotWidget(
                                      width: cardWidth * 0.9,
                                      height: cardHeight * 0.9,
                                      onTap: () => handleEmptySlotPress(engine.GameLocation(type: 'freecell', index: index)),
                                      location: engine.GameLocation(type: 'freecell', index: index),
                                      onDrop: handleDrop,
                                    ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Foundations
                  Expanded(
                    child: Column(
                      children: [
                        const Text(
                          'Foundations',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 5),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: List.generate(4, (index) {
                            final foundationRank = gameState!.foundations[index];
                            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                            const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

                            return Flexible(
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 1),
                                child: foundationRank > 0
                                  ? CardWidget(
                                      card: engine.Card(
                                        suit: suits[index],
                                        rank: ranks[foundationRank - 1],
                                        color: (suits[index] == 'hearts' || suits[index] == 'diamonds') ? 'red' : 'black',
                                        value: foundationRank,
                                      ),
                                      width: cardWidth * 0.9,
                                      height: cardHeight * 0.9,
                                      selected: false,
                                      onTap: () => handleEmptySlotPress(engine.GameLocation(type: 'foundation', index: index)),
                                      location: engine.GameLocation(type: 'foundation', index: index),
                                      onDragStart: handleDragStart,
                                    )
                                  : EmptySlotWidget(
                                      width: cardWidth * 0.9,
                                      height: cardHeight * 0.9,
                                      label: suits[index] == 'hearts'
                                          ? '♥'
                                          : suits[index] == 'diamonds'
                                              ? '♦'
                                              : suits[index] == 'clubs'
                                                  ? '♣'
                                                  : '♠',
                                      onTap: () => handleEmptySlotPress(engine.GameLocation(type: 'foundation', index: index)),
                                      location: engine.GameLocation(type: 'foundation', index: index),
                                      onDrop: handleDrop,
                                    ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Tableau
              Column(
                children: [
                  const Text(
                    'Tableau',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 5),
                  SizedBox(
                    height: cardHeight + 200,
                    child: Row(
                      children: List.generate(8, (columnIndex) {
                        final column = gameState!.columns[columnIndex];
                        return Expanded(
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 1),
                            child: column.isEmpty
                                ? EmptySlotWidget(
                                    width: cardWidth * 0.95,
                                    height: cardHeight * 0.95,
                                    onTap: () => handleEmptySlotPress(engine.GameLocation(type: 'column', index: columnIndex)),
                                    location: engine.GameLocation(type: 'column', index: columnIndex),
                                    onDrop: handleDrop,
                                  )
                                : DragTarget<Map<String, dynamic>>(
                                    onWillAcceptWithDetails: (details) {
                                      return details.data['card'] != null && details.data['location'] != null;
                                    },
                                    onAcceptWithDetails: (details) {
                                      handleDrop(details.data, engine.GameLocation(type: 'column', index: columnIndex));
                                    },
                                    builder: (context, candidateData, rejectedData) {
                                      return Stack(
                                        children: List.generate(column.length, (cardIndex) {
                                          final card = column[cardIndex];
                                          return Positioned(
                                            top: cardIndex * 20.0,
                                            child: CardWidget(
                                              card: card,
                                              width: cardWidth * 0.95,
                                              height: cardHeight * 0.95,
                                              selected: isCardSelected(card, engine.GameLocation(type: 'column', index: columnIndex, cardIndex: cardIndex)),
                                              onTap: () => handleCardPress(card, engine.GameLocation(type: 'column', index: columnIndex, cardIndex: cardIndex)),
                                              location: engine.GameLocation(type: 'column', index: columnIndex, cardIndex: cardIndex),
                                              onDragStart: handleDragStart,
                                            ),
                                          );
                                        }),
                                      );
                                    },
                                  ),
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CardWidget extends StatelessWidget {
  final engine.Card card;
  final double width;
  final double height;
  final bool selected;
  final VoidCallback onTap;
  final engine.GameLocation? location;
  final Function(engine.Card, engine.GameLocation)? onDragStart;
  final Function(engine.Card, engine.GameLocation, DragTargetDetails)? onDragEnd;

  const CardWidget({
    super.key,
    required this.card,
    required this.width,
    required this.height,
    required this.selected,
    required this.onTap,
    this.location,
    this.onDragStart,
    this.onDragEnd,
  });

  Widget _buildCard() {
    const suitSymbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠',
    };

    final suitColor = card.color == 'red' ? Colors.red : Colors.black;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: selected ? Colors.yellow.shade200 : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey),
      ),
      padding: const EdgeInsets.all(2),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '${card.rank}${suitSymbols[card.suit]}',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: suitColor,
            ),
          ),
          Text(
            suitSymbols[card.suit]!,
            style: TextStyle(
              fontSize: 16,
              color: suitColor,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (location != null && onDragStart != null) {
      return Draggable<Map<String, dynamic>>(
        data: {
          'card': card,
          'location': location,
        },
        feedback: Material(
          color: Colors.transparent,
          child: Transform.scale(
            scale: 1.1,
            child: _buildCard(),
          ),
        ),
        childWhenDragging: Opacity(
          opacity: 0.3,
          child: _buildCard(),
        ),
        onDragStarted: () {
          onDragStart!(card, location!);
        },
        child: GestureDetector(
          onTap: onTap,
          child: _buildCard(),
        ),
      );
    } else {
      return GestureDetector(
        onTap: onTap,
        child: _buildCard(),
      );
    }
  }
}

class EmptySlotWidget extends StatefulWidget {
  final double width;
  final double height;
  final String? label;
  final VoidCallback onTap;
  final engine.GameLocation? location;
  final Function(Map<String, dynamic>, engine.GameLocation)? onDrop;

  const EmptySlotWidget({
    super.key,
    required this.width,
    required this.height,
    this.label,
    required this.onTap,
    this.location,
    this.onDrop,
  });

  @override
  State<EmptySlotWidget> createState() => _EmptySlotWidgetState();
}

class _EmptySlotWidgetState extends State<EmptySlotWidget> {
  bool _isHovering = false;

  Widget _buildSlot() {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _isHovering ? Colors.yellow : Colors.white,
          width: 2,
          style: BorderStyle.solid,
        ),
        color: _isHovering ? Colors.yellow.withOpacity(0.2) : Colors.transparent,
      ),
      child: widget.label != null
          ? Center(
              child: Text(
                widget.label!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
            )
          : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.location != null && widget.onDrop != null) {
      return DragTarget<Map<String, dynamic>>(
        onWillAcceptWithDetails: (details) {
          return details.data['card'] != null && details.data['location'] != null;
        },
        onAcceptWithDetails: (details) {
          widget.onDrop!(details.data, widget.location!);
          setState(() {
            _isHovering = false;
          });
        },
        onMove: (details) {
          if (!_isHovering) {
            setState(() {
              _isHovering = true;
            });
          }
        },
        onLeave: (data) {
          setState(() {
            _isHovering = false;
          });
        },
        builder: (context, candidateData, rejectedData) {
          return GestureDetector(
            onTap: widget.onTap,
            child: _buildSlot(),
          );
        },
      );
    } else {
      return GestureDetector(
        onTap: widget.onTap,
        child: _buildSlot(),
      );
    }
  }
}