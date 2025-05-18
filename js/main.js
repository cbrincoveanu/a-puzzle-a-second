// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Failed to get canvas context!"); return; }

    let puzzleStates = [];
    let precomputedSolutions = {};
    const CANVAS_EFFECTIVE_BACKGROUND_COLOR = '#f0f0f0';
    let precomputationFullyComplete = false;

    const ORIGINAL_CONFIG_CELL_SIZE = CELL_SIZE;
    const ORIGINAL_CONFIG_BORDER_THICKNESS = BORDER_THICKNESS;

    let currentDynamicCellSize = ORIGINAL_CONFIG_CELL_SIZE;
    let currentDynamicBorderThickness = ORIGINAL_CONFIG_BORDER_THICKNESS;

    let totalPuzzleCellsWide = 0;
    let totalPuzzleCellsHigh = 0;

    function calculateTotalPuzzleDimensions() {
        totalPuzzleCellsWide = 0;
        totalPuzzleCellsHigh = 0;
        PUZZLE_CONFIGS.forEach(config => {
            totalPuzzleCellsHigh = Math.max(totalPuzzleCellsHigh, config.canvasOffset.r + config.gridSize);
            totalPuzzleCellsWide = Math.max(totalPuzzleCellsWide, config.canvasOffset.c + config.gridSize);
        });
    }

    function resizeAndRedrawCanvas() {
        const padding = 20;
        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - (document.querySelector('h1')?.offsetHeight || 60) - padding - 40;

        if (totalPuzzleCellsWide === 0 || totalPuzzleCellsHigh === 0) {
            console.warn("Total puzzle dimensions not calculated yet. Skipping resize.");
            return;
        }

        const cellSizeBasedOnWidth = availableWidth / totalPuzzleCellsWide;
        const cellSizeBasedOnHeight = availableHeight / totalPuzzleCellsHigh;

        currentDynamicCellSize = Math.floor(Math.min(cellSizeBasedOnWidth, cellSizeBasedOnHeight));

        currentDynamicCellSize = Math.max(10, currentDynamicCellSize);
        currentDynamicCellSize = Math.min(ORIGINAL_CONFIG_CELL_SIZE, currentDynamicCellSize);

        currentDynamicBorderThickness = Math.max(1, Math.round(ORIGINAL_CONFIG_BORDER_THICKNESS * (currentDynamicCellSize / ORIGINAL_CONFIG_CELL_SIZE)));
        currentDynamicBorderThickness = Math.min(ORIGINAL_CONFIG_BORDER_THICKNESS, Math.max(1, currentDynamicBorderThickness));

        canvas.width = totalPuzzleCellsWide * currentDynamicCellSize;
        canvas.height = totalPuzzleCellsHigh * currentDynamicCellSize;

        console.log(`Resized. New Cell Size: ${currentDynamicCellSize}, Canvas: ${canvas.width}x${canvas.height}`);

        redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
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

    function updateTargetEmptyCellForPuzzle(puzzleState, now) {
        const config = puzzleState.config;
        if (!puzzleState.playableCellCoords || puzzleState.playableCellCoords.length === 0) {
            puzzleState.targetEmptyCell = {r: -1, c: -1};
            puzzleState.currentTimeValue = 0;
            console.warn(`(${config.id}) Playable cell coords not available for updateTargetEmptyCellForPuzzle.`);
            return;
        }

        let timeValue;
        switch (config.timeUnit) {
            case 'H': timeValue = now.getHours(); break;
            case 'M': timeValue = now.getMinutes(); break;
            case 'S': timeValue = now.getSeconds(); break;
            default:
                console.error(`(${config.id}) Unknown time unit: ${config.timeUnit}`);
                puzzleState.targetEmptyCell = {r: -1, c: -1};
                puzzleState.currentTimeValue = 0;
                return;
        }
        puzzleState.currentTimeValue = timeValue;

        let currentPlayableCellIndex = timeValue;

        if (currentPlayableCellIndex < 0 || currentPlayableCellIndex >= puzzleState.playableCellCoords.length) {
            console.warn(`(${config.id}) Calculated playable cell index ${currentPlayableCellIndex} for time ${timeValue} is out of bounds (max: ${puzzleState.playableCellCoords.length -1}). Defaulting to 0.`);
            currentPlayableCellIndex = 0;
        }

        if (currentPlayableCellIndex >= 0 && currentPlayableCellIndex < puzzleState.playableCellCoords.length) {
            puzzleState.targetEmptyCell = puzzleState.playableCellCoords[currentPlayableCellIndex];
        } else {
            console.error(`(${config.id}) Fallback playable cell index ${currentPlayableCellIndex} is still invalid. Playable coords length: ${puzzleState.playableCellCoords.length}`);
            puzzleState.targetEmptyCell = {r: -1, c: -1};
        }
    }

    function solveAndStore(pState, timeValueToSolve) {
        const config = pState.config;
        if (timeValueToSolve < 0 || timeValueToSolve > config.maxTimeValue || !pState.playableCellCoords || timeValueToSolve >= pState.playableCellCoords.length) {
            console.warn(`(${config.id}) Invalid timeValue ${timeValueToSolve} or missing playableCellCoords for solveAndStore.`);
            return null;
        }
        if (precomputedSolutions[config.id] && precomputedSolutions[config.id][timeValueToSolve] !== undefined) {
            return precomputedSolutions[config.id][timeValueToSolve];
        }
        const targetCellForSolve = pState.playableCellCoords[timeValueToSolve];
        const solutionResult = findFullSolution(
            targetCellForSolve,
            pState.activePieceSet,
            config.gridSize,
            config.permanentlyBlockedCells
        );
        if (!precomputedSolutions[config.id]) {
            precomputedSolutions[config.id] = {};
        }
        if (solutionResult.success) {
            precomputedSolutions[config.id][timeValueToSolve] = solutionResult.placedPieces;
            return solutionResult.placedPieces;
        } else {
            precomputedSolutions[config.id][timeValueToSolve] = null;
            console.warn(`(${config.id}) No solution found for time value ${timeValueToSolve} (Target: ${targetCellForSolve.r},${targetCellForSolve.c}).`);
            return null;
        }
    }

    async function prioritizedPrecomputation() {
        console.log("Starting prioritized pre-computation...");
        const precomputeStartTime = performance.now();
        const now = new Date();

        console.log("Precomputing current time state...");
        for (const pState of puzzleStates) {
            let currentTimeValue;
            switch (pState.config.timeUnit) {
                case 'H': currentTimeValue = now.getHours(); break;
                case 'M': currentTimeValue = now.getMinutes(); break;
                case 'S': currentTimeValue = now.getSeconds(); break;
            }
            solveAndStore(pState, currentTimeValue);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        console.log("Current time state precomputed.");
        runUpdateCycle();

        const NEAR_FUTURE_SECONDS = 5;
        const NEAR_FUTURE_MINUTES = 1;
        console.log("Precomputing near future states...");
        const secondsPuzzle = puzzleStates.find(p => p.id === 'seconds');
        if (secondsPuzzle) {
            for (let i = 1; i <= NEAR_FUTURE_SECONDS; i++) {
                const nextSecond = (now.getSeconds() + i) % 60;
                solveAndStore(secondsPuzzle, nextSecond);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        const minutesPuzzle = puzzleStates.find(p => p.id === 'minutes');
        if (minutesPuzzle) {
            for (let i = 1; i <= NEAR_FUTURE_MINUTES; i++) {
                const nextMinute = (now.getMinutes() + i) % 60;
                solveAndStore(minutesPuzzle, nextMinute);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        console.log("Near future states precomputed.");
        runUpdateCycle();

        console.log("Starting full background pre-computation...");
        for (const pState of puzzleStates) {
            const config = pState.config;
            console.log(`Full background pre-computation for ${config.id}...`);
            for (let timeValue = 0; timeValue <= config.maxTimeValue; timeValue++) {
                if (!(precomputedSolutions[config.id] && precomputedSolutions[config.id][timeValue] !== undefined)) {
                    solveAndStore(pState, timeValue);
                }
                if (timeValue % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            console.log(`Full background pre-computation for ${config.id} finished.`);
        }

        precomputationFullyComplete = true;
        const precomputeEndTime = performance.now();
        console.log(`All pre-computation (prioritized) finished in ${(precomputeEndTime - precomputeStartTime).toFixed(2)} ms.`);
    }

    function runUpdateCycle() {
        const now = new Date();
        let needsRedraw = false;

        puzzleStates.forEach(pState => {
            const oldTimeValue = pState.currentTimeValue;
            updateTargetEmptyCellForPuzzle(pState, now);

            if (pState.currentTimeValue !== oldTimeValue || (pState.placedPieceInstances.length === 0 && !(precomputedSolutions[pState.config.id] && precomputedSolutions[pState.config.id][pState.currentTimeValue]))) {
                needsRedraw = true;
            }

            let solution = null;
            if (precomputedSolutions[pState.config.id] && precomputedSolutions[pState.config.id][pState.currentTimeValue] !== undefined) {
                solution = precomputedSolutions[pState.config.id][pState.currentTimeValue];
            } else {
                if (!precomputationFullyComplete) {
                    console.warn(`(${pState.config.id}) Solution for ${pState.currentTimeValue} not yet precomputed. Solving on demand.`);
                    solution = solveAndStore(pState, pState.currentTimeValue);
                    needsRedraw = true;
                } else {
                     console.warn(`(${pState.config.id}) Precomputed solution for ${pState.currentTimeValue} missing after full precomputation.`);
                }
            }

            if (pState.placedPieceInstances !== solution && solution !== null) {
                 pState.placedPieceInstances = solution || [];
                 needsRedraw = true;
            } else if (solution === null && pState.placedPieceInstances.length > 0) {
                 pState.placedPieceInstances = [];
                 needsRedraw = true;
            }
        });

        if (needsRedraw) {
            redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR);
        }
    }

    function initializeApp() {
        console.log("Initializing A-Puzzle-A-Time...");
        calculateTotalPuzzleDimensions();

        PUZZLE_CONFIGS.forEach(config => {
            const currentPuzzleState = {
                id: config.id, config: config, activePieceSet: [], placedPieceInstances: [],
                targetEmptyCell: { r: -1, c: -1 }, playableCellCoords: [],
                currentTimeValue: -1, isValid: true
            };
            if (!initializePlayableCellAreaForPuzzle(currentPuzzleState)) {
                currentPuzzleState.isValid = false;
            } else {
                currentPuzzleState.activePieceSet = selectFixedPieceSet_deterministic(
                    config.cellsToFill, MASTER_PIECES, config.pieceSelectionPreference
                );
                if (!currentPuzzleState.activePieceSet || currentPuzzleState.activePieceSet.length === 0) {
                    console.error(`(${config.id}) Failed to select piece set.`);
                    currentPuzzleState.isValid = false;
                }
            }
            if (currentPuzzleState.isValid) {
                precomputedSolutions[config.id] = {};
            }
            puzzleStates.push(currentPuzzleState);
        });

        puzzleStates = puzzleStates.filter(pState => pState.isValid);

        if (puzzleStates.length === 0) {
            console.error("No puzzles initialized successfully.");
            ctx.font = "16px Arial"; ctx.fillStyle = "red"; ctx.textAlign = "center";
            ctx.fillText("Error: Could not initialize any puzzles.", canvas.width / 2, canvas.height / 2);
            return;
        }
        if (puzzleStates.length !== PUZZLE_CONFIGS.length) {
            console.warn(`Some puzzles failed to initialize.`);
        }

        resizeAndRedrawCanvas();

        window.addEventListener('resize', debounce(resizeAndRedrawCanvas, 250));

        setInterval(runUpdateCycle, 1000);

        prioritizedPrecomputation().catch(err => {
            console.error("Error during prioritized pre-computation:", err);
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    initializeApp();
});