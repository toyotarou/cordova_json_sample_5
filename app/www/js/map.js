function initMap() {
    const points = JSON.parse(localStorage.getItem('mapPoints') || '[]');

    if (points.length === 0) return;

    const firstLat = Number(points[0].latitude);
    const firstLng = Number(points[0].longitude);

    const map = L.map('map').setView([firstLat, firstLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    points.forEach((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (lat && lng) {
            L.circleMarker([lat, lng], {
                radius: 4,
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.6,
                weight: 0
            }).addTo(map);
        }
    });
}

initMap();
