import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { language } = useSettingsStore();
  const isRTL = language === 'he';
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [showVerification, setShowVerification] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize settings on mount
    const settingsStore = useSettingsStore.getState();
    settingsStore.initSettings();
  }, []);

  // Generate a 6-digit verification code (in production, send via email)
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Store verification code temporarily (in production, send via email)
    sessionStorage.setItem('verification_code', verificationCode);
    sessionStorage.setItem('phone', phone.trim());
    sessionStorage.setItem('email', email.trim());
    
    // Check if user exists in InstantDB (we'll check this after verification)
    // For now, assume new user - will be checked after code verification
    setIsNewUser(true); // Default to new user, will be updated after verification
    
    setShowVerification(true);
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    const enteredCode = verificationCode.join('');
    const storedCode = sessionStorage.getItem('verification_code');

    if (enteredCode !== storedCode) {
      setError('Invalid verification code. Please try again.');
      return;
    }

    // After verification, always go to register
    // Register page will check if user exists and update or create accordingly
    navigate('/register');
  };
  return (
    <div className={`min-h-screen flex ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-rose-500 to-pink-500 p-12 flex-col justify-between text-white relative overflow-hidden ${isRTL ? 'order-2' : ''}`}>
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold mb-4">DOTO</h1>
          <p className="text-xl text-red-50 mb-2">Do One Thing Others</p>
          <p className="text-red-100">Building a community where neighbors help neighbors</p>
        </div>
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-lg font-semibold mb-2">Join thousands helping their community</p>
            <div className="flex gap-4 text-sm text-red-50">
              <div>
                <div className="font-bold text-white text-2xl">10K+</div>
                <div>Active Users</div>
              </div>
              <div>
                <div className="font-bold text-white text-2xl">50K+</div>
                <div>Tasks Completed</div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className={`flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 ${isRTL ? 'order-1' : ''}`}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent mb-2">DOTO</h1>
            <p className="text-gray-500 dark:text-gray-400">Do One Thing Others</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            {!showVerification ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to continue helping your community</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handlePhoneSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="your.email@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      We'll send the verification code to this email
                    </p>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                  >
                    Send Verification Code
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowVerification(false);
                    setVerificationCode(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className={`mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enter Verification Code</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  We sent a 6-digit code to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>. Please check your email and enter it below.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                      Verification Code
                    </label>
                    <div className={`flex gap-2 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                      Verification code sent to: <span className="font-semibold">{email}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                      Demo code: {sessionStorage.getItem('verification_code')} (Remove in production)
                    </p>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={verificationCode.join('').length !== 6}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Verify Code
                  </button>
                </form>
              </>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </div>
          </div>

          {!showVerification && (
            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account? <Link to="/register" className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-500">Sign up</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
