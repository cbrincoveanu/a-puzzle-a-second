function drawGridLinesAndBackground(ctx, gridSize, cellSize, permanentlyBlockedCells, canvasBackgroundColor, offsetX, offsetY) {
    // Draw inner grid lines (thin ones)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isCurrentCellBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (isCurrentCellBlocked) continue;

            const x = c * cellSize + offsetX;
            const y = r * cellSize + offsetY;

            // Horizontal line below current cell if next cell is not blocked
            if (r < gridSize - 1) {
                const isCellBelowBlocked = permanentlyBlockedCells.some(bc => bc.r === r + 1 && bc.c === c);
                if (!isCellBelowBlocked) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + cellSize);
                    ctx.lineTo(x + cellSize, y + cellSize);
                    ctx.stroke();
                }
            }
            // Vertical line right of current cell if next cell is not blocked
            if (c < gridSize - 1) {
                const isCellRightBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c + 1);
                if (!isCellRightBlocked) {
                    ctx.beginPath();
                    ctx.moveTo(x + cellSize, y);
                    ctx.lineTo(x + cellSize, y + cellSize);
                    ctx.stroke();
                }
            }
        }
    }

    // Draw outer border lines (thick ones)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isCurrentCellBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (isCurrentCellBlocked) continue;

            const x = c * cellSize + offsetX;
            const y = r * cellSize + offsetY;

            // Top border of cell
            if (r === 0 || (r > 0 && permanentlyBlockedCells.some(bc => bc.r === r - 1 && bc.c === c))) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke();
            }
            // Bottom border of cell
            if (r === gridSize - 1 || (r < gridSize - 1 && permanentlyBlockedCells.some(bc => bc.r === r + 1 && bc.c === c))) {
                ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke();
            }
            // Left border of cell
            if (c === 0 || (c > 0 && permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c - 1))) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); ctx.stroke();
            }
            // Right border of cell
            if (c === gridSize - 1 || (c < gridSize - 1 && permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c + 1))) {
                ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke();
            }
        }
    }
}

function drawPuzzlePieces(ctx, currentPlacedPieceInstances, currentCellSize, currentBorderThickness, offsetX, offsetY) {
    currentPlacedPieceInstances.forEach(p_instance => {
        const pieceDef = p_instance.piece.masterPiece;
        const pieceShape = p_instance.currentShape;
        const startR = p_instance.r;
        const startC = p_instance.c;
        ctx.fillStyle = pieceDef.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = currentBorderThickness;
        for (let r_offset = 0; r_offset < pieceShape.length; r_offset++) {
            for (let c_offset = 0; c_offset < pieceShape[r_offset].length; c_offset++) {
                if (pieceShape[r_offset][c_offset] === 1) {
                    const x = (startC + c_offset) * currentCellSize + offsetX;
                    const y = (startR + r_offset) * currentCellSize + offsetY;
                    ctx.fillRect(x, y, currentCellSize, currentCellSize);
                }
            }
        }
        for (let r_offset = 0; r_offset < pieceShape.length; r_offset++) {
            for (let c_offset = 0; c_offset < pieceShape[r_offset].length; c_offset++) {
                if (pieceShape[r_offset][c_offset] === 1) {
                    const x = (startC + c_offset) * currentCellSize + offsetX;
                    const y = (startR + r_offset) * currentCellSize + offsetY;

                    // Top border
                    if (r_offset === 0 || (pieceShape[r_offset - 1] && pieceShape[r_offset - 1][c_offset] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + currentCellSize, y); ctx.stroke();
                    }
                    // Bottom border
                    if (r_offset === pieceShape.length - 1 || (pieceShape[r_offset + 1] && pieceShape[r_offset + 1][c_offset] === 0) || !pieceShape[r_offset + 1]) {
                        ctx.beginPath(); ctx.moveTo(x, y + currentCellSize); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                    // Left border
                    if (c_offset === 0 || (pieceShape[r_offset][c_offset - 1] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + currentCellSize); ctx.stroke();
                    }
                    // Right border
                    if (c_offset === pieceShape[r_offset].length - 1 || (pieceShape[r_offset][c_offset + 1] === 0) || pieceShape[r_offset][c_offset + 1] === undefined) {
                        ctx.beginPath(); ctx.moveTo(x + currentCellSize, y); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                }
            }
        }
    });
}

function drawCurrentTargetEmptyCell(ctx, currentTargetCell, permanentlyBlockedCells, cellSize, currentTimeValue, offsetX, offsetY, gridSize) {
    if (!currentTargetCell || currentTargetCell.r === -1) return;

    // Check if the target cell itself is one of the permanently blocked ones for this puzzle
    const isTargetPermanentlyBlocked = permanentlyBlockedCells.some(bc => bc.r === currentTargetCell.r && bc.c === currentTargetCell.c);
    if (isTargetPermanentlyBlocked) {
        console.warn("Target cell is permanently blocked. This shouldn't happen if playableCellCoords are generated correctly.");
        return;
    }
     // Ensure target cell is within the specific puzzle's grid boundaries
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


function redrawAllPuzzles(ctx, canvasElement, allPuzzleStates, globalCellSize, globalBorderThickness, canvasEffectiveBgColor) {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    allPuzzleStates.forEach(pState => {
        const config = pState.config;
        const offsetX = config.canvasOffset.c * globalCellSize;
        const offsetY = config.canvasOffset.r * globalCellSize;

        drawGridLinesAndBackground(ctx, config.gridSize, globalCellSize, config.permanentlyBlockedCells, canvasEffectiveBgColor, offsetX, offsetY);
        drawPuzzlePieces(ctx, pState.placedPieceInstances, globalCellSize, globalBorderThickness, offsetX, offsetY);
        drawCurrentTargetEmptyCell(ctx, pState.targetEmptyCell, config.permanentlyBlockedCells, globalCellSize, pState.currentTimeValue, offsetX, offsetY, config.gridSize);
    });
}