import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, MapPin, Mail } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  const phone = sessionStorage.getItem('phone') || '';
  const email = sessionStorage.getItem('email') || '';
  
  // Query for existing user
  const { data: usersData } = db.useQuery({
    users: phone ? {
      $: {
        where: { phone: phone }
      }
    } : {}
  });

  const existingUser = usersData?.users?.[0];

  const [formData, setFormData] = useState({
    name: existingUser?.name || '',
    email: existingUser?.email || email || '',
    age: existingUser?.age?.toString() || '',
    location: existingUser?.location || '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(existingUser?.avatar || null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Redirect to login if no phone number or email
    if (!phone || !email) {
      navigate('/login');
    }
  }, [phone, email, navigate]);

  useEffect(() => {
    // Update form when existing user data loads
    if (existingUser) {
      setFormData({
        name: existingUser.name || '',
        email: existingUser.email || email || '',
        age: existingUser.age?.toString() || '',
        location: existingUser.location || '',
      });
      setProfileImagePreview(existingUser.avatar || null);
    }
  }, [existingUser, email]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('imageSizeShouldBeLess'));
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('pleaseEnterName'));
      return;
    }

    if (!formData.email.trim()) {
      setError(t('pleaseEnterEmail'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError(t('pleaseEnterValidEmail'));
      return;
    }

    if (!formData.age || parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
      setError(t('pleaseEnterValidAge'));
      return;
    }

    if (!formData.location.trim()) {
      setError(t('pleaseEnterLocation'));
      return;
    }

    if (!phone) {
      setError(t('phoneNumberNotFound'));
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setIsSubmitting(true);

    try {
      // In production, upload image to cloud storage and get URL
      // For now, use data URL or placeholder
      const avatarUrl = profileImagePreview || 'https://i.pravatar.cc/150?u=' + formData.name;

      let userId;
      let userData;

      if (existingUser) {
        // Update existing user
        userId = existingUser.id;
        userData = {
          ...existingUser,
          name: formData.name.trim(),
          email: formData.email.trim(),
          age: parseInt(formData.age),
          location: formData.location.trim(),
          avatar: avatarUrl,
          updatedAt: Date.now(),
        };
      } else {
        // Create new user
        userId = id();
        userData = {
          id: userId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          age: parseInt(formData.age),
          location: formData.location.trim(),
          phone: phone,
          avatar: avatarUrl,
          rating: 0,
          bio: '',
          createdAt: Date.now(),
        };
      }

      // Save/update user in InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );

      // Login the user
      login(userData);

      // Clear session storage
      sessionStorage.removeItem('verification_code');
      sessionStorage.removeItem('phone');
      sessionStorage.removeItem('email');

      // Navigate to feed
      setTimeout(() => {
        navigate('/feed');
      }, 500);
    } catch (err) {
      console.error('Failed to register:', err);
      setError(err.message || t('failedToRegister'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : ''}`}>
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {existingUser ? t('updateYourProfile') : t('completeYourProfile')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {existingUser ? t('updateYourInformation') : t('tellUsAboutYourself')}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profileImage')}
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {profileImagePreview ? t('changeImage') : t('uploadImage')}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('pngJpgUpTo5MB')}</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('fullName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('emailAddress')} *
              </label>
              <div className="relative">
                <Mail size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  required
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('age')} *
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
                min="13"
                max="120"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400`} />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State or Address"
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  required
                />
              </div>
            </div>

            {/* Phone (read-only, from verification) */}
            {phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 p-3.5 rounded-xl cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('verifiedViaEmail')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting 
                ? (existingUser ? t('updatingProfile') : t('creatingAccount')) 
                : (existingUser ? t('updateProfile') : t('completeRegistration'))}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

