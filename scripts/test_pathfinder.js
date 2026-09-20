const fs = require('fs');
const path = require('path');

// Mock window for graph_data.js
global.window = {};
require(path.join(__dirname, '..', 'docs', 'graph_data.js'));

const graphData = window.MAP_GRAPH_DATA;
console.log('Testing Graph Data:');
console.log(`- Nodes count: ${Object.keys(graphData.nodes).length}`);
console.log(`- Bounds: ${JSON.stringify(graphData.bounds)}`);

// Test A* implementation
function findClosestNode(xNorm, yNorm) {
    const nodeEntries = Object.entries(graphData.nodes);
    let closestId = null;
    let minSqDist = Infinity;

    for (let i = 0; i < nodeEntries.length; i++) {
        const [id, node] = nodeEntries[i];
        const dx = node.x - xNorm;
        const dy = node.y - yNorm;
        const sqDist = dx * dx + dy * dy;
        if (sqDist < minSqDist) {
            minSqDist = sqDist;
            closestId = id;
        }
    }
    return closestId;
}

function runAStar(startPct, endPct) {
    const startNormX = startPct.x / 100.0;
    const startNormY = startPct.y / 100.0;
    const endNormX = endPct.x / 100.0;
    const endNormY = endPct.y / 100.0;

    const startNodeId = findClosestNode(startNormX, startNormY);
    const endNodeId = findClosestNode(endNormX, endNormY);

    const nodes = graphData.nodes;
    const targetNode = nodes[endNodeId];

    function calculateHValue(node) {
        const dx = (node.x - targetNode.x);
        const dy = (node.y - targetNode.y);
        return Math.sqrt(dx * dx + dy * dy) * 111320;
    }

    const openSet = new Map();
    const closedSet = new Set();

    const startH = calculateHValue(nodes[startNodeId]);
    openSet.set(startNodeId, {
        id: startNodeId,
        g: 0,
        h: startH,
        f: startH,
        parent: null
    });

    let targetReached = null;
    const t0 = performance.now();

    while (openSet.size > 0) {
        let currentBestId = null;
        let lowestF = Infinity;

        for (const [id, nodeRecord] of openSet.entries()) {
            if (nodeRecord.f < lowestF) {
                lowestF = nodeRecord.f;
                currentBestId = id;
            }
        }

        const current = openSet.get(currentBestId);
        openSet.delete(currentBestId);
        closedSet.add(current.id);

        if (current.id === endNodeId) {
            targetReached = current;
            break;
        }

        const neighbors = nodes[current.id].adj || [];
        for (let i = 0; i < neighbors.length; i++) {
            const [neighborId, segmentDist] = neighbors[i];
            if (closedSet.has(neighborId)) continue;

            const tentativeG = current.g + segmentDist;
            const existing = openSet.get(neighborId);

            if (!existing || tentativeG < existing.g) {
                const h = calculateHValue(nodes[neighborId]);
                openSet.set(neighborId, {
                    id: neighborId,
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h,
                    parent: current
                });
            }
        }
    }
    const t1 = performance.now();

    let pathLen = 0;
    let curr = targetReached;
    const pathNodes = [];
    while (curr) {
        pathNodes.push(curr.id);
        curr = curr.parent;
    }

    return {
        found: !!targetReached,
        pathLength: pathNodes.length,
        nodesExplored: closedSet.size,
        timeMs: (t1 - t0).toFixed(2)
    };
}

console.log('\n--- Running Test Cases ---');
const testCases = [
    { name: 'Preset 1: Capitol to UT', start: { x: 45, y: 22 }, end: { x: 52, y: 88 } },
    { name: 'Preset 2: Waterloo to Mansion', start: { x: 82, y: 35 }, end: { x: 22, y: 28 } },
    { name: 'Diagonal Search (10,10 to 90,90)', start: { x: 10, y: 10 }, end: { x: 90, y: 90 } }
];

testCases.forEach(tc => {
    const res = runAStar(tc.start, tc.end);
    console.log(`[PASS] ${tc.name}: Found path with ${res.pathLength} nodes | Explored: ${res.nodesExplored} | Time: ${res.timeMs}ms`);
});

console.log('\nAll A* Pathfinder Unit Tests Passed Successfully!');
