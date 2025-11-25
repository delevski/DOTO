import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Filter } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';

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

const CENTER_POS = [40.7128, -74.0060]; // NYC

// Helper function to extract coordinates from location string or use default
const getCoordinates = (location, index) => {
  // In a real app, you'd geocode the location string
  // For now, we'll use a simple offset based on index to show multiple markers
  const offset = index * 0.01;
  return [CENTER_POS[0] + offset, CENTER_POS[1] + offset];
};

export default function MapView() {
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch posts from InstantDB
  const { isLoading, error, data } = db.useQuery({ posts: {} });
  const posts = data?.posts || [];

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
        <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 128px)' }}>
      {/* Map Controls */}
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 flex-1 max-w-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-1">
            <Search size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none`} />
            <input 
              type="text" 
              placeholder={t('search') + '...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 dark:text-white`}
            />
          </div>
          <button className={`px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Filter size={18} />
            Filters
          </button>
        </div>
        <div className={`${isRTL ? 'mr-4' : 'ml-4'} flex items-center gap-3`}>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapContainer 
          center={CENTER_POS} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          key="map-container"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredPosts.length === 0 ? (
            <Marker position={CENTER_POS}>
              <Popup>
                <div className="p-2">
                  <p className="text-sm text-gray-600">No posts found</p>
                </div>
              </Popup>
            </Marker>
          ) : (
            filteredPosts.map((post, index) => {
              const coords = getCoordinates(post.location, index);
              return (
                <Marker key={post.id} position={coords}>
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white">{post.title || 'Help Needed'}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{post.location || 'Location not specified'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 line-clamp-2">{post.description}</p>
                      <Link 
                        to={`/post/${post.id}`} 
                        className="text-red-600 dark:text-red-400 text-xs font-semibold hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
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
