import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Image, Tag, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { ISRAEL_CENTER, ISRAEL_BOUNDS, validateIsraelBounds, ISRAEL_NOMINATIM_PARAMS } from '../utils/israelBounds';
import { updateUserStreak } from '../utils/streakTracking';

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

// Component to enforce Israel bounds on map
function MapBoundsEnforcer() {
  const map = useMap();
  
  useEffect(() => {
    const bounds = L.latLngBounds(ISRAEL_BOUNDS);
    map.setMaxBounds(bounds);
    map.setMinZoom(8);
    map.setMaxZoom(18);
    
    // Ensure initial center is within bounds
    const center = map.getCenter();
    if (center) {
      const [lat, lon] = validateIsraelBounds(center.lat, center.lng);
      if (lat !== center.lat || lon !== center.lng) {
        map.setView([lat, lon], map.getZoom());
      }
    }
  }, [map]);
  
  return null;
}

// Component to handle map clicks for location selection
function LocationPicker({ onLocationSelect, selectedLocation }) {
  const [position, setPosition] = useState(selectedLocation || ISRAEL_CENTER);
  
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Validate and constrain to Israel bounds
      const [validLat, validLon] = validateIsraelBounds(lat, lng);
      setPosition([validLat, validLon]);
      onLocationSelect([validLat, validLon]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function NewPost() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const fileInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Convert files to base64 data URLs for persistence
    const newPhotos = await Promise.all(
      files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              file,
              preview: reader.result, // Base64 data URL
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
    
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    // Remove photo from array (no need to revoke base64 URLs)
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Reverse geocode coordinates to get street address
  const reverseGeocode = async (lat, lon) => {
    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en,he`,
        {
          headers: {
            'User-Agent': 'DOTO App'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        // Build address string with street name and number
        let addressParts = [];
        
        if (address.house_number) {
          addressParts.push(address.house_number);
        }
        if (address.road || address.street || address.pedestrian) {
          addressParts.push(address.road || address.street || address.pedestrian);
        }
        
        // If we have street info, use it; otherwise fall back to more general location
        if (addressParts.length > 0) {
          return addressParts.join(' ');
        } else if (address.suburb || address.neighbourhood) {
          return address.suburb || address.neighbourhood;
        } else if (address.city || address.town) {
          return address.city || address.town;
        } else {
          // Fallback to display name if available
          return data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
      }
      
      // Fallback to coordinates if geocoding fails
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinates on error
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search for location autocomplete suggestions
  const searchLocations = async (query) => {
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearchingLocation(true);
    try {
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
      const suggestions = data
        .filter(item => {
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
      
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Handle location input change with debouncing
  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  // Handle location suggestion selection
  const handleLocationSuggestionSelect = (suggestion) => {
    setLocation(suggestion.displayName);
    setSelectedCoordinates([suggestion.lat, suggestion.lon]);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleLocationSelect = async (coords) => {
    // Validate coordinates are within Israel bounds
    const [validLat, validLon] = validateIsraelBounds(coords[0], coords[1]);
    setSelectedCoordinates([validLat, validLon]);
    // Reverse geocode to get street address
    const address = await reverseGeocode(validLat, validLon);
    setLocation(address);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside and cleanup timeout
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleUseCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Validate coordinates are within Israel bounds
          const [validLat, validLon] = validateIsraelBounds(latitude, longitude);
          
          // Check if location is actually in Israel
          if (validLat !== latitude || validLon !== longitude) {
            setError('Location is outside Israel region. Please select a location within Israel.');
            return;
          }
          
          setSelectedCoordinates([validLat, validLon]);
          // Reverse geocode to get street address
          const address = await reverseGeocode(validLat, validLon);
          setLocation(address);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError(t('unableToGetLocation'));
        }
      );
    } else {
      setError(t('geolocationNotSupported'));
    }
  };

  // Convert File to base64 data URL
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError(t('mustBeLoggedInToCreatePost'));
      return;
    }

    if (!description.trim()) {
      setError(t('pleaseEnterDescription'));
      return;
    }

    if (!location.trim()) {
      setError(t('pleaseEnterLocation'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert photos to base64 data URLs for persistent storage
      let photoDataUrls = [];
      if (photos && photos.length > 0) {
        photoDataUrls = await Promise.all(
          photos
            .filter(photo => photo && photo.file) // Filter out invalid photos
            .map(photo => fileToBase64(photo.file))
        );
      }

      console.log('Saving post with photos:', photoDataUrls.length, 'images');

      const newPostId = id();
      const newPost = {
        id: newPostId,
        author: user.name,
        authorId: user.id,
        avatar: user.avatar,
        title: title.trim() || t('helpNeeded'),
        description: description.trim(),
        location: location.trim(),
        category: category || 'Other',
        tag: category || 'Other',
        distance: 'Nearby', // In a real app, calculate this
        time: timeframe || 'Flexible',
        timeframe: timeframe || null,
        timestamp: Date.now(),
        photos: photoDataUrls.length > 0 ? photoDataUrls : [], // Store base64 data URLs for persistent storage
        likes: 0,
        comments: 0,
        claimers: [], // Array of claimer objects: { userId, userName, userAvatar, claimedAt }
        approvedClaimerId: null, // ID of the approved claimer (only one can be approved)
        claimedBy: null, // Keep for backward compatibility, but use claimers array instead
        createdAt: Date.now(),
      };

      db.transact(
        db.tx.posts[newPostId].update(newPost)
      );

      // Update user's activity streak
      updateUserStreak(user.id);

      // Navigate to the new post
      setTimeout(() => {
        navigate(`/post/${newPostId}`);
      }, 500);
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err.message || t('failedToCreatePost'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`max-w-3xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className={`dark:text-gray-300 ${isRTL ? 'rtl-flip' : ''}`} />
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('newPost')}</h1>
      </div>

      {error && (
        <div className={`mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-6">
        {/* Author Info */}
        <div className={`flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img src={user?.avatar || 'https://i.pravatar.cc/150?u=user'} alt="You" className="w-12 h-12 rounded-full ring-2 ring-gray-100 dark:ring-gray-700" />
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{user?.name || 'You'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('whatDoYouNeedHelpWith')}</div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('titleOptional')}</label>
          <input
            type="text"
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder={t('briefTitleForPost')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('description')} *</label>
          <textarea
            className="w-full h-40 p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description.length}/500 {t('characters')}</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('category')}</label>
          <div className="relative">
            <Tag size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('selectCategory')}</option>
              <option value="Moving">{t('categoryMoving')}</option>
              <option value="Pet Care">{t('categoryPetCare')}</option>
              <option value="Borrow">{t('categoryBorrow')}</option>
              <option value="Assembly">{t('categoryAssembly')}</option>
              <option value="Other">{t('categoryOther')}</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('location')} *</label>
          <div className="relative">
            <MapPin size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
            <input
              ref={locationInputRef}
              type="text"
              placeholder={t('enterAddressOrSelect')}
              className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700"
              value={location}
              onChange={handleLocationChange}
              onFocus={() => {
                if (locationSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              required
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute start-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLocationSuggestionSelect(suggestion)}
                    className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      index === 0 ? 'rounded-t-xl' : ''
                    } ${
                      index === locationSuggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {suggestion.displayName}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearchingLocation && (
              <div className="absolute start-12 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <button 
              type="button" 
              onClick={handleUseCurrentLocation}
              disabled={isGeocoding}
              className="text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeocoding ? t('loading') || 'Loading...' : t('useMyCurrentLocation')}
            </button>
            <span className="text-gray-400">|</span>
            <button 
              type="button" 
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-500"
            >
              {showMapPicker ? t('hideMap') : t('selectOnMap')}
            </button>
            {isGeocoding && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {t('gettingAddress') || 'Getting address...'}
              </span>
            )}
          </div>
          {showMapPicker && (
            <div className="mt-4 h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
              <MapContainer 
                center={selectedCoordinates || ISRAEL_CENTER} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <MapBoundsEnforcer />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationPicker 
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedCoordinates}
                />
              </MapContainer>
            </div>
          )}
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('when')}</label>
          <div className="relative">
            <Clock size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input
              type="datetime-local"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              dir="ltr"
              className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('addPhotos')}</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImageButtonClick}
            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer"
          >
            <Image size={32} className="text-gray-400" />
            <span className="font-medium">{t('clickToUpload')}</span>
            <span className="text-sm">{t('pngJpgUpTo10MB')}</span>
          </button>
          
          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 end-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
            disabled={isSubmitting}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('publishing')}
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                {t('publishPost')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
