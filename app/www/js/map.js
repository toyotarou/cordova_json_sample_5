function initMap() {
    const points = JSON.parse(localStorage.getItem('mapPoints') || '[]');

    if (points.length === 0) return;

    // 時間順にソート
    points.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const firstLat = Number(points[0].latitude);
    const firstLng = Number(points[0].longitude);

    const map = L.map('map').setView([firstLat, firstLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const latLngs = [];
    const labeledHours = new Set();

    points.forEach((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (!lat || !lng) return;

        L.circleMarker([lat, lng], {
            radius: 4,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.6,
            weight: 0
        }).addTo(map);
        latLngs.push([lat, lng]);

        // 各時間帯（時）の最初の1件だけラベル表示
        if (p.time) {
            const parts = p.time.split(':');
            const hour = parts[0];
            if (!labeledHours.has(hour)) {
                labeledHours.add(hour);
                const timeStr = hour + ':' + parts[1];
                L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'time-label',
                        html: timeStr,
                        iconSize: null,
                        iconAnchor: [-8, 8]
                    }),
                    interactive: false
                }).addTo(map);
            }
        }
    });

    if (latLngs.length > 0) {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
}

initMap();
