// geoloc取得（並行して実行）
var geolocPromise = fetch('http://49.212.175.205:3000/api/v1/geoloc')
    .then(function(r) { return r.json(); });

// 神社一覧を取得して描画
fetch('http://toyohide.work/BrainLog/api/getTempleLatLng', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
})
    .then(function(r) { return r.json(); })
    .then(function(json) {
        var list = document.getElementById('temple-list');
        json.list.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'temple-row';

            var info = document.createElement('div');
            info.className = 'temple-info';

            var name = document.createElement('span');
            name.className = 'temple-name';
            name.textContent = item.temple;

            var address = document.createElement('span');
            address.className = 'temple-address';
            address.textContent = item.address;

            var coords = document.createElement('span');
            coords.className = 'temple-coords';
            coords.textContent = item.lat + ', ' + item.lng;

            var rank = document.createElement('span');
            rank.className = 'temple-rank rank-' + item.rank;
            rank.textContent = item.rank;

            var countCell = document.createElement('div');
            countCell.className = 'temple-count';
            countCell.dataset.lat = item.lat;
            countCell.dataset.lng = item.lng;
            countCell.dataset.name = item.temple;

            var subRow = document.createElement('div');
            subRow.className = 'temple-sub-row';
            subRow.appendChild(rank);
            subRow.appendChild(countCell);

            info.appendChild(name);
            info.appendChild(address);
            info.appendChild(coords);
            info.appendChild(subRow);

            row.appendChild(info);
            list.appendChild(row);
        });

        // 描画後にgeoloc件数を計算して埋める
        geolocPromise.then(function(geolocs) {
            var homeLatLng = L.latLng(35.718532, 139.586639);

            // 自宅100m以内のgeolocを除外
            var filteredGeolocs = geolocs.filter(function(geo) {
                var gLat = Number(geo.latitude);
                var gLng = Number(geo.longitude);
                if (!gLat || !gLng) return false;
                return homeLatLng.distanceTo(L.latLng(gLat, gLng)) > 100;
            });

            var cells = document.querySelectorAll('.temple-count');
            var index = 0;
            var BATCH = 10;

            function processBatch() {
                var end = Math.min(index + BATCH, cells.length);
                for (var i = index; i < end; i++) {
                    var cell = cells[i];
                    var templeLatlng = L.latLng(Number(cell.dataset.lat), Number(cell.dataset.lng));
                    var count = 0;
                    for (var j = 0; j < filteredGeolocs.length; j++) {
                        var gLat = Number(filteredGeolocs[j].latitude);
                        var gLng = Number(filteredGeolocs[j].longitude);
                        if (templeLatlng.distanceTo(L.latLng(gLat, gLng)) <= 500) {
                            count++;
                        }
                    }
                    if (count > 0) {
                        var btn = document.createElement('button');
                        btn.className = 'count-btn';
                        btn.textContent = count;
                        (function(lat, lng, name) {
                            btn.onclick = function() {
                                openAroundDialog('templeAround.html'
                                    + '?lat=' + lat
                                    + '&lng=' + lng
                                    + '&name=' + encodeURIComponent(name));
                            };
                        })(cell.dataset.lat, cell.dataset.lng, cell.dataset.name);
                        cell.appendChild(btn);
                    } else {
                        cell.closest('.temple-row').remove();
                    }
                }
                index = end;
                if (index < cells.length) {
                    setTimeout(processBatch, 0);
                }
            }

            setTimeout(processBatch, 0);
        });
    })
    .catch(function(e) { console.error('取得エラー:', e); });
