const GRID_SIZE = 8;
const CELL_SIZE = 50;
const BORDER_THICKNESS = 2;

const PERMANENTLY_BLOCKED_CELLS = [
    { r: 0, c: 0 },
    { r: 0, c: GRID_SIZE - 1 },
    { r: GRID_SIZE - 1, c: 0 },
    { r: GRID_SIZE - 1, c: GRID_SIZE - 1 }
];

const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const AVAILABLE_PLAYABLE_CELLS = TOTAL_CELLS - PERMANENTLY_BLOCKED_CELLS.length;
const CELLS_TO_FILL = AVAILABLE_PLAYABLE_CELLS - 1;

const MIN_DESIRED_PIECE_SIZE = 2;
const END_GAME_THRESHOLD = 8;

const MASTER_PIECES = [
    { name: 'B6', shape: [[1,1,1],[1,1,1]], color: 'lightcoral', cellCount: 6 },
    { name: 'B5', shape: [[1,1,1],[1,1,0]], color: 'tomato', cellCount: 5 },
    { name: 'U5', shape: [[1, 0, 1], [1, 1, 1]], color: 'darkorchid', cellCount: 5 },
    { name: 'V5', shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: 'khaki', cellCount: 5 },
    { name: 'L5', shape: [[1,0],[1,0],[1,0],[1,1]], color: 'gold', cellCount: 5 },
    { name: 'F5', shape: [[1,0],[1,0],[1,1],[1,0]], color: 'sandybrown', cellCount: 5 },
    { name: 'Z5', shape: [[0,0,1],[1,1,1],[1,0,0]], color: 'orange', cellCount: 5 },
    { name: 'S5', shape: [[1,0],[1,0],[1,1],[0,1]], color: 'salmon', cellCount: 5 },
    { name: 'I4', shape: [[1], [1], [1], [1]], color: 'yellow', cellCount: 4 },
    { name: 'I3', shape: [[1], [1], [1]], color: 'limegreen', cellCount: 3 },
    { name: 'I2', shape: [[1, 1]], color: 'cyan', cellCount: 2 }
];