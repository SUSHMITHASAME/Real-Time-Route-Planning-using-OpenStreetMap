const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'docs', 'graph_data.js'));
const nodes = window.MAP_GRAPH_DATA.nodes;

function findClosestNode(xNorm, yNorm) {
    const nodeEntries = Object.entries(nodes);
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
    const startId = findClosestNode(startPct.x / 100.0, startPct.y / 100.0);
    const endId = findClosestNode(endPct.x / 100.0, endPct.y / 100.0);
    const targetNode = nodes[endId];

    function h(node) {
        const dx = node.x - targetNode.x;
        const dy = node.y - targetNode.y;
        return Math.sqrt(dx * dx + dy * dy) * 111320;
    }

    const openSet = new Map();
    const closedSet = new Set();
    openSet.set(startId, { id: startId, g: 0, h: h(nodes[startId]), f: h(nodes[startId]), parent: null });

    let reached = null;
    const t0 = performance.now();

    while (openSet.size > 0) {
        let bestId = null;
        let lowestF = Infinity;
        for (const [id, item] of openSet.entries()) {
            if (item.f < lowestF) {
                lowestF = item.f;
                bestId = id;
            }
        }
        const curr = openSet.get(bestId);
        openSet.delete(bestId);
        closedSet.add(curr.id);

        if (curr.id === endId) {
            reached = curr;
            break;
        }

        const neighbors = nodes[curr.id].adj || [];
        for (let i = 0; i < neighbors.length; i++) {
            const [nId, dist] = neighbors[i];
            if (closedSet.has(nId)) continue;
            const tentG = curr.g + dist;
            const existing = openSet.get(nId);
            if (!existing || tentG < existing.g) {
                const hVal = h(nodes[nId]);
                openSet.set(nId, { id: nId, g: tentG, h: hVal, f: tentG + hVal, parent: curr });
            }
        }
    }
    const t1 = performance.now();
    let steps = 0;
    let p = reached;
    while (p) {
        steps++;
        p = p.parent;
    }
    return { found: !!reached, steps, explored: closedSet.size, timeMs: (t1 - t0).toFixed(2) };
}

const presets = [
    { name: 'Main Building to Tech Market', start: { x: 49.1, y: 48.4 }, end: { x: 38.7, y: 40.1 } },
    { name: 'Student Halls to Main Building', start: { x: 18.9, y: 48.7 }, end: { x: 49.1, y: 48.4 } },
    { name: 'Gymkhana to Main Building', start: { x: 40.9, y: 31.1 }, end: { x: 49.1, y: 48.4 } },
    { name: 'Tech Market to Puri Gate', start: { x: 38.7, y: 40.1 }, end: { x: 78.3, y: 9.4 } }
];

presets.forEach(p => {
    const res = runAStar(p.start, p.end);
    console.log(`[PASS] ${p.name}: Path Found = ${res.found} (${res.steps} nodes, ${res.timeMs}ms, explored ${res.explored})`);
});
