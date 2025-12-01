import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText, Upload, X } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch user's posts and comments to update them
  const { data } = db.useQuery({
    posts: {
      $: {
        where: { authorId: user?.id }
      }
    },
    comments: {
      $: {
        where: { authorId: user?.id }
      }
    },
    claimedPosts: {
      $: {
        where: { claimedBy: user?.id }
      }
    }
  });

  const userPosts = data?.posts || [];
  const userComments = data?.comments || [];
  const claimedPosts = data?.claimedPosts || [];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const updatedName = formData.name.trim();
      const updatedAvatar = avatar || user.avatar;

      // Update user profile in store
      updateProfile({
        ...formData,
        avatar: updatedAvatar,
      });

      // Update all user's posts
      const postUpdates = userPosts.map(post => 
        db.tx.posts[post.id].update({
          author: updatedName,
          avatar: updatedAvatar
        })
      );

      // Update all user's comments
      const commentUpdates = userComments.map(comment => 
        db.tx.comments[comment.id].update({
          author: updatedName,
          avatar: updatedAvatar
        })
      );

      // Update claimedByName in posts where user claimed them
      const claimedUpdates = claimedPosts.map(post => 
        db.tx.posts[post.id].update({
          claimedByName: updatedName
        })
      );

      // Execute all updates in a single transaction
      if (postUpdates.length > 0 || commentUpdates.length > 0 || claimedUpdates.length > 0) {
        db.transact(
          ...postUpdates,
          ...commentUpdates,
          ...claimedUpdates
        );
      }

      setTimeout(() => {
        navigate('/profile');
      }, 500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      setIsSaving(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`max-w-3xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className={`dark:text-gray-300 ${isRTL ? 'rtl-flip' : ''}`} />
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('editProfile')}</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img 
              src={avatar || user?.avatar} 
              alt="Profile" 
              className="w-32 h-32 rounded-2xl object-cover ring-4 ring-gray-100 dark:ring-gray-700" 
            />
            <label className="absolute bottom-0 end-0 bg-red-600 text-white p-3 rounded-full cursor-pointer hover:bg-red-700 transition-colors shadow-lg">
              <Upload size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar('')}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700"
            >
              {t('removePhoto')}
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <User size={16} />
            {t('name')} *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Mail size={16} />
            {t('email')} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Phone size={16} />
            {t('phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <MapPin size={16} />
            {t('location')}
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <FileText size={16} />
            {t('bio')}
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full p-4 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder={t('tellUsAboutYourselfPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className={`flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 button-center-text"
            style={{ textAlign: 'center', justifyContent: 'center', display: 'flex' }}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('save')}...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Save size={20} />
                <span>{t('save')}</span>
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

