var params = new URLSearchParams(window.location.search);
var stationLat = Number(params.get('lat'));
var stationLng = Number(params.get('lng'));
var stationName = params.get('name') || '駅';

document.querySelector('.around-label').textContent = stationName;

var map = L.map('map', { maxZoom: 19 }).setView([stationLat, stationLng], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 500m円（薄い青塗り・濃い青縁）
var circle = L.circle([stationLat, stationLng], {
    radius: 500,
    color: '#1a4aaa',
    weight: 2,
    fillColor: '#4af',
    fillOpacity: 0.15
}).addTo(map);

// DOMレイアウト確定後に円にフィット
setTimeout(function() {
    map.invalidateSize();
    map.fitBounds(circle.getBounds(), { padding: [5, 5] });
}, 200);

var activePolyline = null;
var activeDate = null;
var allPolylines = [];
var activeLabels = [];
var dateMap = {};

function getStep(n) {
    if (n <= 10) return 1;
    return Math.floor((n - 1) / 10) + 1;
}

function clearLabels() {
    activeLabels.forEach(function(m) { map.removeLayer(m); });
    activeLabels = [];
}

function drawLabels(points) {
    clearLabels();
    points.forEach(function(p, i) {
        var label = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
                className: 'point-label',
                html: String(i + 1),
                iconSize: [20, 16],
                iconAnchor: [10, -6]
            }),
            interactive: false
        }).addTo(map);
        activeLabels.push(label);
    });
}

function clearAllPolylines() {
    allPolylines.forEach(function(p) { map.removeLayer(p); });
    allPolylines = [];
    // 全アバターのボーダーをデフォルトに戻す
    var dateBar = document.getElementById('date-bar');
    dateBar.querySelectorAll('.date-avatar').forEach(function(av) {
        var isMulti = dateMap[av.dataset.date] && dateMap[av.dataset.date].length >= 2;
        av.style.borderColor = isMulti ? '#4af' : '#f44';
    });
}

document.getElementById('all-btn').addEventListener('click', function() {
    // ALL状態なら解除してトグルOFF
    if (allPolylines.length > 0) {
        clearAllPolylines();
        return;
    }

    // 単体ポリライン・ラベルをクリア
    if (activePolyline) {
        map.removeLayer(activePolyline);
        activePolyline = null;
    }
    clearLabels();
    activeDate = null;

    // isMulti（青ボーダー）の全日付のポリラインを一気に描画
    var dateBar = document.getElementById('date-bar');
    Object.keys(dateMap).sort().forEach(function(dateKey) {
        var pts = dateMap[dateKey];
        if (pts.length < 2) return;
        var latLngs = pts.map(function(p) { return [p.lat, p.lng]; });
        var poly = L.polyline(latLngs, { color: 'blue', weight: 10 }).addTo(map);
        allPolylines.push(poly);
        var av = dateBar.querySelector('.date-avatar[data-date="' + dateKey + '"]');
        if (av) av.style.borderColor = '#ff0';
    });
});

// Geolocを取得して500m以内の点を赤点で表示、日付アバターを並べる
fetch('http://49.212.175.205:3000/api/v1/geoloc')
    .then(function(r) { return r.json(); })
    .then(function(geolocs) {
        var stationLatLng = L.latLng(stationLat, stationLng);
        // 日付ごとに500m以内のgeoloc点を格納 { 'yyyy/mm/dd': [{lat,lng}, ...] }
        dateMap = {};

        geolocs.forEach(function(geo) {
            // 2024-01-01以降のみ
            var d = new Date(geo.year, geo.month - 1, geo.day);
            if (d < new Date(2024, 0, 1)) return;

            var geoLatLng = L.latLng(Number(geo.latitude), Number(geo.longitude));
            if (stationLatLng.distanceTo(geoLatLng) <= 500) {
                L.circleMarker([Number(geo.latitude), Number(geo.longitude)], {
                    radius: 4,
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.6,
                    weight: 0
                }).addTo(map);

                var key = geo.year + '/' + geo.month + '/' + geo.day;
                if (!dateMap[key]) dateMap[key] = [];
                dateMap[key].push({
                    lat: Number(geo.latitude),
                    lng: Number(geo.longitude),
                    time: geo.time || '00:00:00'
                });
            }
        });

        // 日付アバターを日付順に並べる
        var dateBar = document.getElementById('date-bar');
        Object.keys(dateMap).sort().forEach(function(dateKey) {
            var parts = dateKey.split('/');
            // 時間順にソート
            dateMap[dateKey].sort(function(a, b) {
                return a.time.localeCompare(b.time);
            });
            var points = dateMap[dateKey];
            var isMulti = points.length >= 2;
            var defaultBorderColor = isMulti ? '#4af' : '#f44';

            var dowNames = ['日', '月', '火', '水', '木', '金', '土'];
            var dow = dowNames[new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()];

            var avatar = document.createElement('div');
            avatar.className = 'date-avatar';
            avatar.innerHTML = parts[0] + '<br>' + parts[1] + '-' + parts[2] + '<br>' + dow + '　' + points.length;
            avatar.dataset.date = dateKey;
            avatar.style.borderColor = defaultBorderColor;

            avatar.addEventListener('click', function() {
                var tappedDate = avatar.dataset.date;

                // 1点のみの日付は何もしない
                if (!isMulti) return;

                // ALL状態が残っていればクリア
                if (allPolylines.length > 0) {
                    clearAllPolylines();
                }

                // 同じ日付をタップ → ポリライン消去・選択解除・円の初期表示に戻す
                if (activeDate === tappedDate) {
                    if (activePolyline) {
                        map.removeLayer(activePolyline);
                        activePolyline = null;
                    }
                    clearLabels();
                    avatar.style.borderColor = defaultBorderColor;
                    activeDate = null;
                    map.fitBounds(circle.getBounds(), { padding: [5, 5] });
                    return;
                }

                // 別の日付をタップ → 既存を消して新しいポリライン描画
                if (activePolyline) {
                    map.removeLayer(activePolyline);
                    activePolyline = null;
                }
                clearLabels();
                // 前のアバターのボーダーを元に戻す
                if (activeDate) {
                    var prev = dateBar.querySelector('.date-avatar[data-date="' + activeDate + '"]');
                    if (prev) {
                        var prevMulti = dateMap[activeDate].length >= 2;
                        prev.style.borderColor = prevMulti ? '#4af' : '#f44';
                    }
                }

                activeDate = tappedDate;
                avatar.style.borderColor = '#ff0'; // 選択中は黄色

                var latLngs = points.map(function(p) { return [p.lat, p.lng]; });
                activePolyline = L.polyline(latLngs, {
                    color: 'blue',
                    weight: 10
                }).addTo(map);

                drawLabels(points);

                // その日のgeolocにバウンディング
                map.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] });
            });

            dateBar.appendChild(avatar);
        });

        // 年アバターを生成
        var years = [];
        Object.keys(dateMap).sort().forEach(function(dateKey) {
            var year = dateKey.split('/')[0];
            if (years.indexOf(year) === -1) years.push(year);
        });

        var yearBar = document.getElementById('year-bar');
        years.forEach(function(year) {
            var yAvatar = document.createElement('div');
            yAvatar.className = 'year-avatar';
            yAvatar.textContent = year;
            yAvatar.addEventListener('click', function() {
                var dateAvatars = dateBar.querySelectorAll('.date-avatar');
                for (var i = 0; i < dateAvatars.length; i++) {
                    if (dateAvatars[i].dataset.date.indexOf(year + '/') === 0) {
                        dateBar.scrollLeft = dateAvatars[i].offsetLeft - dateBar.offsetLeft;
                        break;
                    }
                }
            });
            yearBar.appendChild(yAvatar);
        });
    })
    .catch(function(e) { console.error('取得エラー:', e); });
