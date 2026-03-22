var params = new URLSearchParams(window.location.search);
var templeLat = Number(params.get('lat'));
var templeLng = Number(params.get('lng'));
var templeName = params.get('name') || '神社';

document.getElementById('temple-label').textContent = templeName;

var map = L.map('map', { maxZoom: 19 }).setView([templeLat, templeLng], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var circle = L.circle([templeLat, templeLng], {
    radius: 500,
    color: '#1a4aaa',
    weight: 2,
    fillColor: '#4af',
    fillOpacity: 0.15
}).addTo(map);

setTimeout(function() {
    map.invalidateSize();
    map.fitBounds(circle.getBounds(), { padding: [5, 5] });
}, 200);

var activePolyline = null;
var activeDate = null;
var allPolylines = [];
var activeLabels = [];
var dateMap = {};

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
        var templeLatLng = L.latLng(templeLat, templeLng);
        dateMap = {};

        geolocs.forEach(function(geo) {
            var d = new Date(geo.year, geo.month - 1, geo.day);
            if (d < new Date(2024, 0, 1)) return;

            var lat = Number(geo.latitude);
            var lng = Number(geo.longitude);
            if (!lat || !lng) return;

            var gLatLng = L.latLng(lat, lng);

            if (templeLatLng.distanceTo(gLatLng) <= 500) {
                L.circleMarker([lat, lng], {
                    radius: 4,
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.6,
                    weight: 0
                }).addTo(map);

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
                    map.fitBounds(circle.getBounds(), { padding: [5, 5] });
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
