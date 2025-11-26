import emailjs from '@emailjs/browser';

// EmailJS configuration
// To set up EmailJS:
// 1. Go to https://www.emailjs.com/
// 2. Create an account and add an email service (Gmail, Outlook, etc.)
// 3. Create an email template with variables: {{code}}, {{email}}
// 4. Get your Public Key, Service ID, and Template ID
// 5. Add them to your .env file or replace the values below

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

// Check if EmailJS is configured
export const isEmailJSConfigured = () => {
  return EMAILJS_PUBLIC_KEY !== 'your_public_key' && EMAILJS_SERVICE_ID !== 'your_service_id' && EMAILJS_TEMPLATE_ID !== 'your_template_id';
};

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY !== 'your_public_key') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Send verification code via email
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export const sendVerificationEmail = async (email, code) => {
  // If EmailJS is not configured, log the code for development
  if (EMAILJS_PUBLIC_KEY === 'your_public_key' || EMAILJS_SERVICE_ID === 'your_service_id' || EMAILJS_TEMPLATE_ID === 'your_template_id') {
    console.log('📧 EmailJS not configured. Verification code for', email, ':', code);
    console.log('To enable email sending, configure EmailJS in .env file');
    // Return true so user can still proceed (code is shown on screen)
    return true;
  }

  try {
    const templateParams = {
      to_email: email,
      email: email,
      code: code,
      from_name: 'DOTO',
      message: `Your verification code is: ${code}`,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Verification email sent successfully to', email, response);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    // Return false so the error can be shown to the user
    // The code is still stored in sessionStorage, so they can see it on screen
    return false;
  }
};

/**
 * Generate a random 6-digit verification code
 * @returns {string} - 6-digit code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

