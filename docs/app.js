/**
 * OSM Route Planner - Kharagpur (IIT KGP & Surrounding Area)
 * Clean Layout with Map Rotation & 100% Free Tile Providers
 * Author: Sushmitha
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const DEFAULT_BOUNDS = {
        minlat: 22.3050,
        minlon: 87.2950,
        maxlat: 22.3350,
        maxlon: 87.3250
    };

    const graphData = window.MAP_GRAPH_DATA || {
        bounds: DEFAULT_BOUNDS,
        center: [22.3195, 87.3098],
        nodes: {}
    };

    // State
    let map = null;
    let currentTileLayer = null;
    let startMarker = null;
    let endMarker = null;
    let routePolyline = null;
    let boundsPolygon = null;
    let exploredNodesLayer = null;
    let isAnimating = false;
    let animationTimer = null;
    let currentRotation = 0; // Map rotation angle in degrees

    // Default start: IIT KGP Main Building, end: Tech Market
    let startCoord = { x: 49.1, y: 48.4, lat: 22.31953, lon: 87.30974 };
    let endCoord = { x: 38.7, y: 40.1, lat: 22.31702, lon: 87.30660 };
    let currentCalculatedRoute = null;

    // UI elements
    const mapElement = document.getElementById('map');
    const compassDial = document.getElementById('compass-dial');
    const rotDegDisplay = document.getElementById('rot-deg-display');
    const btnRotLeft = document.getElementById('btn-rot-left');
    const btnRotRight = document.getElementById('btn-rot-right');
    const btnResetNorth = document.getElementById('btn-reset-north');

    const descStart = document.getElementById('desc-start');
    const descEnd = document.getElementById('desc-end');
    const resDistance = document.getElementById('res-distance');
    const resTime = document.getElementById('res-time');
    const resNodes = document.getElementById('res-nodes');
    const btnRecompute = document.getElementById('btn-recompute');
    const btnAnimate = document.getElementById('btn-animate');
    const btnToggleDirections = document.getElementById('btn-toggle-directions');
    const directionsTray = document.getElementById('directions-tray');
    const directionsList = document.getElementById('directions-list');
    const stepCountBadge = document.getElementById('step-count-badge');
    const presetChips = document.querySelectorAll('.chip');

    // Kharagpur Landmarks Presets
    const PRESETS = {
        'main-to-techmkt': {
            start: { x: 49.1, y: 48.4 },
            end: { x: 38.7, y: 40.1 },
            startName: 'IIT KGP Main Building',
            endName: 'Technology Market (Tech Mkt)'
        },
        'halls-to-main': {
            start: { x: 18.9, y: 48.7 },
            end: { x: 49.1, y: 48.4 },
            startName: 'Scholar\'s Avenue / Student Halls',
            endName: 'IIT KGP Main Building'
        },
        'gymkhana-to-main': {
            start: { x: 40.9, y: 31.1 },
            end: { x: 49.1, y: 48.4 },
            startName: 'Gymkhana Grounds / Stadium',
            endName: 'IIT KGP Main Building'
        },
        'techmkt-to-purigate': {
            start: { x: 38.7, y: 40.1 },
            end: { x: 78.3, y: 9.4 },
            startName: 'Technology Market',
            endName: 'Puri Gate / Hijli Station'
        }
    };

    // -------------------------------------------------------------
    // 1. Map Initialization (100% Free, NO API Keys)
    // -------------------------------------------------------------
    function initMap() {
        const bounds = graphData.bounds || DEFAULT_BOUNDS;
        const center = graphData.center || [22.3195, 87.3098];

        map = L.map('map', {
            center: center,
            zoom: 15,
            zoomControl: false
        });

        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        // 100% Free tile providers with ZERO watermarks
        const tileProviders = {
            osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        };

        currentTileLayer = L.tileLayer(tileProviders.osm, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        // Layer Switcher
        document.getElementById('layer-osm').addEventListener('click', (e) => switchTiles('osm', e.target));
        document.getElementById('layer-satellite').addEventListener('click', (e) => switchTiles('satellite', e.target));
        document.getElementById('layer-topo').addEventListener('click', (e) => switchTiles('topo', e.target));

        function switchTiles(type, btnElement) {
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
            map.removeLayer(currentTileLayer);
            currentTileLayer = L.tileLayer(tileProviders[type], {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
        }

        // Kharagpur region boundary outline
        const corner1 = L.latLng(bounds.minlat, bounds.minlon);
        const corner2 = L.latLng(bounds.maxlat, bounds.maxlon);
        boundsPolygon = L.rectangle([corner1, corner2], {
            color: '#4F46E5',
            weight: 2,
            dashArray: '5, 5',
            fillColor: '#4F46E5',
            fillOpacity: 0.03
        }).addTo(map);

        exploredNodesLayer = L.layerGroup().addTo(map);

        // Custom pulsing pins
        const createPulsingPin = (type) => {
            return L.divIcon({
                className: 'custom-pin-marker',
                html: `
                    <div class="pin-pulse pulse-${type}"></div>
                    <div class="pin-core pin-${type}"></div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        };

        syncCoordinatesFromPercentage();

        startMarker = L.marker([startCoord.lat, startCoord.lon], {
            draggable: true,
            icon: createPulsingPin('start'),
            title: 'Start Location'
        }).addTo(map);

        endMarker = L.marker([endCoord.lat, endCoord.lon], {
            draggable: true,
            icon: createPulsingPin('end'),
            title: 'Destination'
        }).addTo(map);

        // Marker drag handlers
        startMarker.on('drag', (e) => {
            const pos = e.target.getLatLng();
            startCoord.lat = pos.lat;
            startCoord.lon = pos.lng;
            const pct = latLonToPercentage(pos.lat, pos.lng);
            startCoord.x = pct.x;
            startCoord.y = pct.y;
            descStart.textContent = `Lat: ${pos.lat.toFixed(4)}, Lon: ${pos.lng.toFixed(4)}`;
            clearActivePresets();
        });
        startMarker.on('dragend', () => computeRoute(false));

        endMarker.on('drag', (e) => {
            const pos = e.target.getLatLng();
            endCoord.lat = pos.lat;
            endCoord.lon = pos.lng;
            const pct = latLonToPercentage(pos.lat, pos.lng);
            endCoord.x = pct.x;
            endCoord.y = pct.y;
            descEnd.textContent = `Lat: ${pos.lat.toFixed(4)}, Lon: ${pos.lng.toFixed(4)}`;
            clearActivePresets();
        });
        endMarker.on('dragend', () => computeRoute(false));

        // Map click handler (toggles setting start and destination)
        let clickStart = false;
        map.on('click', (e) => {
            if (isAnimating) return;
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;
            const pct = latLonToPercentage(lat, lon);

            if (clickStart) {
                startCoord = { x: pct.x, y: pct.y, lat, lon };
                startMarker.setLatLng([lat, lon]);
                descStart.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                clickStart = false;
            } else {
                endCoord = { x: pct.x, y: pct.y, lat, lon };
                endMarker.setLatLng([lat, lon]);
                descEnd.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                clickStart = true;
            }
            clearActivePresets();
            computeRoute(false);
        });

        // Initialize Rotator Controls
        initRotator();

        // Compute initial default route
        setTimeout(() => computeRoute(false), 200);
    }

    // -------------------------------------------------------------
    // 2. Map Rotation & Compass Logic
    // -------------------------------------------------------------
    function initRotator() {
        function updateRotation(degrees) {
            currentRotation = (degrees % 360 + 360) % 360;
            mapElement.style.transform = `rotate(${currentRotation}deg)`;
            compassDial.style.transform = `rotate(${currentRotation}deg)`;
            rotDegDisplay.textContent = `${currentRotation}°`;
        }

        btnRotLeft.addEventListener('click', () => {
            updateRotation(currentRotation - 15);
        });

        btnRotRight.addEventListener('click', () => {
            updateRotation(currentRotation + 15);
        });

        btnResetNorth.addEventListener('click', () => {
            updateRotation(0);
        });
    }

    function clearActivePresets() {
        presetChips.forEach(c => c.classList.remove('active'));
    }

    // Coordinate conversions
    function percentageToLatLon(xPct, yPct) {
        const bounds = graphData.bounds || DEFAULT_BOUNDS;
        const normX = Math.max(0, Math.min(100, xPct)) / 100.0;
        const normY = Math.max(0, Math.min(100, yPct)) / 100.0;
        return {
            lat: bounds.minlat + normY * (bounds.maxlat - bounds.minlat),
            lon: bounds.minlon + normX * (bounds.maxlon - bounds.minlon)
        };
    }

    function latLonToPercentage(lat, lon) {
        const bounds = graphData.bounds || DEFAULT_BOUNDS;
        let xPct = ((lon - bounds.minlon) / (bounds.maxlon - bounds.minlon)) * 100;
        let yPct = ((lat - bounds.minlat) / (bounds.maxlat - bounds.minlat)) * 100;
        return { x: +Math.max(0, Math.min(100, xPct)).toFixed(1), y: +Math.max(0, Math.min(100, yPct)).toFixed(1) };
    }

    function syncCoordinatesFromPercentage() {
        const s = percentageToLatLon(startCoord.x, startCoord.y);
        startCoord.lat = s.lat;
        startCoord.lon = s.lon;
        const e = percentageToLatLon(endCoord.x, endCoord.y);
        endCoord.lat = e.lat;
        endCoord.lon = e.lon;
    }

    // -------------------------------------------------------------
    // 3. A* Pathfinding Engine
    // -------------------------------------------------------------
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Project point (px, py) onto segment (ax,ay)-(bx,by), return t in [0,1]
    function projectOntoSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return 0;
        return Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    }

    // Find the node of the nearest road EDGE to the given normalised coordinate.
    // This avoids snapping to a distant node on the other side of a building.
    function findClosestNode(xNorm, yNorm) {
        const nodes = graphData.nodes;
        const nodeEntries = Object.entries(nodes);
        if (nodeEntries.length === 0) return null;

        let bestId   = null;
        let bestDist = Infinity;

        // Scale factor to make x/y distances comparable in metres
        // (lon degrees are shorter than lat degrees at this latitude)
        const latScale = 111320;          // metres per degree lat
        const lonScale = 111320 * Math.cos(22.32 * Math.PI / 180); // ~KGP latitude
        const bounds   = graphData.bounds || DEFAULT_BOUNDS;
        const latSpan  = bounds.maxlat - bounds.minlat;
        const lonSpan  = bounds.maxlon - bounds.minlon;

        // Convert normalised [0-1] → metres offset (for distance comparison only)
        const pmx = xNorm * lonSpan * lonScale;
        const pmy = yNorm * latSpan * latScale;

        for (let i = 0; i < nodeEntries.length; i++) {
            const [id, node] = nodeEntries[i];
            const adj = node.adj || [];

            // Check every outgoing edge from this node
            for (let j = 0; j < adj.length; j++) {
                const neighbourId = adj[j][0];
                const nb = nodes[neighbourId];
                if (!nb) continue;

                const ax = node.x * lonSpan * lonScale;
                const ay = node.y * latSpan * latScale;
                const bx = nb.x * lonSpan * lonScale;
                const by = nb.y * latSpan * latScale;

                const t  = projectOntoSegment(pmx, pmy, ax, ay, bx, by);
                // Point on segment closest to P
                const cx = ax + t * (bx - ax);
                const cy = ay + t * (by - ay);
                const dd = (pmx - cx) * (pmx - cx) + (pmy - cy) * (pmy - cy);

                if (dd < bestDist) {
                    bestDist = dd;
                    // Pick whichever endpoint is closer to the projection point
                    const dA = (pmx - ax) * (pmx - ax) + (pmy - ay) * (pmy - ay);
                    const dB = (pmx - bx) * (pmx - bx) + (pmy - by) * (pmy - by);
                    bestId = dA <= dB ? id : neighbourId;
                }
            }
        }

        // Fall back to plain nearest-node if no edges found
        if (!bestId) {
            let minSqDist = Infinity;
            for (let i = 0; i < nodeEntries.length; i++) {
                const [id, node] = nodeEntries[i];
                const dx = node.x - xNorm;
                const dy = node.y - yNorm;
                const sq = dx * dx + dy * dy;
                if (sq < minSqDist) { minSqDist = sq; bestId = id; }
            }
        }

        return bestId;
    }

    function runAStar() {
        const t0 = performance.now();
        const startId = findClosestNode(startCoord.x / 100.0, startCoord.y / 100.0);
        const endId = findClosestNode(endCoord.x / 100.0, endCoord.y / 100.0);

        if (!startId || !endId) return { found: false };

        const nodes = graphData.nodes;
        const targetNode = nodes[endId];

        function h(node) {
            const dx = node.x - targetNode.x;
            const dy = node.y - targetNode.y;
            return Math.sqrt(dx * dx + dy * dy) * 111320;
        }

        const openSet = new Map();
        const closedSet = new Set();
        const history = [];

        openSet.set(startId, { id: startId, g: 0, h: h(nodes[startId]), f: h(nodes[startId]), parent: null, street: 'Start Point' });
        let reached = null;

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

            history.push({ lat: nodes[curr.id].lat, lon: nodes[curr.id].lon });

            if (curr.id === endId) {
                reached = curr;
                break;
            }

            const neighbors = nodes[curr.id].adj || [];
            for (let i = 0; i < neighbors.length; i++) {
                const [nId, dist, street] = neighbors[i];
                if (closedSet.has(nId)) continue;

                const tentG = curr.g + dist;
                const existing = openSet.get(nId);

                if (!existing || tentG < existing.g) {
                    const hVal = h(nodes[nId]);
                    openSet.set(nId, {
                        id: nId,
                        g: tentG,
                        h: hVal,
                        f: tentG + hVal,
                        parent: curr,
                        street: street || 'Campus Road'
                    });
                }
            }
        }

        const t1 = performance.now();
        const computeTime = (t1 - t0).toFixed(2);

        if (!reached) {
            return { found: false, nodesExplored: closedSet.size, computeTime, history };
        }

        // Reconstruct path
        const coords = [];
        const steps = [];
        let p = reached;
        let totalDist = 0;

        while (p) {
            const node = nodes[p.id];
            coords.push([node.lat, node.lon]);
            if (p.parent) {
                const parentNode = nodes[p.parent.id];
                const d = haversine(node.lat, node.lon, parentNode.lat, parentNode.lon);
                totalDist += d;
                steps.push({ street: p.street, dist: d });
            }
            p = p.parent;
        }

        coords.reverse();
        steps.reverse();

        return {
            found: true,
            coordinates: coords,
            totalDistance: Math.round(totalDist),
            nodesExplored: closedSet.size,
            computeTime,
            steps,
            history
        };
    }

    // -------------------------------------------------------------
    // 4. Render Route & UI
    // -------------------------------------------------------------
    function computeRoute(animate = false) {
        if (isAnimating) stopAnimation();
        exploredNodesLayer.clearLayers();

        // ── Short-distance direct-path shortcut ──────────────────────────────
        // If start and end are within 120 m of each other, drawing a road-network
        // route that loops around a building is misleading. Show a straight line.
        const directDist = haversine(
            startCoord.lat, startCoord.lon,
            endCoord.lat,   endCoord.lon
        );
        if (directDist < 120) {
            if (routePolyline) map.removeLayer(routePolyline);
            routePolyline = L.polyline(
                [[startCoord.lat, startCoord.lon], [endCoord.lat, endCoord.lon]],
                { color: '#4F46E5', weight: 5, opacity: 0.95,
                  dashArray: '8 6', lineJoin: 'round', lineCap: 'round' }
            ).addTo(map);
            const d = Math.round(directDist);
            resDistance.textContent = `${d} m`;
            resTime.textContent     = '< 1 ms';
            resNodes.textContent    = 0;
            directionsList.innerHTML = `<p style="font-size:0.75rem;color:#94a3b8;padding:8px;">📍 Direct path (${d} m straight line — points are very close together)</p>`;
            stepCountBadge.textContent = '1 step';
            currentCalculatedRoute = null;
            map.fitBounds(routePolyline.getBounds(), { padding: [80, 80], maxZoom: 18 });
            return;
        }
        // ────────────────────────────────────────────────────────────────────

        const result = runAStar();
        currentCalculatedRoute = result;

        if (!result.found) {
            resDistance.textContent = 'N/A';
            resTime.textContent = `${result.computeTime} ms`;
            resNodes.textContent = result.nodesExplored;
            directionsList.innerHTML = '<p class="empty-msg" style="font-size:0.75rem;color:#94a3b8;padding:8px;">No path found between points.</p>';
            stepCountBadge.textContent = '0 steps';
            return;
        }

        // Update metrics
        if (result.totalDistance >= 1000) {
            resDistance.textContent = `${(result.totalDistance / 1000).toFixed(2)} km`;
        } else {
            resDistance.textContent = `${result.totalDistance} m`;
        }
        resTime.textContent = `${result.computeTime} ms`;
        resNodes.textContent = result.nodesExplored;

        // Render directions
        renderDirections(result.steps);

        // Draw route line
        if (routePolyline) map.removeLayer(routePolyline);

        if (animate && result.history && result.history.length > 0) {
            animateFrontier(result);
        } else {
            routePolyline = L.polyline(result.coordinates, {
                color: '#4F46E5',
                weight: 5,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map);

            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 17 });
        }
    }

    function renderDirections(steps) {
        if (!steps || steps.length === 0) {
            directionsList.innerHTML = '<p style="font-size:0.75rem;color:#94a3b8;">Destination reached.</p>';
            stepCountBadge.textContent = '0 steps';
            return;
        }

        const grouped = [];
        let cur = { street: steps[0].street, dist: steps[0].dist };
        for (let i = 1; i < steps.length; i++) {
            if (steps[i].street === cur.street && cur.street !== 'Campus Road' && cur.street !== 'Road') {
                cur.dist += steps[i].dist;
            } else {
                grouped.push(cur);
                cur = { street: steps[i].street, dist: steps[i].dist };
            }
        }
        grouped.push(cur);

        stepCountBadge.textContent = `${grouped.length} steps`;
        let html = '';
        grouped.forEach((s) => {
            const distStr = s.dist >= 1000 ? `${(s.dist / 1000).toFixed(2)} km` : `${Math.round(s.dist)} m`;
            html += `
                <div class="step-item">
                    <span class="step-street">${escapeHtml(s.street || 'Campus Road')}</span>
                    <span class="step-dist">${distStr}</span>
                </div>
            `;
        });
        directionsList.innerHTML = html;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
    }

    function animateFrontier(result) {
        isAnimating = true;
        btnAnimate.textContent = 'Exploring...';

        const history = result.history;
        const total = history.length;
        let idx = 0;
        const step = Math.max(1, Math.floor(total / 50));

        function runStep() {
            if (!isAnimating) return;
            const end = Math.min(total, idx + step);
            for (let i = idx; i < end; i++) {
                L.circleMarker([history[i].lat, history[i].lon], {
                    radius: 3,
                    color: '#F59E0B',
                    fillColor: '#F59E0B',
                    fillOpacity: 0.6,
                    weight: 1
                }).addTo(exploredNodesLayer);
            }
            idx = end;
            if (idx < total) {
                animationTimer = setTimeout(runStep, 25);
            } else {
                stopAnimation();
                routePolyline = L.polyline(result.coordinates, {
                    color: '#4F46E5',
                    weight: 6,
                    opacity: 0.95
                }).addTo(map);
            }
        }
        runStep();
    }

    function stopAnimation() {
        if (animationTimer) clearTimeout(animationTimer);
        isAnimating = false;
        btnAnimate.innerHTML = '<i data-lucide="play"></i><span>Animate A*</span>';
        if (window.lucide) window.lucide.createIcons();
    }

    // -------------------------------------------------------------
    // 5. Presets and Events
    // -------------------------------------------------------------
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-preset');
            if (!PRESETS[key]) return;

            presetChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const preset = PRESETS[key];
            startCoord.x = preset.start.x;
            startCoord.y = preset.start.y;
            endCoord.x = preset.end.x;
            endCoord.y = preset.end.y;

            syncCoordinatesFromPercentage();
            startMarker.setLatLng([startCoord.lat, startCoord.lon]);
            endMarker.setLatLng([endCoord.lat, endCoord.lon]);

            descStart.textContent = preset.startName;
            descEnd.textContent = preset.endName;

            computeRoute(false);
        });
    });

    btnRecompute.addEventListener('click', () => computeRoute(false));
    btnAnimate.addEventListener('click', () => computeRoute(true));

    btnToggleDirections.addEventListener('click', () => {
        directionsTray.classList.toggle('hidden');
    });

    // Start
    initMap();
});
