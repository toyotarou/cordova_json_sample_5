# Cordova / JavaScript（Leaflet）での距離計算と行動範囲算出

## 概要
このドキュメントは、Flutterで実装していた以下の処理を、Cordova + JavaScript（Leaflet）で再現するための指針です。

1. 2点間の距離を算出する  
2. その日の行動範囲を矩形（Bounding Box）で算出する  

---

## ① 2点間の距離を算出する

Leafletでは、緯度経度から距離をメートル単位で算出できます。

### 実装

```javascript
function calculateDistance(p1, p2) {
  const latlng1 = L.latLng(Number(p1.latitude), Number(p1.longitude));
  const latlng2 = L.latLng(Number(p2.latitude), Number(p2.longitude));

  return latlng1.distanceTo(latlng2); // meter
}
```

### ポイント
- `distanceTo()` はメートル単位で返却
- Flutterの `Distance().as(LengthUnit.Meter)` と同等

---

## ② 行動範囲（Bounding Box）を算出する

複数の位置情報から、最小・最大の緯度経度を取得し、矩形を作成します。

### 実装

```javascript
function getBoundingBoxInfo(points) {
  if (!points || points.length === 0) {
    return {
      minLat: 0,
      maxLat: 0,
      minLng: 0,
      maxLng: 0,
      areaKm2: 0,
    };
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

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    areaKm2,
  };
}
```

---

## 面積のフォーマット

```javascript
function getBoundingBoxArea(points) {
  if (!points || points.length === 0) {
    return '0.0000 km²';
  }

  const info = getBoundingBoxInfo(points);

  return `${info.areaKm2.toLocaleString('ja-JP', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} km²`;
}
```

---

## 矩形の4点取得

```javascript
function getBoundingBoxPoints(points) {
  if (!points || points.length === 0) {
    return [];
  }

  const info = getBoundingBoxInfo(points);

  return [
    L.latLng(info.minLat, info.minLng),
    L.latLng(info.maxLat, info.minLng),
    L.latLng(info.maxLat, info.maxLng),
    L.latLng(info.minLat, info.maxLng),
  ];
}
```

---

## Leafletで矩形を描画

```javascript
function drawBoundingBox(map, points) {
  const info = getBoundingBoxInfo(points);

  const bounds = L.latLngBounds(
    L.latLng(info.minLat, info.minLng),
    L.latLng(info.maxLat, info.maxLng)
  );

  return L.rectangle(bounds, {
    color: '#ff0000',
    weight: 2,
    fillOpacity: 0.1,
  }).addTo(map);
}
```

---

## 日付ごとの抽出

```javascript
function filterByDate(points, year, month, day) {
  return points.filter(p =>
    p.year === year &&
    p.month === month &&
    p.day === day
  );
}
```

---

## 使用フロー

```javascript
const dailyPoints = filterByDate(allPoints, '2026', '03', '21');

const areaText = getBoundingBoxArea(dailyPoints);

drawBoundingBox(map, dailyPoints);

console.log(areaText);
```

---

## 注意点

### 外接矩形である
実際の移動範囲ではなく、最小・最大値から作る矩形です。

### 点数が少ない場合
1点や2点では面積はほぼ0になります。

### 精度
地球を平面近似しているため誤差はありますが、通常用途では問題ありません。

---

## まとめ

- LeafletでFlutterと同等の処理が可能
- 距離計算は `distanceTo()` を使用
- 行動範囲は Bounding Box で簡易的に算出可能
