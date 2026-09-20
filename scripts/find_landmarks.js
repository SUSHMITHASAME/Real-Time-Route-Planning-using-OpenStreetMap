const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'docs', 'graph_data.js'));
const nodes = window.MAP_GRAPH_DATA.nodes;

const landmarks = [
    { name: 'IIT KGP Main Building', lat: 22.3195, lon: 87.3098 },
    { name: 'Tech Market (Tikka)', lat: 22.3168, lon: 87.3060 },
    { name: 'Nehru Museum (Hijli)', lat: 22.3175, lon: 87.3032 },
    { name: 'Gymkhana Grounds', lat: 22.3145, lon: 87.3075 },
    { name: 'Scholar Avenue / Halls', lat: 22.3198, lon: 87.3015 },
    { name: 'Puri Gate / Hijli Area', lat: 22.3085, lon: 87.3180 }
];

const bounds = window.MAP_GRAPH_DATA.bounds;

landmarks.forEach(lm => {
    let bestId = null;
    let minD = Infinity;
    Object.values(nodes).forEach(n => {
        const d = Math.hypot(n.lat - lm.lat, n.lon - lm.lon);
        if (d < minD) {
            minD = d;
            bestId = n;
        }
    });
    const xPct = ((bestId.lon - bounds.minlon) / (bounds.maxlon - bounds.minlon)) * 100;
    const yPct = ((bestId.lat - bounds.minlat) / (bounds.maxlat - bounds.minlat)) * 100;
    console.log(`${lm.name}: x: ${xPct.toFixed(1)}, y: ${yPct.toFixed(1)}, lat: ${bestId.lat}, lon: ${bestId.lon}`);
});
