function drawGridLinesAndBackground(ctx, gridSize, cellSize, permanentlyBlockedCells, canvasBackgroundColor) {
    ctx.fillStyle = canvasBackgroundColor;
    ctx.fillRect(0, 0, gridSize * cellSize, gridSize * cellSize);
    ctx.fillStyle = 'white';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (!isBlocked) {
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 0.5;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isCurrentCellBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (isCurrentCellBlocked) continue;
            const x = c * cellSize; const y = r * cellSize;
            if (r < gridSize - 1) {
                const isCellBelowBlocked = permanentlyBlockedCells.some(bc => bc.r === r + 1 && bc.c === c);
                if (!isCellBelowBlocked) { ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
            }
            if (c < gridSize - 1) {
                const isCellRightBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c + 1);
                if (!isCellRightBlocked) { ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
            }
        }
    }
    ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isCurrentCellBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (isCurrentCellBlocked) continue;
            const x = c * cellSize; const y = r * cellSize;
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

function drawPuzzlePieces(ctx, currentPlacedPieceInstances, currentCellSize, currentBorderThickness) {
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
                    const x = (startC + c_offset) * currentCellSize;
                    const y = (startR + r_offset) * currentCellSize;
                    ctx.fillRect(x, y, currentCellSize, currentCellSize);
                }
            }
        }
        for (let r_offset = 0; r_offset < pieceShape.length; r_offset++) {
            for (let c_offset = 0; c_offset < pieceShape[r_offset].length; c_offset++) {
                if (pieceShape[r_offset][c_offset] === 1) {
                    const x = (startC + c_offset) * currentCellSize;
                    const y = (startR + r_offset) * currentCellSize;
                    if (r_offset === 0 || (pieceShape[r_offset - 1] && pieceShape[r_offset - 1][c_offset] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + currentCellSize, y); ctx.stroke();
                    }
                    if (r_offset === pieceShape.length - 1 || (pieceShape[r_offset + 1] && pieceShape[r_offset + 1][c_offset] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y + currentCellSize); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                    if (c_offset === 0 || (pieceShape[r_offset][c_offset - 1] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + currentCellSize); ctx.stroke();
                    }
                    if (c_offset === pieceShape[r_offset].length - 1 || (pieceShape[r_offset][c_offset + 1] === 0)) {
                        ctx.beginPath(); ctx.moveTo(x + currentCellSize, y); ctx.lineTo(x + currentCellSize, y + currentCellSize); ctx.stroke();
                    }
                }
            }
        }
    });
}

function drawCurrentTargetEmptyCell(ctx, currentTargetCell, permanentlyBlockedCells, cellSize, currentSecondValue) {
    if (!currentTargetCell || currentTargetCell.r === -1) return;
    const isBlocked = permanentlyBlockedCells.some(bc => bc.r === currentTargetCell.r && bc.c === currentTargetCell.c);
    if (isBlocked) return;

    const x = currentTargetCell.c * cellSize;
    const y = currentTargetCell.r * cellSize;
    ctx.fillStyle = 'rgba(230, 230, 230, 0.9)';
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x,y, cellSize, cellSize);

    ctx.fillStyle = '#333333';
    let fontSize = Math.floor(cellSize * 0.55);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = String(currentSecondValue).padStart(2, '0');
    ctx.fillText(text, x + cellSize / 2, y + cellSize / 2 + 1);
}

function redrawCanvasAll(ctx, canvasElement, currentPlacedPieceInstances,
                        currentTargetCell,
                        currentGridSize, currentCellSize, currentBorderThickness, currentPermanentlyBlockedCells,
                        currentSecondValueForDisplay,
                        canvasEffectiveBgColor
                        ) {
    drawGridLinesAndBackground(ctx, currentGridSize, currentCellSize, currentPermanentlyBlockedCells, canvasEffectiveBgColor);
    drawPuzzlePieces(ctx, currentPlacedPieceInstances, currentCellSize, currentBorderThickness);
    drawCurrentTargetEmptyCell(ctx, currentTargetCell, currentPermanentlyBlockedCells, currentCellSize, currentSecondValueForDisplay);
}