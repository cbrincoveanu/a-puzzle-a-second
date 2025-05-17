document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Failed to get canvas context!"); return; }

    let activePieceSet = [];
    let placedPieceInstances = [];

    let targetEmptyCell = { r: -1, c: -1 };

    let playableCellCoords = [];

    let currentSecondToDisplay = 0;

    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;

    const CANVAS_EFFECTIVE_BACKGROUND_COLOR = '#f0f0f0';

    function initializePlayableCellArea(gridSize, permanentlyBlockedCells) {
        const coords = generatePlayableCellCoordinates(gridSize, permanentlyBlockedCells);

        if (coords.length !== AVAILABLE_PLAYABLE_CELLS) {
            console.error(`CRITICAL: Playable cell count mismatch. Expected ${AVAILABLE_PLAYABLE_CELLS}, got ${coords.length}.`);
            return false;
        }
        if (coords.length !== 60) {
            console.error("CRITICAL: Expected exactly 60 playable cells for seconds display but found " + coords.length + ". Adjust GRID_SIZE or PERMANENTLY_BLOCKED_CELLS in config.js.");
            return false;
        }
        playableCellCoords = coords;
        console.log("Playable cell area initialized for Seconds display.");
        return true;
    }

    function updateTargetEmptyCellBasedOnTime() {
        if (!playableCellCoords || playableCellCoords.length !== 60) {
             console.error("Playable cell coordinates not correctly initialized for time mapping.");
             return;
        }

        const now = new Date();
        currentSecondToDisplay = now.getSeconds();

        let currentPlayableCellIndex = currentSecondToDisplay;

        if (currentPlayableCellIndex < 0 || currentPlayableCellIndex >= playableCellCoords.length) {
            console.error(`Calculated playable cell index ${currentPlayableCellIndex} is out of bounds! Defaulting to 0.`);
            currentPlayableCellIndex = 0;
        }
        targetEmptyCell = playableCellCoords[currentPlayableCellIndex];
    }

    function attemptNewPuzzleSolution() {
        const previousTargetR = targetEmptyCell.r;
        const previousTargetC = targetEmptyCell.c;
        const hadPreviousSolution = placedPieceInstances.length > 0;

        updateTargetEmptyCellBasedOnTime();

        const targetCellChanged = (targetEmptyCell.r !== previousTargetR || targetEmptyCell.c !== previousTargetC);

        if (!targetCellChanged && hadPreviousSolution) {
            redrawCanvasAll(ctx, canvas, placedPieceInstances,
                            targetEmptyCell,
                            GRID_SIZE, CELL_SIZE, BORDER_THICKNESS, PERMANENTLY_BLOCKED_CELLS,
                            currentSecondToDisplay, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
            return;
        }

        if (!activePieceSet || activePieceSet.length === 0) {
            console.error("No active piece set defined. Cannot solve.");
            placedPieceInstances = [];
        } else {
            console.log(`Solving for Second: ${currentSecondToDisplay} (Target: ${targetEmptyCell.r},${targetEmptyCell.c})`);
            let solutionResult;

            if (targetCellChanged && hadPreviousSolution && previousTargetR !== -1) {
                 solutionResult = findIncrementalSolution(
                     targetEmptyCell,
                     { r: previousTargetR, c: previousTargetC },
                     [...placedPieceInstances],
                     activePieceSet,
                     GRID_SIZE,
                     PERMANENTLY_BLOCKED_CELLS
                 );
             } else {
                 console.log("Performing initial or full re-solve.");
                 solutionResult = findFullSolution(
                     targetEmptyCell,
                     activePieceSet, GRID_SIZE, PERMANENTLY_BLOCKED_CELLS
                 );
             }

            if (solutionResult.success) {
                placedPieceInstances = solutionResult.placedPieces;
                console.log(`Solve type: ${solutionResult.type || 'unknown'}`);
            } else {
                placedPieceInstances = [];
                console.warn(`No solution found for second ${currentSecondToDisplay} (type: ${solutionResult.type || 'unknown'}). Board will be empty.`);
            }
        }

        redrawCanvasAll(ctx, canvas, placedPieceInstances,
                        targetEmptyCell,
                        GRID_SIZE, CELL_SIZE, BORDER_THICKNESS, PERMANENTLY_BLOCKED_CELLS,
                        currentSecondToDisplay, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
    }

    function initializeApp() {
        console.log("Initializing A-Puzzle-A-Second (Seconds Display - Reverted)...");

        if (!initializePlayableCellArea(GRID_SIZE, PERMANENTLY_BLOCKED_CELLS)) {
            ctx.font = "12px Arial"; ctx.fillStyle = "red"; ctx.textAlign = "center";
            ctx.fillText("Error: Failed to init playable cell area.", canvas.width / 2, canvas.height / 2);
            return;
        }

        activePieceSet = selectFixedPieceSet_deterministic(CELLS_TO_FILL, MASTER_PIECES);

        if (!activePieceSet || activePieceSet.length === 0) {
            console.error("Failed to initialize with a valid piece set. Puzzle will not run.");
             ctx.font = "16px Arial"; ctx.fillStyle = "red"; ctx.textAlign = "center";
            ctx.fillText("Error: Could not create piece set.", canvas.width / 2, canvas.height / 2);
            return;
        }

        updateTargetEmptyCellBasedOnTime();

        console.log("Performing initial full solve for startup (Seconds Display).");
        const initialResult = findFullSolution(
            targetEmptyCell,
            activePieceSet, GRID_SIZE, PERMANENTLY_BLOCKED_CELLS
        );

        if (initialResult.success) {
            placedPieceInstances = initialResult.placedPieces;
        } else {
            placedPieceInstances = [];
            console.warn(`No solution found for initial second ${currentSecondToDisplay}. Board will be empty.`);
        }

        redrawCanvasAll(ctx, canvas, placedPieceInstances,
                        targetEmptyCell,
                        GRID_SIZE, CELL_SIZE, BORDER_THICKNESS, PERMANENTLY_BLOCKED_CELLS,
                        currentSecondToDisplay, CANVAS_EFFECTIVE_BACKGROUND_COLOR);

        setInterval(attemptNewPuzzleSolution, 1000);
    }

    initializeApp();
});