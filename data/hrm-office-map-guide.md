# HRM Branch Locator Map with Directions — Complete Guide
### Laravel 13 + React 19 + Inertia.js + Leaflet + OSRM (100% Free Stack)

Your HRM already has all 42 locations (Branches, Zone Offices, Regional Offices) with latitude/longitude ready. This guide covers **only the map layer** — fetching your existing data, rendering it with type-specific branded markers, directions, and clustering.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Backend: Reading Existing HRM Data](#3-backend-reading-existing-hrm-data)
4. [Frontend: Package Setup](#4-frontend-package-setup)
5. [Type-Based Branded Markers (Branch / Zone / Regional)](#5-type-based-branded-markers-branch--zone--regional)
6. [The Map Component](#6-the-map-component)
7. [Directions & Routing (OSRM)](#7-directions--routing-osrm)
8. [Marker Clustering](#8-marker-clustering)
9. [Legend & Org Branding Overlay](#9-legend--org-branding-overlay)
10. [Styling with Tailwind](#10-styling-with-tailwind)
11. [Self-Hosting OSRM on Your VPS (Advanced)](#11-self-hosting-osrm-on-your-vps-advanced)
12. [Security & Production Checklist](#12-security--production-checklist)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. Architecture Overview

```
┌────────────────────┐      ┌────────────────────┐      ┌──────────────────────┐
│  HRM existing table │─────▶│  New MapController  │─────▶│  Inertia React Page  │
│  (branches/zones/   │      │  (just SELECT +     │      │  (Leaflet Map)        │
│   regions + lat/lng)│      │   group by type)     │      │                       │
└────────────────────┘      └────────────────────┘      └──────────┬────────────┘
                                                                     │
                                       ┌──────────────────────────┬─┴──────────────────┐
                                       ▼                          ▼                     ▼
                              Type-based Markers        Browser Geolocation     OSRM Routing Engine
                              (Branch/Zone/Region)        (navigator.geolocation) (public → self-hosted)
```

No new database work, no seeders, no migrations — you're only adding a **read-only endpoint + a React map page** on top of what already exists.

---

## 2. Prerequisites

- Your HRM's existing Eloquent model for locations (whatever it's called — e.g. `Office`, `Branch`, `Unit` — with columns for `name`, `type`/`office_type`, `latitude`, `longitude`).
- Laravel 13 + Inertia + React 19 (already in place).
- Organization logo (PNG/SVG, transparent background).
- Three distinct marker designs (or colors) for: **Branch**, **Zone Office**, **Regional Office** — so users can visually tell them apart on the map.

> ⚠️ Before writing any code, confirm the exact column name that stores the type (e.g. `type`, `office_type`, `category`) and its possible values (e.g. `branch`, `zone`, `region`) — plug those into the code below wherever marked `// ADJUST`.

---

## 3. Backend: Reading Existing HRM Data

No migration needed. Just a lightweight controller that reuses your existing model.

`app/Http/Controllers/OfficeMapController.php`:

```php
namespace App\Http\Controllers;

use App\Models\Office; // ADJUST: use your actual existing model
use Inertia\Inertia;

class OfficeMapController extends Controller
{
    public function index()
    {
        $offices = Office::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('id', 'name', 'type', 'latitude', 'longitude', 'address', 'phone') // ADJUST columns
            ->get();

        return Inertia::render('OfficeMap', [
            'offices' => $offices,
            'orgLogo' => asset('images/org-logo.png'),
            'counts' => [
                'branch' => $offices->where('type', 'branch')->count(),   // ADJUST value
                'zone' => $offices->where('type', 'zone')->count(),       // ADJUST value
                'region' => $offices->where('type', 'region')->count(),  // ADJUST value
            ],
        ]);
    }
}
```

**Route** (`routes/web.php`):
```php
use App\Http\Controllers\OfficeMapController;

Route::get('/office-map', [OfficeMapController::class, 'index'])
    ->middleware(['auth']) // keep behind auth since it's internal HRM data
    ->name('office.map');
```

That's the entire backend — you're just projecting existing rows into a page prop.

---

## 4. Frontend: Package Setup

```bash
npm install leaflet react-leaflet leaflet-routing-machine react-leaflet-cluster
```

Import CSS globally in `resources/js/app.jsx`:
```js
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
```

Fix Vite's marker icon bundling issue — create `resources/js/leafletFix.js`:
```js
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: icon, shadowUrl: iconShadow });
```
Import this once in `app.jsx`.

---

## 5. Type-Based Branded Markers (Branch / Zone / Regional)

Design **3 pin icons** (Figma/Canva), same shape, different color/badge:
- 🟦 Branch — blue pin with your logo
- 🟨 Zone Office — gold/yellow pin, slightly larger
- 🟥 Regional Office — red/maroon pin, largest

Save them as `public/images/pin-branch.png`, `pin-zone.png`, `pin-region.png`.

`resources/js/Utils/mapIcons.js`:
```js
import L from 'leaflet';

const makeIcon = (url, size) => new L.Icon({
    iconUrl: url,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1] + 5],
});

export const officeIcons = {
    branch: makeIcon('/images/pin-branch.png', [34, 40]),
    zone: makeIcon('/images/pin-zone.png', [40, 48]),
    region: makeIcon('/images/pin-region.png', [46, 54]),
};

export const getIconForType = (type) => officeIcons[type] || officeIcons.branch; // ADJUST fallback
```

---

## 6. The Map Component

`resources/js/Pages/OfficeMap.jsx`:

```jsx
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { getIconForType } from '../Utils/mapIcons';
import RoutingControl from '../Components/RoutingControl';

const typeLabels = {
    branch: 'Branch',
    zone: 'Zone Office',
    region: 'Regional Office',
}; // ADJUST keys to match your actual type values

export default function OfficeMap({ offices, orgLogo, counts }) {
    const [activeOffice, setActiveOffice] = useState(null);
    const bangladeshCenter = [23.6850, 90.3563];

    return (
        <div className="relative w-full h-screen">
            {/* Org branding */}
            <img
                src={orgLogo}
                alt="Organization Logo"
                className="absolute top-4 left-4 z-[1000] w-16 h-16 bg-white rounded-full shadow-lg p-1"
            />

            {/* Legend */}
            <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-lg p-3 text-xs space-y-1">
                <p><span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>Branch ({counts.branch})</p>
                <p><span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Zone Office ({counts.zone})</p>
                <p><span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>Regional Office ({counts.region})</p>
            </div>

            <MapContainer center={bangladeshCenter} zoom={7} scrollWheelZoom className="w-full h-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MarkerClusterGroup chunkedLoading>
                    {offices.map((office) => (
                        <Marker
                            key={office.id}
                            position={[office.latitude, office.longitude]}
                            icon={getIconForType(office.type)}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-bold">{office.name}</p>
                                    <p className="text-gray-500">{typeLabels[office.type] || office.type}</p>
                                    {office.address && <p>{office.address}</p>}
                                    {office.phone && <p>📞 {office.phone}</p>}
                                    <button
                                        onClick={() => setActiveOffice(office)}
                                        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs"
                                    >
                                        Get Directions
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>

                {activeOffice && (
                    <RoutingControl
                        destination={[activeOffice.latitude, activeOffice.longitude]}
                        onClose={() => setActiveOffice(null)}
                    />
                )}
            </MapContainer>
        </div>
    );
}
```

---

## 7. Directions & Routing (OSRM)

`resources/js/Components/RoutingControl.jsx`:

```jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

export default function RoutingControl({ destination, onClose }) {
    const map = useMap();

    useEffect(() => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLatLng = [position.coords.latitude, position.coords.longitude];

                const control = L.Routing.control({
                    waypoints: [L.latLng(userLatLng), L.latLng(destination)],
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1', // swap for self-hosted URL in Section 11
                    }),
                    lineOptions: { styles: [{ color: '#2563eb', weight: 5 }] },
                    show: true,
                    addWaypoints: false,
                    routeWhileDragging: false,
                    fitSelectedRoutes: true,
                }).addTo(map);

                return () => map.removeControl(control);
            },
            (error) => {
                alert('Could not get your location. Please enable GPS/location permissions.');
                console.error(error);
            }
        );
    }, [destination]);

    return null;
}
```

**Behavior:** Clicking "Get Directions" asks for location permission → OSRM calculates the route → the path draws on the map with a turn-by-turn panel (built into `leaflet-routing-machine`).

---

## 8. Marker Clustering

Already wired via `react-leaflet-cluster` in Section 6. With 42 points across Branch/Zone/Region, clustering keeps zoomed-out views clean — clusters expand automatically on zoom-in. No extra config needed, but you can tune cluster radius if desired:

```jsx
<MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
```

---

## 9. Legend & Org Branding Overlay

The legend + logo shown in Section 6 already double as branding. For a more "native map control" feel (fixed position that doesn't scroll with the page), convert the logo `<img>` into a Leaflet control instead:

```jsx
useEffect(() => {
    const LogoControl = L.Control.extend({
        onAdd: function () {
            const img = L.DomUtil.create('img');
            img.src = orgLogo;
            img.style.width = '60px';
            img.style.borderRadius = '50%';
            img.style.background = 'white';
            img.style.padding = '4px';
            return img;
        },
    });
    const control = new LogoControl({ position: 'topleft' });
    control.addTo(map);
    return () => map.removeControl(control);
}, []);
```

---

## 10. Styling with Tailwind

- Override Leaflet's default popup box with your Tailwind theme via a global CSS rule targeting `.leaflet-popup-content-wrapper`.
- Match pin colors exactly to your HRM's existing brand palette (pull hex codes from your current UI).
- Consider a `dark:` variant if your HRM has dark mode — Leaflet tiles can be swapped for a dark tile provider (e.g., CartoDB dark tiles, also free).

---

## 11. Self-Hosting OSRM on Your VPS (Advanced)

The public OSRM demo (`router.project-osrm.org`) is rate-limited and unsuitable for production. Since your MisLoan VPS is already running, host OSRM there too — fully free, no third party involved.

```bash
# 1. Install Docker
sudo apt update && sudo apt install docker.io -y

# 2. Download Bangladesh OSM extract
mkdir -p ~/osrm-data && cd ~/osrm-data
wget https://download.geofabrik.de/asia/bangladesh-latest.osm.pbf

# 3. Preprocess (one-time)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/bangladesh-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/bangladesh-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/bangladesh-latest.osrm

# 4. Run persistently on port 5000
docker run -d --name osrm-bd -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/bangladesh-latest.osrm
```

**Nginx reverse proxy** (keep it behind HTTPS, don't expose port 5000 publicly):
```nginx
location /osrm/ {
    proxy_pass http://127.0.0.1:5000/;
    proxy_set_header Host $host;
}
```

**Update React routing code:**
```js
serviceUrl: 'https://yourdomain.com/osrm/route/v1',
```

---

## 12. Security & Production Checklist

- [ ] Keep `/office-map` behind `auth` middleware — this is internal HRM data, not public.
- [ ] If any office ever has missing/null lat-long, filter it out server-side (already handled via `whereNotNull` in Section 3).
- [ ] Serve pin icons and logo from `public/images` with sane cache headers.
- [ ] If self-hosting OSRM, never expose port 5000 directly — always through Nginx + SSL.
- [ ] Add a CSP allowance for `tile.openstreetmap.org` if your app enforces a strict Content-Security-Policy.

---

## 13. Testing Checklist

- [ ] All 42 offices render at correct coordinates — spot-check a few Branch, Zone, and Regional entries against known real addresses.
- [ ] Legend counts match actual HRM record counts (3 zone, 9 regional, remaining branches).
- [ ] Marker icons visually differ correctly by type.
- [ ] Clustering expands/collapses correctly at different zoom levels.
- [ ] "Get Directions" correctly prompts for and uses geolocation on both desktop and mobile.
- [ ] Denying location permission shows a graceful message, not a crash.
- [ ] Route line draws correctly for a near, a far, and a cross-district test case.
- [ ] Page loads correctly for a user without `auth` (should redirect to login, confirming middleware works).
- [ ] Mobile responsiveness — legend, logo, and popups don't overlap on small screens.

---

## Summary

| Layer | What you already have | What this guide adds |
|---|---|---|
| Data | Branch/Zone/Region + lat-long in HRM | Nothing new — read-only controller |
| Map | — | Leaflet + OpenStreetMap (free, unlimited) |
| Markers | — | Type-based branded pins (Branch/Zone/Region) |
| Directions | — | OSRM (public → self-hosted on your VPS) |
| Branding | Org logo | Overlay + legend on the map |

Zero new database work, zero paid APIs — just a map layer on top of data that already exists.
