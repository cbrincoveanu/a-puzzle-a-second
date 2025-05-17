const CELL_SIZE = 32;
const BORDER_THICKNESS = 2;

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
    //{ name: 'L4', shape: [[1,0],[1,0],[1,1]], color: 'chartreuse', cellCount: 4 },
    { name: 'I3', shape: [[1], [1], [1]], color: 'limegreen', cellCount: 3 },
    { name: 'I2', shape: [[1, 1]], color: 'cyan', cellCount: 2 }
];

const PUZZLE_CONFIGS = [
    {
        id: 'hours',
        timeUnit: 'H',
        gridSize: 5,
        permanentlyBlockedCells: [
            { r: 4, c: 4 }
        ],
        canvasOffset: { r: 0, c: 0 },
        maxTimeValue: 23,
        pieceSelectionPreference: 'smallFirst',
    },
    {
        id: 'minutes',
        timeUnit: 'M',
        gridSize: 8,
        permanentlyBlockedCells: [
            { r: 0, c: 0 }, { r: 7, c: 0 },
            { r: 7, c: 1 }, { r: 7, c: 2 }
        ],
        canvasOffset: { r: 4, c: 3 },
        maxTimeValue: 59,
        pieceSelectionPreference: 'largeFirst',
    },
    {
        id: 'seconds',
        timeUnit: 'S',
        gridSize: 8,
        permanentlyBlockedCells: [
            { r: 0, c: 7 }, { r: 0, c: 6 },
            { r: 0, c: 5 }, { r: 0, c: 4 }
        ],
        canvasOffset: { r: 11, c: 2 }, 
        maxTimeValue: 59,
        pieceSelectionPreference: 'largeFirst',
    }
];

function calculateDerivedConfigProperties(configs) {
    configs.forEach(config => {
        config.totalCells = config.gridSize * config.gridSize;
        config.availablePlayableCells = config.totalCells - config.permanentlyBlockedCells.length;
        config.cellsToFill = config.availablePlayableCells - 1;
    });
}

calculateDerivedConfigProperties(PUZZLE_CONFIGS);
