# 🗺️ Real-Time Route Planning using OpenStreetMap (A* Search)

[![Live Web Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://sushmithasame.github.io/Real-Time-Route-Planning-using-OpenStreetMap/)
[![C++](https://img.shields.io/badge/C%2B%2B-17-00599C?style=for-the-badge&logo=c%2B%2B)](https://isocpp.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-Data-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE.md)

An interactive, real-time route planning system that parses real OpenStreetMap XML data (`.osm`), constructs a connected road network graph, and calculates the optimal shortest path between coordinates using the **A\* Search Algorithm** with an admissible Euclidean heuristic.

---

## 🌐 Live Interactive Web App

👉 **[Launch Live Demo in Browser](https://sushmithasame.github.io/Real-Time-Route-Planning-using-OpenStreetMap/)**

- **Interactive Map:** Click anywhere or drag Start 🟢 / Destination 🔴 pins in real-time.
- **Instant Pathfinding:** Computes shortest path and distance in $< 10\text{ ms}$.
- **Turn-by-Turn Directions:** Displays street names and segment distances.
- **Search Frontier Animation:** Watch the A* priority queue expand neighboring nodes step-by-step.
- **Export Capabilities:** Download calculated routes as GeoJSON files.

---

## 📸 Preview

<p align="center">
  <img src="map.png" alt="Route Planning Preview" width="700" />
</p>

---

## 🚀 Key Features

- **OpenStreetMap XML Parser:** Parses real-world OpenStreetMap `.osm` files containing node coordinates, highway classifications, and intersection networks.
- **A\* Pathfinding Algorithm:**
  - Implements an open list priority queue evaluating node cost $f(n) = g(n) + h(n)$.
  - Uses Euclidean distance as an admissible and consistent heuristic $h(n)$ to ensure optimality.
- **Node Snapping (`FindClosestNode`):** Automatically snaps arbitrary user coordinates to the nearest valid highway junction node.
- **Dual Runtime Interfaces:**
  1. **Interactive Web App:** Powered by Leaflet.js with Dark/Streets/Satellite layers, live frontier animations, and metric counters.
  2. **Native C++ Engine:** High-performance native build with IO2D / Cairo 2D graphics rendering.
- **Unit Test Suite:** Google Test validation for coordinate parsing, heuristic calculation, and path reconstruction.

---

## 🧠 System Architecture & Flow

```
┌─────────────────────────┐
│     map.osm (XML)       │ ──> Node coordinates & Highway Way definitions
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│    RouteModel Graph     │ ──> Adjacency lists & 2D coordinate normalization
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│    RoutePlanner (A*)    │ ──> Priority Queue & Euclidean Heuristic f(n) = g(n) + h(n)
└─────────────────────────┘
             │
             ├─────────────────────────────────────────┐
             ▼                                         ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│     Live Web App        │               │   Native C++ Desktop    │
│  (Leaflet.js + Browser) │               │   (IO2D + Cairo Engine) │
└─────────────────────────┘               └─────────────────────────┘
```

---

## 🛠️ Native C++ Build & Local Run

### Prerequisites
- `g++` / `clang` $\ge 7.4$ (C++17)
- `cmake` $\ge 3.11.3$ & `make` $\ge 4.1$
- `IO2D` (Cairo backend) and `libcairo2-dev`, `libgraphicsmagick1-dev`

### Compilation
```bash
git clone --recurse-submodules https://github.com/SUSHMITHASAME/Real-Time-Route-Planning-using-OpenStreetMap.git
cd Real-Time-Route-Planning-using-OpenStreetMap
mkdir build && cd build
cmake ..
make
```

### Running Native Desktop App
```bash
./OSM_A_star_search -f ../map.osm
```
When prompted, enter coordinates in the range `0` to `100` (e.g., `10 10` for start, `90 90` for end).

### Running Unit Tests
```bash
./test
```

---

## 📁 Project Structure

```text
├── docs/               # Live Web Application (GitHub Pages deployment)
│   ├── index.html      # UI Layout, HUD metric cards, directions panel
│   ├── style.css       # Glassmorphic dark design system
│   ├── app.js          # A* pathfinder engine & Leaflet map logic
│   └── graph_data.js   # Pre-indexed OpenStreetMap road network
├── src/                # Native C++ Core
│   ├── main.cpp        # CLI entry point and coordinate inputs
│   ├── model.cpp/.h    # OSM XML data parser
│   ├── render.cpp/.h   # 2D map rendering using IO2D
│   ├── route_model.cpp # Node graph and neighbor indexing
│   └── route_planner.cpp # A* Search algorithm implementation
├── test/               # Google Test unit testing suite
├── map.osm             # OpenStreetMap dataset (Downtown Austin, TX)
├── map.png             # Map output visualization
└── CMakeLists.txt      # CMake build definitions
```

---

## 📜 License
Distributed under the MIT License. See [`LICENSE.md`](LICENSE.md) for details.
