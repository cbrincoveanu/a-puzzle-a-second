function selectFixedPieceSet_deterministic(targetCellCount, masterList, preference = 'largeFirst') {
    let selectedPieces = [];
    let currentSum = 0;
    let masterListIndex = 0;
    let passCount = 0;

    const actualMinPieceSize = masterList.reduce((min, p) => p.cellCount < min ? p.cellCount : min, Infinity);
    if (actualMinPieceSize === Infinity) {
        console.error("CRITICAL: Master piece list is empty or invalid.");
        return [];
    }

    let sortedMasterList;
    if (preference === 'smallFirst') {
        console.log("Piece Selector: Sorting master list - smallest pieces first.");
        sortedMasterList = [...masterList].sort((a, b) => a.cellCount - b.cellCount);
    } else {
        console.log("Piece Selector: Sorting master list - largest pieces first.");
        sortedMasterList = [...masterList].sort((a, b) => b.cellCount - a.cellCount);
    }

    const usedInThisPrimaryPass = new Set();
    const maxPasses = 5;

    while (currentSum < targetCellCount && passCount < maxPasses) {
        let remainingToFill = targetCellCount - currentSum;
        let pieceAddedThisIteration = false;
        const trueLargestPieceSizeInMaster = masterList.reduce((max, p) => p.cellCount > max ? p.cellCount : max, 0);
        const smartThreshold = Math.max(trueLargestPieceSizeInMaster, actualMinPieceSize * 3);


        if (remainingToFill > 0 && remainingToFill < smartThreshold && remainingToFill >= actualMinPieceSize) {
            let foundEndGameSolution = false;
            // 1. Try to find one piece that fits exactly. Iterate through sortedMasterList (respects preference)
            for (const pieceDef of sortedMasterList) {
                if (pieceDef.cellCount === remainingToFill) {
                    selectedPieces.push({ masterPiece: pieceDef, id: `p${selectedPieces.length}` });
                    currentSum += pieceDef.cellCount;
                    pieceAddedThisIteration = true;
                    foundEndGameSolution = true;
                    break;
                }
            }

            // 2. If no exact fit, try to find two pieces that fit exactly
            if (!foundEndGameSolution && remainingToFill >= actualMinPieceSize * 2) {
                for (let i = 0; i < sortedMasterList.length; i++) {
                    const p1 = sortedMasterList[i];
                    if (p1.cellCount < remainingToFill && p1.cellCount >= actualMinPieceSize) {
                        for (let j = i; j < sortedMasterList.length; j++) {
                            const p2 = sortedMasterList[j];
                            if (p1.cellCount + p2.cellCount === remainingToFill && p2.cellCount >= actualMinPieceSize) {
                                selectedPieces.push({ masterPiece: p1, id: `p${selectedPieces.length}` });
                                selectedPieces.push({ masterPiece: p2, id: `p${selectedPieces.length}` });
                                currentSum += p1.cellCount + p2.cellCount;
                                pieceAddedThisIteration = true;
                                foundEndGameSolution = true;
                                break;
                            }
                        }
                    }
                    if (foundEndGameSolution) break;
                }
            }
            if (foundEndGameSolution) {
                 if (currentSum === targetCellCount) break;
                 else continue;
            }
        }

        if (!pieceAddedThisIteration) {
            let currentPieceFromMaster = sortedMasterList[masterListIndex];
            const canUseThisPiece = (passCount > 0 || !usedInThisPrimaryPass.has(currentPieceFromMaster.name));

            if (canUseThisPiece && currentPieceFromMaster.cellCount <= remainingToFill && currentPieceFromMaster.cellCount >= actualMinPieceSize) {
                selectedPieces.push({ masterPiece: currentPieceFromMaster, id: `p${selectedPieces.length}` });
                currentSum += currentPieceFromMaster.cellCount;
                if (passCount === 0) {
                    usedInThisPrimaryPass.add(currentPieceFromMaster.name);
                }
                pieceAddedThisIteration = true;
            }

            masterListIndex++;
            if (masterListIndex >= sortedMasterList.length) {
                masterListIndex = 0;
                passCount++;
                if (passCount === 1) console.log("Piece Selector: Starting pass 2 (allowing duplicates if needed by general logic).");
                usedInThisPrimaryPass.clear();
            }
        }

        if (!pieceAddedThisIteration && currentSum < targetCellCount) {
            if (passCount === 0) {
                passCount++;
                masterListIndex = 0;
                usedInThisPrimaryPass.clear();
                console.log("Piece Selector: No unique piece fit in first pass, moving to allow general duplicates.");
                continue;
            } else if (masterListIndex === 0 && passCount > 0 && !pieceAddedThisIteration) {
                console.warn(`Piece Selector: Stuck. Remaining: ${remainingToFill}. Current Sum: ${currentSum}. Pass: ${passCount}. MasterListIndex: ${masterListIndex}`);
                break;
            }
        }
    }

    if (currentSum !== targetCellCount) {
        console.error(`CRITICAL: Deterministic piece selection failed. Target: ${targetCellCount}, Got: ${currentSum}. Preference: ${preference}`);
        return [];
    }

    console.log(`FIXED Deterministic Active Piece Set Selected (Preference: ${preference}):`, selectedPieces.map(p => p.masterPiece.name).join(', '), "Total cells:", currentSum);
    return selectedPieces;
}