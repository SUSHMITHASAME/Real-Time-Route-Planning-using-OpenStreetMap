const https = require('https');
const fs = require('fs');
const path = require('path');

// Bounding box for Kharagpur (covering IIT Kharagpur Campus, Tech Market, Hijli, Gymkhana, and main roads)
// S, W, N, E: 22.3050, 87.2950, 22.3350, 87.3250
const minlat = 22.3050;
const minlon = 87.2950;
const maxlat = 22.3350;
const maxlon = 87.3250;

const overpassUrl = `https://overpass-api.de/api/interpreter?data=%28node%28${minlat}%2C${minlon}%2C${maxlat}%2C${maxlon}%29%3Bway%5Bhighway%5D%28${minlat}%2C${minlon}%2C${maxlat}%2C${maxlon}%29%3B%3E%3B%29%3Bout%20meta%3B`;

console.log('Fetching Kharagpur OSM data from Overpass API...');

const options = {
    headers: {
        'User-Agent': 'AntigravityOSMRoutePlanner/1.0 (sushmitha-project)'
    }
};

const req = https.get(overpassUrl, options, (res) => {
    console.log('Status code:', res.statusCode);
    if (res.statusCode !== 200) {
        console.error('Failed with status:', res.statusCode);
        return;
    }

    let rawData = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log('Received payload length:', rawData.length);
        if (rawData.length < 500) {
            console.log('Response content:', rawData);
            return;
        }

        const boundsTag = `<bounds minlat="${minlat.toFixed(7)}" minlon="${minlon.toFixed(7)}" maxlat="${maxlat.toFixed(7)}" maxlon="${maxlon.toFixed(7)}"/>\n`;
        // Replace existing bounds if any or add new
        if (rawData.includes('<bounds')) {
            rawData = rawData.replace(/<bounds[^>]*\/>/, boundsTag);
        } else {
            rawData = rawData.replace(/<osm[^>]*>/, `$& \n ${boundsTag}`);
        }

        const outOsmPath = path.join(__dirname, '..', 'map.osm');
        fs.writeFileSync(outOsmPath, rawData);
        console.log('Saved Kharagpur map to map.osm!');
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});
