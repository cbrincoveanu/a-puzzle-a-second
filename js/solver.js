function solveRecursive(
    availablePieceIndices, grid, currentPlacedList,
    getShapeOrientationsFunc, canPlaceFunc, placePieceOnGridFunc, removePieceFromGridFunc, findFirstEmptyCellFunc,
    currentActivePieceSet, currentGridSize
) {
    const firstEmpty = findFirstEmptyCellFunc(grid, currentGridSize);
    if (!firstEmpty) return true;

    for (const pieceIndex of availablePieceIndices) {
        const pieceToPlace = currentActivePieceSet[pieceIndex];
        const orientations = getShapeOrientationsFunc(pieceToPlace.masterPiece.shape);
        for (const currentShape of orientations) {
            for (let shapeR = 0; shapeR < currentShape.length; shapeR++) {
                for (let shapeC = 0; shapeC < currentShape[shapeR].length; shapeC++) {
                    if (currentShape[shapeR][shapeC] === 1) {
                        const r = firstEmpty.r - shapeR;
                        const c = firstEmpty.c - shapeC;
                        if (canPlaceFunc(currentShape, r, c, grid, currentGridSize)) {
                            const nextAvailablePieceIndices = new Set(availablePieceIndices);
                            nextAvailablePieceIndices.delete(pieceIndex);
                            placePieceOnGridFunc(currentShape, r, c, grid, pieceToPlace.id);
                            currentPlacedList.push({ piece: pieceToPlace, r: r, c: c, currentShape: currentShape });
                            if (solveRecursive(nextAvailablePieceIndices, grid, currentPlacedList,
                                getShapeOrientationsFunc, canPlaceFunc, placePieceOnGridFunc, removePieceFromGridFunc, findFirstEmptyCellFunc,
                                currentActivePieceSet, currentGridSize)) {
                                return true;
                            }
                            currentPlacedList.pop();
                            removePieceFromGridFunc(currentShape, r, c, grid);
                        }
                    }
                }
            }
        }
    }
    return false;
}

function findFullSolution(
    targetCell,
    currentActivePieceSet,
    currentGridSize,
    permanentlyBlockedCellsList
) {
    let gridForSolve = createInitialGridState(targetCell, currentGridSize, permanentlyBlockedCellsList);
    const tempPlacedList = [];
    const initialPieceSetIndices = new Set(currentActivePieceSet.map((_, index) => index));
    const startTime = performance.now();

    if (solveRecursive(
        initialPieceSetIndices, gridForSolve, tempPlacedList,
        getShapeOrientations, checkCanPlace, applyPieceToGrid, unapplyPieceFromGrid, findNextEmptyGridCell,
        currentActivePieceSet, currentGridSize
    )) {
        const endTime = performance.now();
        console.log(`Full Solve: Solution found in ${(endTime - startTime).toFixed(2)} ms.`);
        return { success: true, placedPieces: [...tempPlacedList], type: 'full_solve_success' };
    } else {
        const endTime = performance.now();
        console.log(`Full Solve: No solution found after ${(endTime - startTime).toFixed(2)} ms.`);
        return { success: false, placedPieces: [], type: 'full_solve_fail' };
    }
}

function isPieceAdjacentToHole(pieceInstance, grid, gridSize) {
    const pieceShape = pieceInstance.currentShape;
    const pieceR = pieceInstance.r;
    const pieceC = pieceInstance.c;

    for (let sr = 0; sr < pieceShape.length; sr++) {
        for (let sc = 0; sc < pieceShape[sr].length; sc++) {
            if (pieceShape[sr][sc] === 1) {
                const cellR = pieceR + sr;
                const cellC = pieceC + sc;
                const neighbors = [
                    { r: cellR - 1, c: cellC }, { r: cellR + 1, c: cellC },
                    { r: cellR, c: cellC - 1 }, { r: cellR, c: cellC + 1 }
                ];
                for (const neighbor of neighbors) {
                    if (neighbor.r >= 0 && neighbor.r < gridSize && neighbor.c >= 0 && neighbor.c < gridSize) {
                        if (grid[neighbor.r][neighbor.c] === null) return true;
                    }
                }
            }
        }
    }
    return false;
}

function findIncrementalSolution(
    newTargetCell,
    oldTargetCell,
    previousPlacedPieces,
    currentActivePieceSet,
    currentGridSize,
    permanentlyBlockedCellsList
) {
    console.log(`Incremental Escalation Solve attempt: new target (${newTargetCell.r},${newTargetCell.c}), old target (${oldTargetCell.r},${oldTargetCell.c})`);

    let gridConsideringNewState = createInitialGridState(newTargetCell, currentGridSize, permanentlyBlockedCellsList);

    const survivingPieceInstancesInitially = [];
    const initiallyDisplacedPieceIndices = new Set();
    let criticalErrorOccurred = false;

    previousPlacedPieces.forEach(pInst => {
        if (criticalErrorOccurred) return;
        const originalPieceIndex = currentActivePieceSet.findIndex(ap => ap.id === pInst.piece.id);
        if (originalPieceIndex === -1) {
             console.error("Critical error (Inc): Piece instance not found in active set. Forcing full re-solve.");
             currentActivePieceSet.forEach((_,idx) => initiallyDisplacedPieceIndices.add(idx));
             criticalErrorOccurred = true;
             return;
        }
        let coversNewTarget = false;
        for (let sr = 0; sr < pInst.currentShape.length; sr++) {
            if (coversNewTarget) break;
            for (let sc = 0; sc < pInst.currentShape[sr].length; sc++) {
                if (pInst.currentShape[sr][sc] === 1 &&
                    (pInst.r + sr) === newTargetCell.r && (pInst.c + sc) === newTargetCell.c) {
                    coversNewTarget = true; break;
                }
            }
        }
        if (coversNewTarget) {
            initiallyDisplacedPieceIndices.add(originalPieceIndex);
        } else {
            if (checkCanPlace(pInst.currentShape, pInst.r, pInst.c, gridConsideringNewState, currentGridSize)) {
                applyPieceToGrid(pInst.currentShape, pInst.r, pInst.c, gridConsideringNewState, pInst.piece.id);
                survivingPieceInstancesInitially.push(pInst);
            } else {
                initiallyDisplacedPieceIndices.add(originalPieceIndex);
            }
        }
    });

    if (criticalErrorOccurred) {
        console.warn("Forced full re-solve due to critical issue (Inc).");
        const fullSolveResult = findFullSolution(newTargetCell, currentActivePieceSet, currentGridSize, permanentlyBlockedCellsList);
        return { ...fullSolveResult, type: 'full_forced_critical_inc_fail' };
    }

    console.log(`Initial displacement (Inc): ${initiallyDisplacedPieceIndices.size} pieces identified. ${survivingPieceInstancesInitially.length} survivors.`);

    let currentAttemptPlacedList = [...survivingPieceInstancesInitially];
    let startTime = performance.now();

    if (initiallyDisplacedPieceIndices.size === 0 && findNextEmptyGridCell(gridConsideringNewState, currentGridSize) === null) {
        let endTime = performance.now();
        console.log(`Incremental (Trivial): No pieces displaced and board solved in ${(endTime - startTime).toFixed(2)} ms.`);
        return { success: true, placedPieces: [...currentAttemptPlacedList], type: 'incremental_trivial_success' };
    }

    if (initiallyDisplacedPieceIndices.size > 0) {
        console.log(`Attempting incremental solve with ${initiallyDisplacedPieceIndices.size} initially displaced pieces.`);
        if (solveRecursive(
            initiallyDisplacedPieceIndices, gridConsideringNewState, currentAttemptPlacedList,
            getShapeOrientations, checkCanPlace, applyPieceToGrid, unapplyPieceFromGrid,
            findNextEmptyGridCell,
            currentActivePieceSet, currentGridSize
        )) {
            let endTime = performance.now();
            console.log(`Incremental (Minimal): Solution FOUND in ${(endTime - startTime).toFixed(2)} ms.`);
            return { success: true, placedPieces: [...currentAttemptPlacedList], type: 'incremental_minimal_success' };
        }
        //console.log("Incremental (Minimal): FAILED.");
    } else if (findNextEmptyGridCell(gridConsideringNewState, currentGridSize) !== null) {
         console.log("Incremental: No pieces initially displaced, but board not full. Escalating.");
    }

    const MIN_SURVIVORS_TO_KEEP_BEFORE_FULL_SOLVE = 0;
    let currentSurvivorsForEscalation = [...survivingPieceInstancesInitially];
    let currentDisplacedForEscalation = new Set(initiallyDisplacedPieceIndices);
    let gridForEscalationAttempt = gridConsideringNewState;

    let escalationStep = 0;
    while (currentSurvivorsForEscalation.length > MIN_SURVIVORS_TO_KEEP_BEFORE_FULL_SOLVE) {
        escalationStep++;
        if (currentSurvivorsForEscalation.length === 0 && escalationStep > 0) { console.log("Escalation: No survivors left for this step."); break; }
        let pieceToDisplaceNext = null;
        let pieceToDisplaceNextIndexInSurvivors = -1;
        const holes = [];
         for (let r_hole = 0; r_hole < currentGridSize; r_hole++) {
            for (let c_hole = 0; c_hole < currentGridSize; c_hole++) {
                if (gridForEscalationAttempt[r_hole][c_hole] === null) holes.push({ r: r_hole, c: c_hole });
            }
        }
        if (holes.length === 0 && currentDisplacedForEscalation.size < currentActivePieceSet.length) { console.log("Escalation: No holes found, but not all pieces displaced. Breaking escalation."); break; }


        for (let i = currentSurvivorsForEscalation.length - 1; i >= 0; i--) {
            if (isPieceAdjacentToHole(currentSurvivorsForEscalation[i], gridForEscalationAttempt, currentGridSize)) {
                 pieceToDisplaceNext = currentSurvivorsForEscalation[i];
                 pieceToDisplaceNextIndexInSurvivors = i; break;
            }
        }
        if (!pieceToDisplaceNext && currentSurvivorsForEscalation.length > 0) {
            pieceToDisplaceNextIndexInSurvivors = currentSurvivorsForEscalation.length - 1;
            pieceToDisplaceNext = currentSurvivorsForEscalation[pieceToDisplaceNextIndexInSurvivors];
        }
        if (!pieceToDisplaceNext) { console.log("Escalation: Could not select piece to displace for escalation."); break; }


        currentSurvivorsForEscalation.splice(pieceToDisplaceNextIndexInSurvivors, 1);
        const originalIndexOfNewlyDisplaced = currentActivePieceSet.findIndex(ap => ap.id === pieceToDisplaceNext.piece.id);
        currentDisplacedForEscalation.add(originalIndexOfNewlyDisplaced);
        //console.log(`Escalation step ${escalationStep}: Displacing '${pieceToDisplaceNext.piece.masterPiece.name}'. Total displaced: ${currentDisplacedForEscalation.size}`);


        let gridForThisEscalation = createInitialGridState(newTargetCell, currentGridSize, permanentlyBlockedCellsList);
        let placedListForThisEscalation = [];
        currentSurvivorsForEscalation.forEach(p => {
            applyPieceToGrid(p.currentShape, p.r, p.c, gridForThisEscalation, p.piece.id);
            placedListForThisEscalation.push(p);
        });

        startTime = performance.now();
        if (solveRecursive(
            currentDisplacedForEscalation, gridForThisEscalation, placedListForThisEscalation,
            getShapeOrientations, checkCanPlace, applyPieceToGrid, unapplyPieceFromGrid,
            findNextEmptyGridCell,
            currentActivePieceSet, currentGridSize
        )) {
            let endTime = performance.now();
            console.log(`Incremental (Escalation ${escalationStep}): Solution FOUND in ${(endTime - startTime).toFixed(2)} ms.`);
            return { success: true, placedPieces: [...placedListForThisEscalation], type: `incremental_escalation_${escalationStep}_success` };
        }
        //console.log(`Incremental (Escalation ${escalationStep}): FAILED.`);
        gridForEscalationAttempt = gridForThisEscalation;
    }

    console.log("Fallback after escalation (Inc): Performing full re-solve.");
    const fullSolveResult = findFullSolution(newTargetCell, currentActivePieceSet, currentGridSize, permanentlyBlockedCellsList);
    return { ...fullSolveResult, type: fullSolveResult.success ? 'full_fallback_inc_success' : 'full_fallback_inc_fail' };
}