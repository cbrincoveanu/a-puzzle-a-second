document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Failed to get canvas context!"); return; }

    let puzzleStates = [];
    let precomputedSolutions = {};
    const CANVAS_EFFECTIVE_BACKGROUND_COLOR = '#f0f0f0';

    const ORIGINAL_CONFIG_CELL_SIZE = CELL_SIZE;
    const ORIGINAL_CONFIG_BORDER_THICKNESS = BORDER_THICKNESS;

    let currentDynamicCellSize = ORIGINAL_CONFIG_CELL_SIZE;
    let currentDynamicBorderThickness = ORIGINAL_CONFIG_BORDER_THICKNESS;
    let totalPuzzleCellsWide = 0;
    let totalPuzzleCellsHigh = 0;

    let animatingPieces = {};
    let animationFrameId = null;

    let isLoadingPuzzles = true;
    let precomputationProgress = 0;
    let totalPuzzlesToPrecompute = 0;
    let puzzlesPrecomputedCount = 0;

    function sigmoidEasing(t) {
        const k = 10;
        return 1 / (1 + Math.exp(-k * (t - 0.5)));
    }

    function animate(timestamp) {
        let animationInProgress = false;

        puzzleStates.forEach(pState => {
            const puzzleId = pState.id;
            const piecesAnimatingForThisPuzzle = animatingPieces[puzzleId] || [];
            const stillAnimating = [];

            piecesAnimatingForThisPuzzle.forEach(animState => {
                if (!animState.startTime) animState.startTime = timestamp;
                const elapsed = timestamp - animState.startTime;
                let progress = Math.min(elapsed / animState.duration, 1);

                const easedProgress = sigmoidEasing(progress);
                if (progress < 1) {
                    animState.currentR = animState.startR + (animState.endR - animState.startR) * easedProgress;
                    animState.currentC = animState.startC + (animState.endC - animState.startC) * easedProgress;
                    let rotationDiff = animState.endRotation - animState.startRotation;
                    if (rotationDiff > 180) rotationDiff -= 360;
                    if (rotationDiff < -180) rotationDiff += 360;
                    animState.currentRotation = animState.startRotation + rotationDiff * easedProgress;
                    stillAnimating.push(animState);
                    animationInProgress = true;
                } else {
                    animState.currentR = animState.endR;
                    animState.currentC = animState.endC;
                    animState.currentRotation = animState.endRotation;
                }
            });
            animatingPieces[puzzleId] = stillAnimating;
        });

        redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoadingPuzzles, precomputationProgress);

        if (animationInProgress) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            animationFrameId = null;
        }
    }

    function startAnimationLoop() {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

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
        const topContainerHeight = document.getElementById('top-container')?.offsetHeight || 0;
        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - topContainerHeight - padding - 40;

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

        redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoadingPuzzles, precomputationProgress);
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
            if (isLoadingPuzzles) {
                 puzzlesPrecomputedCount++;
                 precomputationProgress = (puzzlesPrecomputedCount / totalPuzzlesToPrecompute) * 100;
                 if (!animationFrameId) {
                     redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoadingPuzzles, precomputationProgress);
                 }
            }
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
        } else {
            precomputedSolutions[config.id][timeValueToSolve] = null;
            console.warn(`(${config.id}) No solution found for time value ${timeValueToSolve} (Target: ${targetCellForSolve.r},${targetCellForSolve.c}).`);
        }

        if (isLoadingPuzzles) {
            puzzlesPrecomputedCount++;
            precomputationProgress = (puzzlesPrecomputedCount / totalPuzzlesToPrecompute) * 100;
            if (!animationFrameId) {
                redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoadingPuzzles, precomputationProgress);
            }
        }
        return solutionResult.success ? solutionResult.placedPieces : null;
    }

    function calculateTransitionAnimationStates(oldSolutionPieces, newSolutionPieces, puzzleId, duration) {
        const animationStates = [];
        const oldPiecesMap = new Map((oldSolutionPieces || []).map(p => [p.piece.id, p]));

        (newSolutionPieces || []).forEach(newP => {
            const oldP = oldPiecesMap.get(newP.piece.id);
            const isNewOrMoved = !oldP ||
                                 oldP.r !== newP.r ||
                                 oldP.c !== newP.c ||
                                 (oldP.rotation || 0) !== (newP.rotation || 0) ||
                                 JSON.stringify(oldP.currentShape) !== JSON.stringify(newP.currentShape);

            if (isNewOrMoved) {
                animationStates.push({
                    pieceInstance: newP,
                    startR: oldP ? oldP.r : newP.r,
                    startC: oldP ? oldP.c : newP.c,
                    startRotation: oldP ? (oldP.rotation || 0) : (newP.rotation || 0),
                    endR: newP.r,
                    endC: newP.c,
                    endRotation: newP.rotation || 0,
                    currentR: oldP ? oldP.r : newP.r,
                    currentC: oldP ? oldP.c : newP.c,
                    currentRotation: oldP ? (oldP.rotation || 0) : (newP.rotation || 0),
                    startTime: 0,
                    duration: duration,
                    isInitialAppear: false,
                    isDisappearing: false
                });
            }
        });

        (oldSolutionPieces || []).forEach(oldP => {
            if (!(newSolutionPieces || []).some(newP => newP.piece.id === oldP.piece.id)) {
                animationStates.push({
                    pieceInstance: oldP,
                    startR: oldP.r, startC: oldP.c, startRotation: oldP.rotation || 0,
                    endR: oldP.r, endC: oldP.c, endRotation: oldP.rotation || 0,
                    currentR: oldP.r, currentC: oldP.c, currentRotation: oldP.rotation || 0,
                    startTime: 0, duration: duration, isInitialAppear: false, isDisappearing: true
                });
            }
        });
        return animationStates;
    }

    async function startFullPrecomputation() {
        isLoadingPuzzles = true;
        puzzlesPrecomputedCount = 0;
        totalPuzzlesToPrecompute = 0;
        puzzleStates.forEach(pState => {
            totalPuzzlesToPrecompute += (pState.config.maxTimeValue + 1);
        });
        precomputationProgress = 0;
        redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoading = true, loadingProgress = 0);

        console.log("Starting full pre-computation of all states...");
        const precomputeStartTime = performance.now();

        for (const pState of puzzleStates) {
            const config = pState.config;
            for (let timeValue = 0; timeValue <= config.maxTimeValue; timeValue++) {
                solveAndStore(pState, timeValue);
                if (timeValue % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }

        precomputationFullyComplete = true;
        isLoadingPuzzles = false;
        const precomputeEndTime = performance.now();
        console.log(`All pre-computation finished in ${(precomputeEndTime - precomputeStartTime).toFixed(2)} ms.`);

        runUpdateCycle();
    }

    function runUpdateCycle() {
        if (isLoadingPuzzles || animationFrameId) {
            if (!isLoadingPuzzles) {
                const nowForTargetCell = new Date();
                puzzleStates.forEach(pState => updateTargetEmptyCellForPuzzle(pState, nowForTargetCell));
            }
            return;
        }

        const now = new Date();
        let animationTriggeredThisCycle = false;
        let needsStaticRedraw = false;

        puzzleStates.forEach(pState => {
            const config = pState.config;
            const oldTimeValue = pState.currentTimeValue;
            const oldPlacedPieces = pState.placedPieceInstances ? [...pState.placedPieceInstances] : [];

            updateTargetEmptyCellForPuzzle(pState, now);

            if (pState.currentTimeValue === oldTimeValue && oldPlacedPieces.length > 0) {
                 if (!animatingPieces[pState.id] || animatingPieces[pState.id].length === 0) {
                     needsStaticRedraw = true;
                 }
                 return;
            }

            let newSolution = null;
            if (precomputedSolutions[config.id] && precomputedSolutions[config.id][pState.currentTimeValue] !== undefined) {
                newSolution = precomputedSolutions[config.id][pState.currentTimeValue];
            } else {
                console.warn(`(${config.id}) Solution for ${pState.currentTimeValue} not found in precomputed. Attempting on-demand (should not happen if precomp complete).`);
                newSolution = solveAndStore(pState, pState.currentTimeValue);
            }
            const newSolutionWithRotation = newSolution ? newSolution.map(p => ({...p, rotation: 0})) : null;

            const currentVisualState = (animatingPieces[pState.id] && animatingPieces[pState.id].length > 0)
                ? animatingPieces[pState.id].map(anim => anim.pieceInstance)
                : oldPlacedPieces;

            if (newSolutionWithRotation && !areSolutionsEqual(currentVisualState, newSolutionWithRotation)) {
                animatingPieces[config.id] = calculateTransitionAnimationStates(
                    currentVisualState, newSolutionWithRotation, config.id, TRANSITION_ANIMATION_DURATION
                );
                pState.placedPieceInstances = newSolutionWithRotation;
                animationTriggeredThisCycle = true;
            } else if (!newSolutionWithRotation && currentVisualState.length > 0) {
                 animatingPieces[config.id] = calculateTransitionAnimationStates(
                     currentVisualState, null, config.id, TRANSITION_ANIMATION_DURATION
                 );
                 pState.placedPieceInstances = [];
                 animationTriggeredThisCycle = true;
            } else if (newSolutionWithRotation && currentVisualState.length === 0 && (!animatingPieces[pState.id] || animatingPieces[pState.id].length === 0)) {
                 pState.placedPieceInstances = newSolutionWithRotation;
                 needsStaticRedraw = true;
            } else if (!newSolutionWithRotation && currentVisualState.length === 0) {
            } else {
                 needsStaticRedraw = true;
            }
        });

        if (animationTriggeredThisCycle) {
            startAnimationLoop();
        } else if (needsStaticRedraw && !animationFrameId) {
            redrawAllPuzzles(ctx, canvas, puzzleStates, currentDynamicCellSize, currentDynamicBorderThickness, CANVAS_EFFECTIVE_BACKGROUND_COLOR, animatingPieces, isLoadingPuzzles, precomputationProgress);
        }
    }

    function areSolutionsEqual(solution1, solution2) {
        if (!solution1 && !solution2) return true;
        if (!solution1 || !solution2) return false;
        if (solution1.length !== solution2.length) return false;

        const map1 = new Map(solution1.map(p => [p.piece.id, { r: p.r, c: p.c, shape: p.currentShape, rot: p.rotation || 0 }]));
        for (const p2 of solution2) {
            const p1Details = map1.get(p2.piece.id);
            if (!p1Details) return false;
            if (p1Details.r !== p2.r || p1Details.c !== p2.c ||
                JSON.stringify(p1Details.shape) !== JSON.stringify(p2.currentShape) ||
                p1Details.rot !== (p2.rotation || 0)) {
                return false;
            }
        }
        return true;
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
                animatingPieces[config.id] = [];
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

        startFullPrecomputation().catch(err => {
            console.error("Error during full pre-computation:", err);
            isLoadingPuzzles = false;
            runUpdateCycle();
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