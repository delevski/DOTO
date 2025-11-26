// Israel region constants for map restrictions and geocoding
export const ISRAEL_CENTER = [32.0853, 34.7818]; // Tel Aviv
export const ISRAEL_BOUNDS = [
  [29.4, 34.2], // Southwest corner
  [33.5, 35.9]  // Northeast corner
];

// Helper function to validate coordinates are within Israel bounds
export const validateIsraelBounds = (lat, lon) => {
  const validLat = Math.max(29.4, Math.min(33.5, lat));
  const validLon = Math.max(34.2, Math.min(35.9, lon));
  return [validLat, validLon];
};

// Check if coordinates are within Israel bounds
export const isWithinIsraelBounds = (lat, lon) => {
  return lat >= 29.4 && lat <= 33.5 && lon >= 34.2 && lon <= 35.9;
};

// Nominatim API parameters for Israel-only searches
export const ISRAEL_NOMINATIM_PARAMS = {
  countrycodes: 'il',
  bounded: 1,
  viewbox: '34.2,33.5,35.9,29.4', // lon_min,lat_max,lon_max,lat_min
};

