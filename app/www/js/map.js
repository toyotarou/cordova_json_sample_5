document.addEventListener('deviceready', initMap, false);

function initMap() {
    const date = localStorage.getItem('mapDate');
    const points = JSON.parse(localStorage.getItem('mapPoints') || '[]');

    document.getElementById('date-label').textContent = date || '';

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
            L.marker([lat, lng]).addTo(map);
        }
    });
}
