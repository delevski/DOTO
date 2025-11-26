import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Filter, MapPin } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { ISRAEL_CENTER, ISRAEL_BOUNDS, validateIsraelBounds, ISRAEL_NOMINATIM_PARAMS } from '../utils/israelBounds';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to update map view when center changes and enforce Israel bounds
function MapUpdater({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    // Set map bounds to restrict panning to Israel region
    const bounds = L.latLngBounds(ISRAEL_BOUNDS);
    map.setMaxBounds(bounds);
    map.setMinZoom(8);
    map.setMaxZoom(18);
    
    if (center) {
      // Ensure center is within Israel bounds
      const [lat, lon] = validateIsraelBounds(center[0], center[1]);
      map.setView([lat, lon], zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

// Component for marker popup content with address loading
function MarkerPopupContent({ post, coords, cachedAddress, onAddressLoad }) {
  const t = useTranslation();
  const [address, setAddress] = useState(cachedAddress);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  useEffect(() => {
    // Load address if not cached
    if (!address && coords) {
      setIsLoadingAddress(true);
      reverseGeocode(coords[0], coords[1]).then((addr) => {
        if (addr) {
          setAddress(addr);
          onAddressLoad(addr);
        }
        setIsLoadingAddress(false);
      }).catch(() => {
        setIsLoadingAddress(false);
      });
    }
  }, [address, coords, onAddressLoad]);
  
  return (
    <div className="p-2 min-w-[200px]">
      <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white">{post.title || t('helpNeeded')}</h3>
      {isLoadingAddress ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('loadingAddress') || 'Loading address...'}</p>
      ) : address ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          {address.fullAddress || address.streetAddress || address.city || post.location || t('locationNotSpecified')}
        </p>
      ) : (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{post.location || t('locationNotSpecified')}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 line-clamp-2">{post.description}</p>
      <Link 
        to={`/post/${post.id}`} 
        className="text-red-600 dark:text-red-400 text-xs font-semibold hover:underline"
      >
        {t('viewDetails')}
      </Link>
    </div>
  );
}

// Geocode location string to coordinates using Nominatim (restricted to Israel)
const geocodeLocation = async (locationString) => {
  if (!locationString || locationString.trim() === '') return null;
  
  try {
    // Restrict search to Israel bounding box for better performance
    const params = new URLSearchParams({
      format: 'json',
      q: locationString,
      limit: '1',
      ...ISRAEL_NOMINATIM_PARAMS,
      addressdetails: '1'
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'DOTO-App/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      // Verify the result is within Israel bounds
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      if (lat >= 29.4 && lat <= 33.5 && lon >= 34.2 && lon <= 35.9) {
        return {
          lat,
          lon,
          displayName: result.display_name
        };
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

// Search for location autocomplete suggestions (restricted to Israel)
const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) return [];
  
  try {
    // Restrict search to Israel only for better performance
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '5',
      ...ISRAEL_NOMINATIM_PARAMS,
      addressdetails: '1'
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'DOTO-App/1.0'
        }
      }
    );
    const data = await response.json();
    return data
      .filter(item => {
        // Double-check bounds
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        return lat >= 29.4 && lat <= 33.5 && lon >= 34.2 && lon <= 35.9;
      })
      .map(item => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        address: item.address || {}
      }));
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
};

// Reverse geocode coordinates to get address (city, street, number)
const reverseGeocode = async (lat, lon) => {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: lat.toString(),
      lon: lon.toString(),
      zoom: '18',
      addressdetails: '1',
      ...ISRAEL_NOMINATIM_PARAMS
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'DOTO-App/1.0'
        }
      }
    );
    
    const data = await response.json();
    if (data && data.address) {
      const addr = data.address;
      // Build address string: street number + street name, city
      const parts = [];
      
      if (addr.house_number) {
        parts.push(addr.house_number);
      }
      if (addr.road || addr.street) {
        parts.push(addr.road || addr.street);
      }
      if (parts.length > 0) {
        const streetAddress = parts.join(' ');
        const city = addr.city || addr.town || addr.municipality || '';
        return {
          streetAddress,
          city,
          fullAddress: city ? `${streetAddress}, ${city}` : streetAddress,
          address: addr
        };
      } else if (addr.city || addr.town || addr.municipality) {
        return {
          streetAddress: '',
          city: addr.city || addr.town || addr.municipality,
          fullAddress: addr.city || addr.town || addr.municipality,
          address: addr
        };
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
  }
  return null;
};

export default function MapView() {
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(ISRAEL_CENTER);
  const [isSearching, setIsSearching] = useState(false);
  const [postCoordinates, setPostCoordinates] = useState({});
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [markerAddresses, setMarkerAddresses] = useState({}); // Cache addresses by post ID
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Fetch posts from InstantDB
  const { isLoading, error, data } = db.useQuery({ posts: {} });
  const posts = data?.posts || [];

  // Geocode post locations when posts are loaded
  useEffect(() => {
    const geocodePosts = async () => {
      setIsLoadingMarkers(true);
      const coords = {};
      const addresses = {};
      
      for (const post of posts) {
        if (post.location && !coords[post.id]) {
          const geocoded = await geocodeLocation(post.location);
          if (geocoded) {
            coords[post.id] = [geocoded.lat, geocoded.lon];
            // Pre-fetch address for this marker
            const address = await reverseGeocode(geocoded.lat, geocoded.lon);
            if (address) {
              addresses[post.id] = address;
            }
          }
        }
      }
      
      setPostCoordinates(coords);
      setMarkerAddresses(addresses);
      setIsLoadingMarkers(false);
    };
    
    if (posts.length > 0) {
      geocodePosts();
    } else {
      setIsLoadingMarkers(false);
    }
  }, [posts]);

  // Handle search input with debouncing for autocomplete
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const suggestions = await searchLocations(searchQuery);
        setAutocompleteSuggestions(suggestions);
        setIsSearching(false);
      }, 300);
    } else {
      setAutocompleteSuggestions([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle location selection from autocomplete
  const handleLocationSelect = useCallback(async (suggestion) => {
    setSearchQuery(suggestion.displayName);
    setAutocompleteSuggestions([]);
    setSelectedLocation(suggestion);
    // Ensure coordinates are within Israel bounds
    const [lat, lon] = validateIsraelBounds(suggestion.lat, suggestion.lon);
    setMapCenter([lat, lon]);
  }, []);

  // Handle search on Enter key
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const geocoded = await geocodeLocation(searchQuery);
      if (geocoded) {
        setSelectedLocation(geocoded);
        // Ensure coordinates are within Israel bounds
        const [lat, lon] = validateIsraelBounds(geocoded.lat, geocoded.lon);
        setMapCenter([lat, lon]);
        setAutocompleteSuggestions([]);
      }
    }
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setAutocompleteSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(query) ||
      post.description?.toLowerCase().includes(query) ||
      post.location?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t('loadingMap')}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 128px)' }}>
      {/* Map Controls */}
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 flex-1 max-w-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-1">
            <Search size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none z-10`} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={t('search') + '...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 dark:text-white relative z-10`}
            />
            {/* Autocomplete Dropdown */}
            {autocompleteSuggestions.length > 0 && (
              <div 
                ref={autocompleteRef}
                className={`absolute ${isRTL ? 'right' : 'left'}-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto z-50`}
              >
                {autocompleteSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(suggestion)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${isRTL ? 'text-right' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {suggestion.displayName}
                        </p>
                        {suggestion.address?.city || suggestion.address?.town ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {suggestion.address.city || suggestion.address.town}
                            {suggestion.address?.country ? `, ${suggestion.address.country}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {isSearching && searchQuery.trim().length >= 2 && (
              <div className={`absolute ${isRTL ? 'right' : 'left'}-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-50`}>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('searching')}</p>
              </div>
            )}
          </div>
          <button className={`px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Filter size={18} />
            {t('filters')}
          </button>
        </div>
        <div className={`${isRTL ? 'mr-4' : 'ml-4'} flex items-center gap-3`}>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
            {filteredPosts.length} {filteredPosts.length === 1 ? t('post') : t('posts')}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {/* Loading Indicator for Markers - Non-blocking, positioned in corner */}
        {isLoadingMarkers && (
          <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('loadingMarkers') || 'Loading Markers'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('geocodingLocations') || 'Geocoding locations...'}
                </p>
              </div>
            </div>
          </div>
        )}
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          key="map-container"
        >
          <MapUpdater center={mapCenter} zoom={13} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* Selected search location marker */}
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lon]}>
              <Popup>
                <div className="p-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedLocation.displayName || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lon.toFixed(4)}`}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
          {/* Post markers */}
          {filteredPosts.length === 0 && !selectedLocation ? (
            <Marker position={mapCenter}>
              <Popup>
                <div className="p-2">
                  <p className="text-sm text-gray-600">{t('noPostsFound')}</p>
                </div>
              </Popup>
            </Marker>
          ) : (
            filteredPosts.map((post) => {
              // Use geocoded coordinates if available, otherwise use default with offset
              const coords = postCoordinates[post.id] || 
                (post.location ? null : [mapCenter[0] + Math.random() * 0.01, mapCenter[1] + Math.random() * 0.01]);
              
              // Skip if no coordinates available
              if (!coords) return null;
              
              // Get address for this marker (cached or will be fetched on click)
              const cachedAddress = markerAddresses[post.id];
              
              return (
                <Marker key={post.id} position={coords}>
                  <Popup>
                    <MarkerPopupContent 
                      post={post} 
                      coords={coords}
                      cachedAddress={cachedAddress}
                      onAddressLoad={(address) => {
                        setMarkerAddresses(prev => ({ ...prev, [post.id]: address }));
                      }}
                    />
                  </Popup>
                </Marker>
              );
            })
          )}
        </MapContainer>
      </div>
    </div>
  );
}
