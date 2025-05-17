function rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const newShape = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape[r][c]) {
                newShape[c][rows - 1 - r] = 1;
            }
        }
    }
    return newShape;
}

function getShapeOrientations(baseShape) {
    const orientations = [];
    let currentShape = baseShape;
    for (let i = 0; i < 4; i++) {
        orientations.push(currentShape);
        currentShape = rotateShape(currentShape);
    }
    return orientations;
}