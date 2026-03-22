document.addEventListener('deviceready', onDeviceReady, false);

let leafletMap = null;
let savedScrollY = 0;
let savedBounds = null;

async function onDeviceReady() {
    await callGeoloc();
    prefetchTrainStations();

    document.getElementById('back-btn').addEventListener('click', (e) => {
        e.preventDefault();
        showTable();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (leafletMap && savedBounds) {
            leafletMap.fitBounds(savedBounds, { padding: [50, 50] });
        }
    });

    // ページダイアログの共通セットアップ
    function setupPageDialog(overlayId, iframeId, linkId, src) {
        const overlay = document.getElementById(overlayId);
        const iframe = document.getElementById(iframeId);
        let subDialogOpen = false;

        document.getElementById(linkId).addEventListener('click', (e) => {
            e.preventDefault();
            iframe.src = src;
            overlay.style.display = 'flex';
        });

        overlay.addEventListener('click', (e) => {
            if (e.target !== overlay) return;
            if (subDialogOpen) {
                iframe.contentWindow.closeAroundDialog();
            } else {
                overlay.style.display = 'none';
                iframe.src = '';
            }
        });

        return { setSubDialogOpen: (val) => { subDialogOpen = val; } };
    }

    const stationDialog = setupPageDialog('station-dialog-overlay', 'station-iframe', 'station-link', 'tokyoTrainStation.html');
    const templeDialog  = setupPageDialog('temple-dialog-overlay',  'temple-iframe',  'temple-link',  'templeLatLng.html');

    window.setSubDialogOpen = function(val) {
        if (document.getElementById('station-dialog-overlay').style.display === 'flex') {
            stationDialog.setSubDialogOpen(val);
        } else if (document.getElementById('temple-dialog-overlay').style.display === 'flex') {
            templeDialog.setSubDialogOpen(val);
        }
    };
}

function showTable() {
    document.getElementById('screen-map').style.display = 'none';
    document.getElementById('screen-table').style.display = 'block';
    window.scrollTo(0, savedScrollY);
}

function showMap(date, points) {
    savedScrollY = window.scrollY;
    document.getElementById('screen-table').style.display = 'none';
    document.getElementById('screen-map').style.display = 'flex';
    document.getElementById('map-date-label').textContent = date;

    // 既存マップを破棄
    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    // DOMレイアウト確定後にLeafletを初期化
    setTimeout(() => {
        leafletMap = L.map('map');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
        }).addTo(leafletMap);

        const latLngs = [];
        points.forEach((p) => {
            const lat = Number(p.latitude);
            const lng = Number(p.longitude);
            if (lat && lng) {
                L.circleMarker([lat, lng], {
                    radius: 4,
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.5,
                    weight: 0,
                }).addTo(leafletMap);
                latLngs.push([lat, lng]);
            }
        });

        savedBounds = L.latLngBounds(latLngs);
        leafletMap.invalidateSize();
        leafletMap.fitBounds(savedBounds, { padding: [50, 50] });
    }, 200);
}


function getBoundingBoxInfo(points) {
    if (!points || points.length === 0) {
        return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0, areaKm2: 0 };
    }
    const lats = points.map(p => Number(p.latitude) || 0);
    const lngs = points.map(p => Number(p.longitude) || 0);
    const maxLat = Math.max(...lats);
    const minLat = Math.min(...lats);
    const maxLng = Math.max(...lngs);
    const minLng = Math.min(...lngs);
    const southWest = L.latLng(minLat, minLng);
    const northWest = L.latLng(maxLat, minLng);
    const southEast = L.latLng(minLat, maxLng);
    const northSouth = southWest.distanceTo(northWest);
    const eastWest = southWest.distanceTo(southEast);
    const areaKm2 = (northSouth * eastWest) / 1000000;
    return { minLat, maxLat, minLng, maxLng, areaKm2 };
}

// バックグラウンドで駅データを取得してlocalStorageにキャッシュ
function prefetchTrainStations() {
    fetch('http://toyohide.work/BrainLog/api/getTokyoTrainStation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.json(); })
    .then(function(json) {
        localStorage.setItem('trainStationCache', JSON.stringify(json));
    })
    .catch(function(e) {
        console.error('[prefetch train error]', e);
    });
}

// GET: geoloc
async function callGeoloc() {
    try {
        const res = await fetch('http://49.212.175.205:3000/api/v1/geoloc', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });
        const data = await res.json();

        // Map<String, List<Geoloc>> : 2024/01/01以降・日付をキーにグループ化
        const geolocMap = {};
        data.filter((item) => {
            const d = new Date(item.year, item.month - 1, item.day);
            return d >= new Date(2024, 0, 1);
        }).forEach((item) => {
            const key = `${item.year}/${item.month}/${item.day}`;
            if (!geolocMap[key]) geolocMap[key] = [];
            geolocMap[key].push(item);
        });

        const tbody = document.getElementById('geoloc-tbody');
        Object.keys(geolocMap).forEach((date) => {
            const points = geolocMap[date];
            const info = getBoundingBoxInfo(points);
            const linkCell = info.areaKm2 >= 0.005
                ? `<td><a href="#" class="map-link">link</a></td>`
                : `<td></td>`;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${date}</td><td>${points.length}</td><td>${info.areaKm2.toFixed(2)}</td>${linkCell}`;
            tbody.appendChild(tr);

            if (info.areaKm2 >= 0.005) {
                tr.querySelector('.map-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    showMap(date, points);
                });
            }
        });
    } catch (e) {
        console.error('[geoloc error]', e);
    }
}
