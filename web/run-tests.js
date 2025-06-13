// Node.js runner for the same tests that work in HTML

// Import the engine
const FreeCellEngine = require('./freecell-engine.js');

// Make it globally available like in browser
global.FreeCellEngine = FreeCellEngine;

// Intercept console.log to show full error details
const originalLog = console.log;
console.log = (...args) => {
    // Show full error details for failed tests
    if (args[0] && args[0].includes('✗')) {
        originalLog(...args);
    } else {
        originalLog(...args);
    }
};

// Load and run the exact same test file
require('./freecell-tests.js');