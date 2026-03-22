var center = [35.718532, 139.586639];

var map = L.map('map', { maxZoom: 19 }).setView(center, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var circle500 = L.circle(center, {
    radius: 500,
    color: '#1a4aaa',
    weight: 2,
    fillColor: '#4af',
    fillOpacity: 0.15
}).addTo(map);

L.circle(center, {
    radius: 100,
    color: '#f84',
    weight: 2,
    fillColor: '#f84',
    fillOpacity: 0.4
}).addTo(map);

setTimeout(function() {
    map.invalidateSize();
    map.fitBounds(circle500.getBounds(), { padding: [5, 5] });
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
    var dateBar = document.getElementById('date-bar');
    dateBar.querySelectorAll('.date-avatar').forEach(function(av) {
        var isMulti = dateMap[av.dataset.date] && dateMap[av.dataset.date].length >= 2;
        av.style.borderColor = isMulti ? '#4af' : '#f44';
    });
}

document.getElementById('all-btn').addEventListener('click', function() {
    if (allPolylines.length > 0) {
        clearAllPolylines();
        return;
    }

    if (activePolyline) {
        map.removeLayer(activePolyline);
        activePolyline = null;
    }
    clearLabels();
    activeDate = null;

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

fetch('http://49.212.175.205:3000/api/v1/geoloc')
    .then(function(r) { return r.json(); })
    .then(function(geolocs) {
        var centerLatLng = L.latLng(center[0], center[1]);
        dateMap = {};

        geolocs.forEach(function(geo) {
            var d = new Date(geo.year, geo.month - 1, geo.day);
            if (d < new Date(2024, 0, 1)) return;

            var lat = Number(geo.latitude);
            var lng = Number(geo.longitude);
            if (!lat || !lng) return;

            var dist = centerLatLng.distanceTo(L.latLng(lat, lng));
            if (dist > 500) return;

            // 赤点は100m超のみ表示
            if (dist > 100) {
                L.circleMarker([lat, lng], {
                    radius: 4,
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.6,
                    weight: 0
                }).addTo(map);
            }

            // ポリラインも100m超の点のみ
            if (dist > 100) {
                var key = geo.year + '/' + geo.month + '/' + geo.day;
                if (!dateMap[key]) dateMap[key] = [];
                dateMap[key].push({
                    lat: lat,
                    lng: lng,
                    time: geo.time || '00:00:00'
                });
            }
        });

        var dateBar = document.getElementById('date-bar');
        Object.keys(dateMap).sort().forEach(function(dateKey) {
            var parts = dateKey.split('/');
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

                if (!isMulti) return;

                if (allPolylines.length > 0) {
                    clearAllPolylines();
                }

                if (activeDate === tappedDate) {
                    if (activePolyline) {
                        map.removeLayer(activePolyline);
                        activePolyline = null;
                    }
                    clearLabels();
                    avatar.style.borderColor = defaultBorderColor;
                    activeDate = null;
                    map.fitBounds(circle500.getBounds(), { padding: [5, 5] });
                    return;
                }

                if (activePolyline) {
                    map.removeLayer(activePolyline);
                    activePolyline = null;
                }
                clearLabels();
                if (activeDate) {
                    var prev = dateBar.querySelector('.date-avatar[data-date="' + activeDate + '"]');
                    if (prev) {
                        var prevMulti = dateMap[activeDate].length >= 2;
                        prev.style.borderColor = prevMulti ? '#4af' : '#f44';
                    }
                }

                activeDate = tappedDate;
                avatar.style.borderColor = '#ff0';

                var latLngs = points.map(function(p) { return [p.lat, p.lng]; });
                activePolyline = L.polyline(latLngs, {
                    color: 'blue',
                    weight: 10
                }).addTo(map);

                drawLabels(points);

                map.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] });
            });

            dateBar.appendChild(avatar);
        });

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
