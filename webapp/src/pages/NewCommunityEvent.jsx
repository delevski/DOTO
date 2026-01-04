import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Image, Calendar, Clock, Users, Tag, AlertCircle, CheckCircle, X, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { ISRAEL_CENTER, ISRAEL_BOUNDS, validateIsraelBounds, ISRAEL_NOMINATIM_PARAMS } from '../utils/israelBounds';
import { getPlatform } from '../utils/platform';

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

// Event categories with icons and colors
const EVENT_CATEGORIES = [
  { key: 'social', label: 'Social Meetup', labelHe: 'מפגש חברתי', icon: '🎉', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'sports', label: 'Sports', labelHe: 'ספורט', icon: '⚽', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'volunteering', label: 'Volunteering', labelHe: 'התנדבות', icon: '🤝', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'workshop', label: 'Workshop', labelHe: 'סדנה', icon: '🎨', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'culture', label: 'Culture', labelHe: 'תרבות', icon: '🎭', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { key: 'other', label: 'Other', labelHe: 'אחר', icon: '📌', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

// Component to enforce Israel bounds on map
function MapBoundsEnforcer() {
  const map = useMap();
  
  useEffect(() => {
    const bounds = L.latLngBounds(ISRAEL_BOUNDS);
    map.setMaxBounds(bounds);
    map.setMinZoom(8);
    map.setMaxZoom(18);
    
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
      const [validLat, validLon] = validateIsraelBounds(lat, lng);
      setPosition([validLat, validLon]);
      onLocationSelect([validLat, validLon]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function NewCommunityEvent() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('social');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
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

  // Handle cover image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('imageSizeShouldBeLess') || 'Image size should be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result);
      setCoverImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reverse geocode coordinates to get street address
  const reverseGeocode = async (lat, lon) => {
    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en,he`,
        { headers: { 'User-Agent': 'DOTO App' } }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        let addressParts = [];
        
        if (address.house_number) addressParts.push(address.house_number);
        if (address.road || address.street || address.pedestrian) {
          addressParts.push(address.road || address.street || address.pedestrian);
        }
        
        if (addressParts.length > 0) {
          return addressParts.join(' ');
        } else if (address.suburb || address.neighbourhood) {
          return address.suburb || address.neighbourhood;
        } else if (address.city || address.town) {
          return address.city || address.town;
        } else {
          return data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
      }
      
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
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
        { headers: { 'User-Agent': 'DOTO-App/1.0' } }
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
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
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
    const [validLat, validLon] = validateIsraelBounds(coords[0], coords[1]);
    setSelectedCoordinates([validLat, validLon]);
    const address = await reverseGeocode(validLat, validLon);
    setLocation(address);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
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
          const [validLat, validLon] = validateIsraelBounds(latitude, longitude);
          
          if (validLat !== latitude || validLon !== longitude) {
            setError(t('locationOutsideIsrael') || 'Location is outside Israel region. Please select a location within Israel.');
            return;
          }
          
          setSelectedCoordinates([validLat, validLon]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError(t('mustBeLoggedInToCreateEvent') || 'You must be logged in to create an event');
      return;
    }

    if (!title.trim()) {
      setError(t('pleaseEnterEventTitle') || 'Please enter an event title');
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

    if (!eventDate) {
      setError(t('pleaseSelectEventDate') || 'Please select an event date');
      return;
    }

    if (!eventTime) {
      setError(t('pleaseSelectEventTime') || 'Please select an event time');
      return;
    }

    setIsSubmitting(true);

    try {
      const newEventId = id();
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      
      const newEvent = {
        id: newEventId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        coordinates: selectedCoordinates,
        category: category,
        eventDate: eventDate,
        eventTime: eventTime,
        eventDateTime: eventDateTime.getTime(),
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        coverImage: coverImage || null,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar,
        subscribers: [],
        blockedUsers: [],
        status: 'upcoming',
        likesCount: 0,
        likedBy: [],
        commentsCount: 0,
        timestamp: Date.now(),
        createdAt: Date.now(),
        platform: getPlatform(), // Track platform where event was created
      };

      await db.transact(
        db.tx.communityEvents[newEventId].update(newEvent)
      );

      // Navigate to the new event
      setTimeout(() => {
        navigate(`/community-event/${newEventId}`);
      }, 500);
    } catch (err) {
      console.error('Failed to create event:', err);
      setError(err.message || t('failedToCreateEvent') || 'Failed to create event. Please try again.');
      setIsSubmitting(false);
    }
  };

  const selectedCategory = EVENT_CATEGORIES.find(c => c.key === category);

  return (
    <div className={`max-w-3xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className={`dark:text-gray-300 ${isRTL ? 'rtl-flip' : ''}`} />
        </button>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('newCommunityEvent') || 'New Community Event'}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('createEventSubtitle') || 'Bring your community together'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className={`mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-6">
        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('coverImage') || 'Cover Image'}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          {coverImagePreview ? (
            <div className="relative">
              <img 
                src={coverImagePreview} 
                alt="Cover preview" 
                className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={removeCoverImage}
                className="absolute top-3 end-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              <Image size={40} className="text-gray-400" />
              <span className="font-medium">{t('uploadCoverImage') || 'Upload Cover Image'}</span>
              <span className="text-sm text-gray-400">{t('pngJpgUpTo5MB')}</span>
            </button>
          )}
        </div>

        {/* Event Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('eventTitle') || 'Event Title'} *
          </label>
          <input
            type="text"
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder={t('eventTitlePlaceholder') || 'Give your event a catchy title...'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('description')} *
          </label>
          <textarea
            className="w-full h-32 p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder={t('eventDescriptionPlaceholder') || 'Describe your event, what to expect, what to bring...'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description.length}/1000 {t('characters')}</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('eventCategory') || 'Category'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${
                  category === cat.key 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className={`font-medium ${category === cat.key ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isRTL ? cat.labelHe : cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('eventDate') || 'Event Date'} *
            </label>
            <div className="relative">
              <Calendar size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                dir="ltr"
                className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('eventTime') || 'Event Time'} *
            </label>
            <div className="relative">
              <Clock size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                dir="ltr"
                className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                required
              />
            </div>
          </div>
        </div>

        {/* Max Participants */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('maxParticipants') || 'Max Participants'} ({t('optional') || 'Optional'})
          </label>
          <div className="relative">
            <Users size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input
              type="number"
              min="2"
              max="1000"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder={t('unlimitedParticipants') || 'Leave empty for unlimited'}
              className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('location')} *
          </label>
          <div className="relative">
            <MapPin size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
            <input
              ref={locationInputRef}
              type="text"
              placeholder={t('enterAddressOrSelect')}
              className="w-full ps-10 pe-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700"
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
                <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <button 
              type="button" 
              onClick={handleUseCurrentLocation}
              disabled={isGeocoding}
              className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeocoding ? t('loading') || 'Loading...' : t('useMyCurrentLocation')}
            </button>
            <span className="text-gray-400">|</span>
            <button 
              type="button" 
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-500"
            >
              {showMapPicker ? t('hideMap') : t('selectOnMap')}
            </button>
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
            className={`flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('creating') || 'Creating...'}
              </>
            ) : (
              <>
                <Sparkles size={20} />
                {t('createEvent') || 'Create Event'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}






