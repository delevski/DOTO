import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      content: (
        <div className="space-y-4">
          <p>
            Welcome to DOTO ("Do One Thing Others"). We are committed to protecting your privacy and ensuring transparency about how we collect, use, and safeguard your personal information. This Privacy Policy explains our practices regarding data collection, usage, and your rights as a user of our platform.
          </p>
          <p>
            By using DOTO, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
          </p>
          <div>
            <h4 className="font-semibold mb-2">Definitions</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>"We," "Us," "Our"</strong> refers to [Company Name], the operator of DOTO</li>
              <li><strong>"You," "Your," "User"</strong> refers to individuals who use the DOTO platform</li>
              <li><strong>"Service"</strong> refers to the DOTO web application and mobile application</li>
              <li><strong>"Personal Data"</strong> refers to any information that can identify you as an individual</li>
              <li><strong>"Post"</strong> refers to help requests or offers created by users on the platform</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'information-collected',
      title: '2. Information We Collect',
      content: (
        <div className="space-y-6">
          <p>We collect several types of information to provide and improve our service:</p>
          
          <div>
            <h4 className="font-semibold mb-2">2.1 Account Information</h4>
            <p className="mb-2">When you register for an account, we collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Age (must be 13 or older)</li>
              <li>Location (city, state, or address)</li>
              <li>Password (stored as a hashed value, never in plain text)</li>
              <li>Profile image/avatar</li>
              <li>Bio (optional)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2.2 Authentication Information</h4>
            <p className="mb-2">If you choose to sign in using social authentication:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Google Sign-In:</strong> We receive your name, email address, profile picture, and email verification status from Google</li>
              <li><strong>Facebook Login:</strong> We receive your name, email address, profile picture, and Facebook ID from Facebook</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2.3 Post Information</h4>
            <p className="mb-2">When you create a post, we collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Post title and description</li>
              <li>Location (address and GPS coordinates)</li>
              <li>Category/tags</li>
              <li>Timeframe or deadline</li>
              <li>Photos/images (stored as base64 data URLs)</li>
              <li>Timestamp of creation</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2.4 Messaging Data</h4>
            <p className="mb-2">When you communicate with other users:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Messages sent and received</li>
              <li>Images shared in messages</li>
              <li>Conversation metadata (participants, timestamps)</li>
              <li>Message timestamps</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2.5 Location Data</h4>
            <p className="mb-2">We collect location information when you:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Create a post with location</li>
              <li>Use the "Use My Current Location" feature</li>
              <li>Select a location on the map</li>
              <li>View location-based posts</li>
            </ul>
            <p className="mt-2">This includes GPS coordinates (latitude and longitude), street addresses, and location preferences.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2.6 Technical Information</h4>
            <p className="mb-2">Automatically collected technical data:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>IP address</li>
              <li>Operating system</li>
              <li>Pages visited and time spent on pages</li>
              <li>Language preferences</li>
              <li>Dark mode preferences</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'how-we-use',
      title: '3. How We Use Your Information',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">3.1 Service Provision</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To create and manage your account</li>
              <li>To enable you to create and view posts</li>
              <li>To facilitate communication between users</li>
              <li>To provide location-based features and map functionality</li>
              <li>To match users who need help with those who can provide it</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3.2 Authentication & Security</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To verify your identity during login</li>
              <li>To send verification codes to your email</li>
              <li>To secure your account and prevent unauthorized access</li>
              <li>To authenticate social login providers (Google, Facebook)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3.3 Communication</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To enable messaging between users</li>
              <li>To send verification emails</li>
              <li>To notify you of important account-related information</li>
              <li>To facilitate communication about posts and claims</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'third-party',
      title: '4. Third-Party Services',
      content: (
        <div className="space-y-4">
          <p>DOTO uses several third-party services that may collect or process your data:</p>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold mb-2">4.1 InstantDB</h4>
              <p className="text-sm mb-2"><strong>Purpose:</strong> Database and real-time data synchronization</p>
              <p className="text-sm mb-2"><strong>Data Shared:</strong> All user data, posts, messages, and conversations</p>
              <p className="text-sm"><strong>Location:</strong> Data may be stored on servers outside Israel</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold mb-2">4.2 Google OAuth</h4>
              <p className="text-sm mb-2"><strong>Purpose:</strong> Google Sign-In authentication</p>
              <p className="text-sm mb-2"><strong>Data Shared:</strong> Name, email, profile picture (as provided by Google)</p>
              <p className="text-sm"><strong>Location:</strong> United States</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold mb-2">4.3 Facebook SDK</h4>
              <p className="text-sm mb-2"><strong>Purpose:</strong> Facebook Login authentication</p>
              <p className="text-sm mb-2"><strong>Data Shared:</strong> Name, email, profile picture, Facebook ID</p>
              <p className="text-sm"><strong>Location:</strong> United States</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold mb-2">4.4 EmailJS</h4>
              <p className="text-sm mb-2"><strong>Purpose:</strong> Sending verification emails</p>
              <p className="text-sm mb-2"><strong>Data Shared:</strong> Email address and verification codes</p>
              <p className="text-sm"><strong>Location:</strong> United States</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold mb-2">4.5 OpenStreetMap / Nominatim</h4>
              <p className="text-sm mb-2"><strong>Purpose:</strong> Reverse geocoding (converting coordinates to addresses)</p>
              <p className="text-sm mb-2"><strong>Data Shared:</strong> GPS coordinates (latitude and longitude)</p>
              <p className="text-sm"><strong>Location:</strong> Various locations globally</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-security',
      title: '5. Data Storage & Security',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">5.1 Where Your Data is Stored</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your data is primarily stored in InstantDB's cloud infrastructure</li>
              <li>Some data is stored locally in your browser (localStorage for authentication state, sessionStorage for temporary verification codes)</li>
              <li>Profile images may be stored as data URLs or hosted on third-party services</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">5.2 Security Measures</h4>
            <p className="mb-2">We implement various security measures to protect your data:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Password Security:</strong> Passwords are hashed using secure cryptographic algorithms and never stored in plain text</li>
              <li><strong>Authentication:</strong> Multi-factor authentication through email verification codes</li>
              <li><strong>Data Encryption:</strong> Data transmitted between your device and our servers is encrypted using HTTPS/TLS</li>
              <li><strong>Access Controls:</strong> User authentication required to access personal data</li>
              <li><strong>Secure Storage:</strong> Sensitive data is stored securely in encrypted databases</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'user-rights',
      title: '6. Your Rights',
      content: (
        <div className="space-y-4">
          <p>Under Israeli privacy laws and GDPR (if applicable), you have the following rights:</p>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">6.1 Right to Access</h4>
              <p className="text-sm">You have the right to request a copy of all personal data we hold about you. You can access much of this information directly through your account settings.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">6.2 Right to Rectification</h4>
              <p className="text-sm">You can update your personal information at any time through profile settings, edit profile page, or account settings.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">6.3 Right to Erasure (Right to be Forgotten)</h4>
              <p className="text-sm">You have the right to request deletion of your account and all associated data. Contact us at [Privacy Contact Email] to make this request. We will delete your account, posts, messages, and personal data within 30 days.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">6.4 Right to Data Portability</h4>
              <p className="text-sm">You can request a copy of your data in a machine-readable format. Contact us at [Privacy Contact Email] to make this request.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">6.5 Right to Object</h4>
              <p className="text-sm">You can object to certain processing of your data, such as location tracking (you can disable location services in your browser/device settings) or email notifications (you can opt-out in account settings).</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-retention',
      title: '7. Data Retention',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">7.1 Active Accounts</h4>
            <p>We retain your data for as long as your account is active and you continue to use our service.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">7.2 Deleted Accounts</h4>
            <p className="mb-2">When you delete your account:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your account information is deleted within 30 days</li>
              <li>Your posts may be anonymized or deleted (depending on your preference)</li>
              <li>Messages in conversations with other users may be retained (as they are part of other users' conversations)</li>
              <li>Some data may be retained for legal or operational purposes as required by law</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">7.3 Verification Codes</h4>
            <p>Verification codes stored in session storage are automatically deleted when you close your browser session, the verification process is completed, or the session expires.</p>
          </div>
        </div>
      )
    },
    {
      id: 'cookies-storage',
      title: '8. Cookies & Local Storage',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">8.1 Local Storage</h4>
            <p>We use browser localStorage to store authentication state (to keep you logged in) and user preferences (language, dark mode settings). This data persists until you clear your browser storage or delete your account.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.2 Session Storage</h4>
            <p>We use browser sessionStorage to store temporary verification codes and pending login context. This data is automatically cleared when you close your browser.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.3 Cookies</h4>
            <p>We may use cookies for authentication purposes, remembering your preferences, and analytics (if implemented). You can control cookies through your browser settings. Note that disabling cookies may affect the functionality of our service.</p>
          </div>
        </div>
      )
    },
    {
      id: 'children-privacy',
      title: '9. Children\'s Privacy',
      content: (
        <div>
          <p className="mb-2">DOTO is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at [Privacy Contact Email], and we will delete such information.</p>
          <p>If you are between 13 and 18 years old, you must have your parent's or guardian's permission to use DOTO.</p>
        </div>
      )
    },
    {
      id: 'international-transfers',
      title: '10. International Data Transfers',
      content: (
        <div className="space-y-4">
          <p>Your data may be transferred to and stored on servers located outside of Israel, including InstantDB servers, third-party service providers (Google, Facebook, EmailJS) primarily in the United States, and OpenStreetMap services globally.</p>
          <p>When we transfer data internationally, we ensure appropriate safeguards are in place, including standard contractual clauses, adequate security measures, and compliance with applicable privacy laws.</p>
          <p className="font-semibold">By using DOTO, you consent to the transfer of your data to these locations.</p>
        </div>
      )
    },
    {
      id: 'location-israel',
      title: '11. Location Data & Israel-Specific Features',
      content: (
        <div className="space-y-4">
          <p>DOTO is designed to operate within Israel. We restrict post creation to locations within Israel, validate GPS coordinates to ensure they are within Israeli borders, and use location data to provide location-based matching and search.</p>
          <p>Your location data is used solely for matching you with nearby posts, displaying posts on the map, calculating distances, and providing location-based search results.</p>
          <p>You can control location sharing through your browser's location permissions, device location settings, or by not using location-based features.</p>
        </div>
      )
    },
    {
      id: 'policy-changes',
      title: '12. Changes to This Privacy Policy',
      content: (
        <div>
          <p className="mb-2">We may update this Privacy Policy from time to time. We will notify you of any changes by:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the "Last Updated" date at the top of this policy</li>
            <li>Sending you an email notification (if you have provided an email address)</li>
            <li>Displaying a prominent notice in the application</li>
          </ul>
          <p className="mt-2">You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
        </div>
      )
    },
    {
      id: 'contact',
      title: '13. Contact Information',
      content: (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          <div className="space-y-2">
            <p><strong>Company Name:</strong> [Company Name]</p>
            <p><strong>Privacy Contact Email:</strong> [Privacy Contact Email]</p>
            <p><strong>Address:</strong> [Company Address]</p>
          </div>
          <p className="text-sm">We will respond to your inquiry within 30 days.</p>
        </div>
      )
    },
    {
      id: 'consent',
      title: '14. Consent',
      content: (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="mb-2">By using DOTO, you consent to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>The collection and use of information as described in this Privacy Policy</li>
            <li>The transfer of your data to third-party services as outlined</li>
            <li>The storage of your data on servers that may be located outside Israel</li>
          </ul>
          <p className="mt-2 font-semibold">If you do not consent to any part of this Privacy Policy, please do not use our service.</p>
        </div>
      )
    }
  ];

  return (
    <div className={`max-w-4xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className={`dark:text-gray-300 ${isRTL ? 'rtl-flip' : ''}`} />
        </button>
        <div className="flex items-center gap-3">
          <Shield size={32} className="text-red-600 dark:text-red-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Last Updated:</strong> [Date]
        </p>
      </div>

      {/* Privacy Policy Content */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div 
            key={section.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h2>
              {expandedSections[section.id] ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            {expandedSections[section.id] && (
              <div className="px-6 pb-6 text-gray-700 dark:text-gray-300">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          <strong>Effective Date:</strong> [Date] | <strong>Last Updated:</strong> [Date]
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
          This Privacy Policy is effective as of the date listed above and will remain in effect except with respect to any changes in its provisions in the future, which will take effect immediately after being posted on this page.
        </p>
      </div>
    </div>
  );
}

