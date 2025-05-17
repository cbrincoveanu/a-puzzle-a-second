function createInitialGridState(targetCell, gridSize, permanentlyBlockedCells) {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    permanentlyBlockedCells.forEach(cell => {
        if(cell.r >= 0 && cell.r < gridSize && cell.c >= 0 && cell.c < gridSize) {
             grid[cell.r][cell.c] = 'BLOCKED';
        }
    });

    if (targetCell && targetCell.r >= 0 && targetCell.r < gridSize &&
        targetCell.c >= 0 && targetCell.c < gridSize &&
        grid[targetCell.r][targetCell.c] !== 'BLOCKED') {
        grid[targetCell.r][targetCell.c] = 'TARGET_EMPTY';
    } else if (targetCell && targetCell.r !== -1) {
        console.error(`Target cell (${targetCell.r},${targetCell.c}) issue in createInitialGridState!`);
    }
    return grid;
}

function checkCanPlace(pieceShape, r, c, grid, gridSize) {
    for (let sr = 0; sr < pieceShape.length; sr++) {
        for (let sc = 0; sc < pieceShape[sr].length; sc++) {
            if (pieceShape[sr][sc]) {
                const boardR = r + sr;
                const boardC = c + sc;
                if (boardR < 0 || boardR >= gridSize || boardC < 0 || boardC >= gridSize) {
                    return false;
                }
                if (grid[boardR][boardC] !== null) {
                    return false;
                }
            }
        }
    }
    return true;
}

function applyPieceToGrid(pieceShape, r, c, grid, pieceInstanceId) {
    for (let sr = 0; sr < pieceShape.length; sr++) {
        for (let sc = 0; sc < pieceShape[sr].length; sc++) {
            if (pieceShape[sr][sc]) {
                grid[r + sr][c + sc] = pieceInstanceId;
            }
        }
    }
}

function unapplyPieceFromGrid(pieceShape, r, c, grid) {
    for (let sr = 0; sr < pieceShape.length; sr++) {
        for (let sc = 0; sc < pieceShape[sr].length; sc++) {
            if (pieceShape[sr][sc]) {
                grid[r + sr][c + sc] = null;
            }
        }
    }
}

function findNextEmptyGridCell(grid, gridSize) {
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === null) {
                return { r, c };
            }
        }
    }
    return null;
}

function generatePlayableCellCoordinates(gridSize, permanentlyBlockedCells) {
    const coords = [];
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isBlocked = permanentlyBlockedCells.some(bc => bc.r === r && bc.c === c);
            if (!isBlocked) {
                coords.push({ r, c });
            }
        }
    }
    coords.sort((a,b) => a.r === b.r ? a.c - b.c : a.r - b.r);
    return coords;
}