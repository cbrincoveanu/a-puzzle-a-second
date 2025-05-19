function drawGridLinesAndBackground(ctx, gridSize, cellSize, permanentlyBlockedCells, canvasBackgroundColor, offsetX, offsetY) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isCurrentCellBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (isCurrentCellBlocked) continue;

            const x = c * cellSize + offsetX;
            const y = r * cellSize + offsetY;

            if (r === 0 || (r > 0 && permanentlyBlockedCells.some(bc => bc.r === r - 1 && bc.c === c))) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke();
            }
            if (r === gridSize - 1 || (r < gridSize - 1 && permanentlyBlockedCells.some(bc => bc.r === r + 1 && bc.c === c))) {
                ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke();
            }
            if (c === 0 || (c > 0 && permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c - 1))) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); ctx.stroke();
            }
            if (c === gridSize - 1 || (c < gridSize - 1 && permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c + 1))) {
                ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke();
            }
        }
    }
}

function drawAllBoardNumbers(ctx, puzzleState, globalCellSize, offsetX, offsetY) {
    const { config, playableCellCoords } = puzzleState;
    if (!playableCellCoords) {
        console.warn(`(${config.id}) Playable cell coords not available for drawAllBoardNumbers.`);
        return;
    }

    playableCellCoords.forEach((coord, numberValue) => {
        if (numberValue <= config.maxTimeValue) {
            const x = coord.c * globalCellSize + offsetX;
            const y = coord.r * globalCellSize + offsetY;

            if (!(puzzleState.targetEmptyCell && puzzleState.targetEmptyCell.r === coord.r && puzzleState.targetEmptyCell.c === coord.c)) {
                ctx.fillStyle = 'rgba(245, 245, 245, 0.8)';
                ctx.fillRect(x, y, globalCellSize, globalCellSize);
            }

            ctx.fillStyle = '#aaaaaa';
            let fontSize = Math.floor(globalCellSize * 0.45);
            ctx.font = `normal ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const text = String(numberValue).padStart(2, '0');
            ctx.fillText(text, x + globalCellSize / 2, y + globalCellSize / 2 + 1);
        }
    });
}

function drawPuzzlePieces(ctx, pieceInstances, currentCellSize, currentBorderThickness, offsetX, offsetY) {
    pieceInstances.forEach(p_instance => {
        if (!p_instance || !p_instance.piece) {
            return;
        }
        const pieceDef = p_instance.piece.masterPiece;
        const pieceShape = p_instance.currentShape;
        const pieceR = p_instance.r;
        const pieceC = p_instance.c;
        const rotation = p_instance.rotation || 0;

        ctx.fillStyle = pieceDef.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = currentBorderThickness;

        const pieceHeightInCells = pieceShape.length;
        const pieceWidthInCells = pieceShape[0].length;

        const centerX = (pieceC + pieceWidthInCells / 2) * currentCellSize + offsetX;
        const centerY = (pieceR + pieceHeightInCells / 2) * currentCellSize + offsetY;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);

        for (let r_offset = 0; r_offset < pieceHeightInCells; r_offset++) {
            for (let c_offset = 0; c_offset < pieceWidthInCells; c_offset++) {
                if (pieceShape[r_offset][c_offset] === 1) {
                    const x = (pieceC + c_offset) * currentCellSize + offsetX;
                    const y = (pieceR + r_offset) * currentCellSize + offsetY;
                    ctx.fillRect(x, y, currentCellSize, currentCellSize);
                }
            }
        }

        for (let r_offset = 0; r_offset < pieceHeightInCells; r_offset++) {
            for (let c_offset = 0; c_offset < pieceWidthInCells; c_offset++) {
                if (pieceShape[r_offset][c_offset] === 1) {
                    const x = (pieceC + c_offset) * currentCellSize + offsetX;
                    const y = (pieceR + r_offset) * currentCellSize + offsetY;

                    if (r_offset === 0 || (pieceShape[r_offset - 1] && pieceShape[r_offset - 1][c_offset] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + currentCellSize, y); ctx.stroke();
                    }
                    if (r_offset === pieceHeightInCells - 1 || (pieceShape[r_offset + 1] && pieceShape[r_offset + 1][c_offset] === 0) || !pieceShape[r_offset + 1]) {
                        ctx.beginPath(); ctx.moveTo(x, y + currentCellSize); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                    if (c_offset === 0 || (pieceShape[r_offset][c_offset - 1] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + currentCellSize); ctx.stroke();
                    }
                    if (c_offset === pieceWidthInCells - 1 || (pieceShape[r_offset][c_offset + 1] === 0) || pieceShape[r_offset][c_offset + 1] === undefined) {
                        ctx.beginPath(); ctx.moveTo(x + currentCellSize, y); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                }
            }
        }
        ctx.restore();
    });
}

function drawCurrentTargetEmptyCell(ctx, currentTargetCell, permanentlyBlockedCells, cellSize, currentTimeValue, offsetX, offsetY, gridSize) {
    if (!currentTargetCell || currentTargetCell.r === -1) return;

    const isTargetPermanentlyBlocked = permanentlyBlockedCells.some(bc => bc.r === currentTargetCell.r && bc.c === currentTargetCell.c);
    if (isTargetPermanentlyBlocked) {
        console.warn("Target cell is permanently blocked. This shouldn't happen.");
        return;
    }
    if (currentTargetCell.r < 0 || currentTargetCell.r >= gridSize || currentTargetCell.c < 0 || currentTargetCell.c >= gridSize) {
        console.warn("Target cell is outside its puzzle grid boundaries.");
        return;
    }

    const x = currentTargetCell.c * cellSize + offsetX;
    const y = currentTargetCell.r * cellSize + offsetY;

    ctx.fillStyle = 'rgba(230, 230, 230, 0.9)';
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);

    ctx.fillStyle = '#333333';
    let fontSize = Math.floor(cellSize * 0.55);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = String(currentTimeValue).padStart(2, '0');
    ctx.fillText(text, x + cellSize / 2, y + cellSize / 2 + 1);
}

function drawLoadingScreen(ctx, canvasElement, progressPercentage) {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = `Loading Puzzles: ${Math.round(progressPercentage * 10) / 10}%`;
    ctx.fillText(text, canvasElement.width / 2, canvasElement.height / 2);
}

function redrawAllPuzzles(ctx, canvasElement, allPuzzleStates, globalCellSize, globalBorderThickness, canvasEffectiveBgColor, currentAnimatingPieces, isLoading = false, loadingProgress = 0) {
    if (isLoading) {
        drawLoadingScreen(ctx, canvasElement, loadingProgress);
        return;
    }

    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    allPuzzleStates.forEach(pState => {
        if (!pState || !pState.config) return;
        const config = pState.config;
        const offsetX = config.canvasOffset.c * globalCellSize;
        const offsetY = config.canvasOffset.r * globalCellSize;

        drawGridLinesAndBackground(ctx, config.gridSize, globalCellSize, config.permanentlyBlockedCells, canvasEffectiveBgColor, offsetX, offsetY);
        drawAllBoardNumbers(ctx, pState, globalCellSize, offsetX, offsetY);
        drawCurrentTargetEmptyCell(ctx, pState.targetEmptyCell, config.permanentlyBlockedCells, globalCellSize, pState.currentTimeValue, offsetX, offsetY, config.gridSize);

        const piecesAnimatingForThisPuzzle = currentAnimatingPieces[pState.id] || [];
        const animatingPieceIds = new Set();
        let piecesToDraw = [];

        piecesAnimatingForThisPuzzle.forEach(animState => {
            piecesToDraw.push({
                piece: animState.pieceInstance.piece,
                currentShape: animState.pieceInstance.currentShape,
                r: animState.currentR,
                c: animState.currentC,
                rotation: animState.currentRotation,
            });
            if (animState.pieceInstance && animState.pieceInstance.piece) {
                animatingPieceIds.add(animState.pieceInstance.piece.id);
            }
        });

        (pState.placedPieceInstances || []).forEach(p => {
            if (p && p.piece && !animatingPieceIds.has(p.piece.id)) {
                piecesToDraw.push(p);
            }
        });

        drawPuzzlePieces(ctx, piecesToDraw, globalCellSize, globalBorderThickness, offsetX, offsetY);
    });
}