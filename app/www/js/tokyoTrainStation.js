function calculateDistance(p1, p2) {
    var latlng1 = L.latLng(Number(p1.latitude), Number(p1.longitude));
    var latlng2 = L.latLng(Number(p2.latitude), Number(p2.longitude));
    return latlng1.distanceTo(latlng2);
}

// 駅一覧を即描画（件数セルは空のまま）
function renderStations(trains) {
    var list = document.getElementById('station-list');
    list.innerHTML = '';

    trains.forEach(function(train) {
        var block = document.createElement('div');
        block.className = 'train-block';

        var trainName = document.createElement('div');
        trainName.className = 'train-name';
        trainName.textContent = train.train_name;
        block.appendChild(trainName);

        train.station.forEach(function(station) {
            var row = document.createElement('div');
            row.className = 'station-row';

            var nameWrapper = document.createElement('div');
            nameWrapper.className = 'station-name-wrapper';

            var name = document.createElement('span');
            name.className = 'station-name';
            name.textContent = station.station_name;

            var coords = document.createElement('span');
            coords.className = 'station-coords';
            coords.textContent = station.lat + ', ' + station.lng;

            nameWrapper.appendChild(name);
            nameWrapper.appendChild(coords);

            var hitCell = document.createElement('span');
            hitCell.className = 'station-hit';
            hitCell.dataset.lat = station.lat;
            hitCell.dataset.lng = station.lng;
            hitCell.dataset.name = station.station_name;

            var linkCell = document.createElement('span');
            linkCell.className = 'station-link';

            row.appendChild(nameWrapper);
            row.appendChild(hitCell);
            row.appendChild(linkCell);
            block.appendChild(row);
        });

        list.appendChild(block);
    });
}

// キャッシュから件数を即反映
function applyHitCache(hitCache) {
    var cells = document.querySelectorAll('.station-hit');
    cells.forEach(function(cell) {
        var key = cell.dataset.lat + ',' + cell.dataset.lng;
        var count = hitCache[key];
        if (count > 0) {
            cell.textContent = count;
            var linkCell = cell.nextElementSibling;
            var btn = document.createElement('button');
            btn.className = 'station-btn';
            btn.textContent = count;
            btn.onclick = function() {
                location.href = 'stationAround.html'
                    + '?lat=' + cell.dataset.lat
                    + '&lng=' + cell.dataset.lng
                    + '&name=' + encodeURIComponent(cell.dataset.name);
            };
            linkCell.appendChild(btn);
        }
    });
}

// 描画後に件数をバッチで計算して埋める
function fillHitCounts(geolocs) {
    var cells = document.querySelectorAll('.station-hit');
    var hitCache = {};
    var index = 0;
    var BATCH = 30;

    function processBatch() {
        var end = Math.min(index + BATCH, cells.length);
        for (var i = index; i < end; i++) {
            var cell = cells[i];
            var stationPoint = {
                latitude: cell.dataset.lat,
                longitude: cell.dataset.lng
            };
            var count = 0;
            for (var j = 0; j < geolocs.length; j++) {
                if (calculateDistance(stationPoint, {
                    latitude: geolocs[j].latitude,
                    longitude: geolocs[j].longitude
                }) <= 500) {
                    count++;
                }
            }
            var key = cell.dataset.lat + ',' + cell.dataset.lng;
            hitCache[key] = count;
            if (count > 0) {
                cell.textContent = count;
                var linkCell = cell.nextElementSibling;
                var btn = document.createElement('button');
                btn.className = 'station-btn';
                btn.textContent = count;
                (function(c) {
                    btn.onclick = function() {
                        location.href = 'stationAround.html'
                            + '?lat=' + c.dataset.lat
                            + '&lng=' + c.dataset.lng
                            + '&name=' + encodeURIComponent(c.dataset.name);
                    };
                })(cell);
                linkCell.appendChild(btn);
            }
        }
        index = end;
        if (index < cells.length) {
            setTimeout(processBatch, 0);
        } else {
            // 全計算完了後にキャッシュ保存
            localStorage.setItem('trainStationHitCache', JSON.stringify(hitCache));
        }
    }

    setTimeout(processBatch, 0);
}

// Geolocは常にfetch
var geolocPromise = fetch('http://49.212.175.205:3000/api/v1/geoloc')
    .then(function(r) { return r.json(); });

var cached = localStorage.getItem('trainStationCache');
var hitCached = localStorage.getItem('trainStationHitCache');
if (cached) {
    var trainJson = JSON.parse(cached);
    // キャッシュがあれば駅を即描画
    renderStations(trainJson.data);
    if (hitCached) {
        // 件数もキャッシュがあれば再計算なしで即反映
        applyHitCache(JSON.parse(hitCached));
    } else {
        geolocPromise.then(function(geolocs) {
            fillHitCounts(geolocs);
        }).catch(function(e) { console.error('取得エラー:', e); });
    }
} else {
    Promise.all([
        fetch('http://toyohide.work/BrainLog/api/getTokyoTrainStation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(function(r) { return r.json(); }),
        geolocPromise
    ])
    .then(function(results) {
        localStorage.setItem('trainStationCache', JSON.stringify(results[0]));
        renderStations(results[0].data);
        fillHitCounts(results[1]);
    })
    .catch(function(e) { console.error('取得エラー:', e); });
}
