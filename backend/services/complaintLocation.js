function coordinates(lat, lng) {
    const latitude = lat == null || lat === '' ? null : Number(lat);
    const longitude = lng == null || lng === '' ? null : Number(lng);
    if ((latitude === null) !== (longitude === null) || (latitude !== null &&
        (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180))) {
        throw Object.assign(new Error('Supply both valid latitude and longitude, or omit both.'), { status: 400 });
    }
    return { lat: latitude, lng: longitude };
}
function distanceMeters(a, b) {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
module.exports = { coordinates, distanceMeters };
