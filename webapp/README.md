# DOTO Web App

A React + Vite application for the DOTO (Do One Thing Others) community platform.

## Features

- User authentication (email/phone verification and Google OAuth)
- Community feed and posts
- Interactive map view
- User profiles and messaging
- Real-time data with InstantDB

## Google OAuth Setup

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

4. **Configure Environment Variables**
   - Create a `.env` file in the `webapp` directory
   - Add your Google Client ID:
     ```
     VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
     ```

5. **Restart Development Server**
   - Stop your dev server (if running)
   - Run `npm run dev` again to load the new environment variable

The Google Sign-In button will automatically appear on the login page once configured.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
