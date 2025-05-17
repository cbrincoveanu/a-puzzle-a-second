document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Failed to get canvas context!"); return; }

    let puzzleStates = [];

    const CANVAS_EFFECTIVE_BACKGROUND_COLOR = '#f0f0f0';

    function setupCanvasDimensions() {
        let maxTotalRows = 0;
        let maxTotalCols = 0;

        PUZZLE_CONFIGS.forEach(config => {
            maxTotalRows = Math.max(maxTotalRows, config.canvasOffset.r + config.gridSize);
            maxTotalCols = Math.max(maxTotalCols, config.canvasOffset.c + config.gridSize);
        });

        canvas.width = maxTotalCols * CELL_SIZE;
        canvas.height = maxTotalRows * CELL_SIZE;
        console.log(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
    }

    function initializePlayableCellAreaForPuzzle(puzzleState) {
        const config = puzzleState.config;
        const coords = generatePlayableCellCoordinates(config.gridSize, config.permanentlyBlockedCells);

        if (coords.length !== config.availablePlayableCells) {
            console.error(`CRITICAL (${config.id}): Playable cell count mismatch. Expected ${config.availablePlayableCells}, got ${coords.length}.`);
            return false;
        }
        if (coords.length < config.maxTimeValue + 1) {
            console.error(`CRITICAL (${config.id}): Not enough playable cells (${coords.length}) to represent all time values up to ${config.maxTimeValue}. Needs ${config.maxTimeValue + 1}.`);
            return false;
        }
        puzzleState.playableCellCoords = coords;
        console.log(`Playable cell area initialized for ${config.id}. Count: ${coords.length}`);
        return true;
    }

    function updateTargetEmptyCellForPuzzle(puzzleState) {
        const config = puzzleState.config;
        if (!puzzleState.playableCellCoords || puzzleState.playableCellCoords.length === 0) {
            console.error(`(${config.id}) Playable cell coordinates not initialized for time mapping.`);
            return;
        }

        const now = new Date();
        let timeValue;
        switch (config.timeUnit) {
            case 'H': timeValue = now.getHours(); break;
            case 'M': timeValue = now.getMinutes(); break;
            case 'S': timeValue = now.getSeconds(); break;
            default: console.error(`Unknown time unit: ${config.timeUnit}`); return;
        }
        puzzleState.currentTimeValue = timeValue;

        let currentPlayableCellIndex = timeValue;

        if (currentPlayableCellIndex < 0 || currentPlayableCellIndex >= puzzleState.playableCellCoords.length) {
            console.error(`(${config.id}) Calculated playable cell index ${currentPlayableCellIndex} for time ${timeValue} is out of bounds! Defaulting to 0.`);
            currentPlayableCellIndex = 0;
        }
        puzzleState.targetEmptyCell = puzzleState.playableCellCoords[currentPlayableCellIndex];
    }

    function runUpdateCycle() {
        let anyPuzzleChanged = false;

        puzzleStates.forEach(pState => {
            const config = pState.config;
            const previousTargetR = pState.targetEmptyCell.r;
            const previousTargetC = pState.targetEmptyCell.c;
            const hadPreviousSolution = pState.placedPieceInstances.length > 0;

            updateTargetEmptyCellForPuzzle(pState);

            const targetCellChanged = (pState.targetEmptyCell.r !== previousTargetR || pState.targetEmptyCell.c !== previousTargetC);

            if (!targetCellChanged && hadPreviousSolution) {
                return;
            }
            anyPuzzleChanged = true;

            if (!pState.activePieceSet || pState.activePieceSet.length === 0) {
                console.error(`(${config.id}) No active piece set defined. Cannot solve.`);
                pState.placedPieceInstances = [];
            } else {
                console.log(`(${config.id}) Solving for ${config.timeUnit}: ${pState.currentTimeValue} (Target: ${pState.targetEmptyCell.r},${pState.targetEmptyCell.c})`);
                let solutionResult;

                if (targetCellChanged && hadPreviousSolution && previousTargetR !== -1) {
                    solutionResult = findIncrementalSolution(
                        pState.targetEmptyCell,
                        { r: previousTargetR, c: previousTargetC },
                        [...pState.placedPieceInstances],
                        pState.activePieceSet,
                        config.gridSize,
                        config.permanentlyBlockedCells
                    );
                } else {
                    console.log(`(${config.id}) Performing initial or full re-solve.`);
                    solutionResult = findFullSolution(
                        pState.targetEmptyCell,
                        pState.activePieceSet,
                        config.gridSize,
                        config.permanentlyBlockedCells
                    );
                }

                if (solutionResult.success) {
                    pState.placedPieceInstances = solutionResult.placedPieces;
                    console.log(`(${config.id}) Solve type: ${solutionResult.type || 'unknown'}`);
                } else {
                    pState.placedPieceInstances = [];
                    console.warn(`(${config.id}) No solution found for ${config.timeUnit} ${pState.currentTimeValue} (type: ${solutionResult.type || 'unknown'}). Board will be empty.`);
                }
            }
        });

        redrawAllPuzzles(ctx, canvas, puzzleStates, CELL_SIZE, BORDER_THICKNESS, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
    }

    function initializeApp() {
        console.log("Initializing A-Puzzle-A-Time...");
        setupCanvasDimensions();

        PUZZLE_CONFIGS.forEach(config => {
            const currentPuzzleState = {
                id: config.id,
                config: config,
                activePieceSet: [],
                placedPieceInstances: [],
                targetEmptyCell: { r: -1, c: -1 },
                playableCellCoords: [],
                currentTimeValue: 0,
            };

            if (!initializePlayableCellAreaForPuzzle(currentPuzzleState)) {
                return;
            }

            currentPuzzleState.activePieceSet = selectFixedPieceSet_deterministic(config.cellsToFill, MASTER_PIECES, config.pieceSelectionPreference);
            if (!currentPuzzleState.activePieceSet || currentPuzzleState.activePieceSet.length === 0) {
                console.error(`(${config.id}) Failed to initialize with a valid piece set. Puzzle will not run.`);
                return;
            }

            updateTargetEmptyCellForPuzzle(currentPuzzleState);

            console.log(`(${config.id}) Performing initial full solve for startup.`);
            const initialResult = findFullSolution(
                currentPuzzleState.targetEmptyCell,
                currentPuzzleState.activePieceSet,
                config.gridSize,
                config.permanentlyBlockedCells
            );

            if (initialResult.success) {
                currentPuzzleState.placedPieceInstances = initialResult.placedPieces;
            } else {
                currentPuzzleState.placedPieceInstances = [];
                console.warn(`(${config.id}) No solution found for initial time. Board will be empty.`);
            }
            puzzleStates.push(currentPuzzleState);
        });

        if (puzzleStates.length !== PUZZLE_CONFIGS.length) {
            console.error("Not all puzzles initialized successfully. Check logs.");
        }

        redrawAllPuzzles(ctx, canvas, puzzleStates, CELL_SIZE, BORDER_THICKNESS, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
        setInterval(runUpdateCycle, 1000);
    }

    initializeApp();
});