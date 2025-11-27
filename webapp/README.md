# DOTO Web App

A React + Vite application for the DOTO (Do One Thing Others) community platform.

## Features

- User authentication (email/phone verification and Google OAuth)
- Community feed and posts
- Interactive map view
- User profiles and messaging
- Real-time data with InstantDB

## Authentication Setup

The app supports multiple authentication methods: email/password, Google OAuth, and Facebook OAuth. All authentication methods require email verification.

### Environment Variables

Create a `.env` file in the `webapp` directory with the following variables:

```env
# Google OAuth (Optional - for Google Sign-In)
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# Facebook OAuth (Optional - for Facebook Sign-In)
VITE_FACEBOOK_APP_ID=your-facebook-app-id-here

# EmailJS (Optional - for sending verification emails)
VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
VITE_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
```

**Note:** All environment variables are optional. The app will work without them, but:
- Without Google/Facebook IDs: Social login buttons will be disabled
- Without EmailJS: Verification codes will be displayed on screen (for development)

### Google OAuth Setup

To enable Google Sign-In functionality:

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Add authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - Your production domain

4. **Add to `.env` file:**
   ```
   VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   ```

The Google Sign-In button will automatically appear on login and registration pages once configured.

### Facebook OAuth Setup

To enable Facebook Sign-In functionality:

1. **Create a Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app or select an existing one
   - Add "Facebook Login" product to your app

2. **Configure Facebook Login**
   - Go to "Settings" > "Basic"
   - Add your domain to "App Domains"
   - Add authorized redirect URIs in "Valid OAuth Redirect URIs"

3. **Add to `.env` file:**
   ```
   VITE_FACEBOOK_APP_ID=your-facebook-app-id-here
   ```

The Facebook Sign-In button will automatically appear on login and registration pages once configured.

### EmailJS Setup (for Email Verification)

To enable email verification code sending:

1. **Create an EmailJS Account**
   - Go to [EmailJS](https://www.emailjs.com/)
   - Create an account and add an email service (Gmail, Outlook, etc.)

2. **Create an Email Template**
   - Create a template with variables: `{{code}}`, `{{email}}`
   - Note your Service ID, Template ID, and Public Key

3. **Add to `.env` file:**
   ```
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```

**Note:** Without EmailJS configured, verification codes will be displayed on screen for development purposes.

### Restart Development Server

After configuring environment variables:
- Stop your dev server (if running)
- Run `npm run dev` again to load the new environment variables

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
