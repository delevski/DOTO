import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Image, Tag, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';

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

// Component to handle map clicks for location selection
function LocationPicker({ onLocationSelect, selectedLocation }) {
  const [position, setPosition] = useState(selectedLocation || [40.7128, -74.0060]);
  
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect([lat, lng]);
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

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Create object URLs for preview (in production, you'd upload to storage first)
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    // Revoke object URL to free memory
    URL.revokeObjectURL(photos[index].preview);
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleLocationSelect = (coords) => {
    setSelectedCoordinates(coords);
    // In a real app, you'd reverse geocode the coordinates to get an address
    // For now, we'll just update the location field with coordinates
    setLocation(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedCoordinates([latitude, longitude]);
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your current location. Please enter it manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to create a post');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPostId = id();
      const newPost = {
        id: newPostId,
        author: user.name,
        authorId: user.id,
        avatar: user.avatar,
        title: title.trim() || 'Help Needed',
        description: description.trim(),
        location: location.trim(),
        category: category || 'Other',
        tag: category || 'Other',
        distance: 'Nearby', // In a real app, calculate this
        time: timeframe || 'Flexible',
        timeframe: timeframe || null,
        timestamp: Date.now(),
        photos: photos.map(p => p.preview), // Store photo preview URLs (in production, upload to storage and store URLs)
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
      setError(err.message || 'Failed to create post. Please try again.');
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
            <div className="text-sm text-gray-500 dark:text-gray-400">What do you need help with?</div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title (Optional)</label>
          <input
            type="text"
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder="Brief title for your post..."
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
              <option value="">Select a category</option>
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
              placeholder="Enter address or select on map"
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
              Use my current location
            </button>
            <span className="text-gray-400">|</span>
            <button 
              type="button" 
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-500"
            >
              {showMapPicker ? 'Hide map' : 'Select on map'}
            </button>
          </div>
          {showMapPicker && (
            <div className="mt-4 h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
              <MapContainer 
                center={selectedCoordinates || [40.7128, -74.0060]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
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
            <span className="font-medium">Click to upload or drag and drop</span>
            <span className="text-sm">PNG, JPG up to 10MB</span>
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
                Publishing...
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
