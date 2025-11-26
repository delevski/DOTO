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
import { ISRAEL_CENTER, ISRAEL_BOUNDS, validateIsraelBounds } from '../utils/israelBounds';

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
  const fileInputRef = useRef(null);

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

  const handleLocationSelect = (coords) => {
    // Validate coordinates are within Israel bounds
    const [validLat, validLon] = validateIsraelBounds(coords[0], coords[1]);
    setSelectedCoordinates([validLat, validLon]);
    // In a real app, you'd reverse geocode the coordinates to get an address
    // For now, we'll just update the location field with coordinates
    setLocation(`${validLat.toFixed(4)}, ${validLon.toFixed(4)}`);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Validate coordinates are within Israel bounds
          const [validLat, validLon] = validateIsraelBounds(latitude, longitude);
          
          // Check if location is actually in Israel
          if (validLat !== latitude || validLon !== longitude) {
            setError('Location is outside Israel region. Please select a location within Israel.');
            return;
          }
          
          setSelectedCoordinates([validLat, validLon]);
          setLocation(`${validLat.toFixed(4)}, ${validLon.toFixed(4)}`);
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
        claimedBy: null,
        createdAt: Date.now(),
      };

      db.transact(
        db.tx.posts[newPostId].update(newPost)
      );

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
          <ArrowLeft size={24} className="dark:text-gray-300" />
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
            placeholder="Describe what you need help with... Be specific about location, time, and any requirements."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description.length}/500 characters</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('category')}</label>
          <div className="relative">
            <Tag size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400`} />
            <select
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('selectCategory')}</option>
              <option value="Moving">Moving</option>
              <option value="Pet Care">Pet Care</option>
              <option value="Borrow">Borrow Item</option>
              <option value="Assembly">Assembly</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('location')} *</label>
          <div className="relative">
            <MapPin size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400`} />
            <input
              type="text"
              placeholder={t('enterAddressOrSelect')}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button 
              type="button" 
              onClick={handleUseCurrentLocation}
              className="text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-500"
            >
              {t('useMyCurrentLocation')}
            </button>
            <span className="text-gray-400">|</span>
            <button 
              type="button" 
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-500"
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

        {/* Time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('when')}</label>
          <div className="relative">
            <Clock size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10`} />
            <input
              type="datetime-local"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700`}
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
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
