const fs = require('fs');
const path = require('path');

const osmPath = path.join(__dirname, '..', 'map.osm');
const xml = fs.readFileSync(osmPath, 'utf8');

console.log('Parsing map.osm...');

const boundsMatch = xml.match(/<bounds\s+minlat="([^"]+)"\s+minlon="([^"]+)"\s+maxlat="([^"]+)"\s+maxlon="([^"]+)"/);
let bounds = {
    minlat: 30.2705900,
    minlon: -97.7454100,
    maxlat: 30.2795700,
    maxlon: -97.7319500
};
if (boundsMatch) {
    bounds = {
        minlat: parseFloat(boundsMatch[1]),
        minlon: parseFloat(boundsMatch[2]),
        maxlat: parseFloat(boundsMatch[3]),
        maxlon: parseFloat(boundsMatch[4])
    };
}

const nodes = {};
const nodeRegex = /<node\s+id="(\d+)"[^>]*\slat="([^"]+)"\s+lon="([^"]+)"/g;
let match;
while ((match = nodeRegex.exec(xml)) !== null) {
    const id = match[1];
    const lat = parseFloat(match[2]);
    const lon = parseFloat(match[3]);
    const x = (lon - bounds.minlon) / (bounds.maxlon - bounds.minlon);
    const y = (lat - bounds.minlat) / (bounds.maxlat - bounds.minlat);
    nodes[id] = { id, lat, lon, x: +x.toFixed(5), y: +y.toFixed(5) };
}

const ways = [];
const wayBlocks = xml.split('</way>');
for (let i = 0; i < wayBlocks.length - 1; i++) {
    const block = wayBlocks[i];
    const highwayMatch = block.match(/<tag\s+k="highway"\s+v="([^"]+)"/);
    if (!highwayMatch) continue;
    const highwayType = highwayMatch[1];

    const nameMatch = block.match(/<tag\s+k="name"\s+v="([^"]+)"/);
    const roadName = nameMatch ? nameMatch[1] : '';

    const onewayMatch = block.match(/<tag\s+k="oneway"\s+v="([^"]+)"/);
    const isOneway = onewayMatch && (onewayMatch[1] === 'yes' || onewayMatch[1] === '1');

    const ndRegex = /<nd\s+ref="(\d+)"/g;
    const nodeIds = [];
    let ndMatch;
    while ((ndMatch = ndRegex.exec(block)) !== null) {
        if (nodes[ndMatch[1]]) {
            nodeIds.push(ndMatch[1]);
        }
    }

    if (nodeIds.length > 1) {
        ways.push({
            highway: highwayType,
            name: roadName,
            oneway: isOneway,
            nodeIds: nodeIds
        });
    }
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const roadNodeMap = {};
ways.forEach(way => {
    for (let i = 0; i < way.nodeIds.length - 1; i++) {
        const u = way.nodeIds[i];
        const v = way.nodeIds[i + 1];
        const nU = nodes[u];
        const nV = nodes[v];
        if (!nU || !nV) continue;

        if (!roadNodeMap[u]) roadNodeMap[u] = { id: u, lat: nU.lat, lon: nU.lon, x: nU.x, y: nU.y, adj: [] };
        if (!roadNodeMap[v]) roadNodeMap[v] = { id: v, lat: nV.lat, lon: nV.lon, x: nV.x, y: nV.y, adj: [] };

        const dist = Math.round(haversine(nU.lat, nU.lon, nV.lat, nV.lon) * 10) / 10;

        if (!roadNodeMap[u].adj.some(e => e[0] === v)) {
            roadNodeMap[u].adj.push([v, dist, way.name || 'Road']);
        }
        if (!way.oneway) {
            if (!roadNodeMap[v].adj.some(e => e[0] === u)) {
                roadNodeMap[v].adj.push([u, dist, way.name || 'Road']);
            }
        }
    }
});

const outputData = {
    bounds,
    center: [ +((bounds.minlat + bounds.maxlat) / 2).toFixed(6), +((bounds.minlon + bounds.maxlon) / 2).toFixed(6) ],
    nodes: roadNodeMap
};

const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

const jsContent = `window.MAP_GRAPH_DATA = ${JSON.stringify(outputData)};`;
fs.writeFileSync(path.join(docsDir, 'graph_data.js'), jsContent);
console.log('Optimized docs/graph_data.js created successfully!');
