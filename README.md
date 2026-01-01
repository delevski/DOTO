# DOTO - Location-Based Help App

DOTO is a multi-platform application designed to connect people who need help with "angels" in their vicinity who can provide assistance. It features a real-time mobile application built with React Native and Expo, and a web-based administration and tracking interface.

## Architecture

The project follows a modern serverless-first architecture using InstantDB for real-time data synchronization and authentication.

### System Overview

```mermaid
graph TD
    subgraph "Client Layer"
        Mobile["Mobile App (React Native/Expo)"]
        Web["Web App (React/Vite)"]
    end

    subgraph "Data & Backend Layer"
        InstantDB["InstantDB (BaaS)"]
        PushProxy["Push Proxy Server (Node.js)"]
    end

    subgraph "Third-Party Services"
        GoogleAuth["Google OAuth"]
        FacebookAuth["Facebook Login"]
        FCM["Firebase Cloud Messaging"]
        ExpoPush["Expo Push API"]
    end

    %% Auth Flow
    Mobile -- "OAuth" --> GoogleAuth
    Mobile -- "Native SDK" --> FacebookAuth
    Web -- "OAuth" --> GoogleAuth
    Web -- "OAuth" --> FacebookAuth
    
    GoogleAuth -.-> InstantDB
    FacebookAuth -.-> InstantDB

    %% Data Sync
    Mobile <-->|Real-time Sync| InstantDB
    Web <-->|Real-time Sync| InstantDB

    %% Push Notifications
    Web -- "HTTPS Request" --> PushProxy
    PushProxy -- "FCM v1" --> FCM
    PushProxy -- "Expo SDK" --> ExpoPush
    
    FCM -- "Push Payload" --> Mobile
    ExpoPush -- "Push Payload" --> Mobile
```

### Push Notification Flow

```mermaid
sequenceDiagram
    participant W as Web App
    participant I as InstantDB
    participant P as Push Proxy
    participant E as External (FCM/Expo)
    participant M as Mobile App

    W->>I: Fetch Recipient's Token & Language
    I-->>W: Returns token (Expo or FCM)
    W->>P: POST /api/smart/send {token, title, body}
    Note right of P: Detects token type automatically
    alt Expo Token
        P->>E: Forward to Expo Push API
    else FCM Token
        P->>E: Forward to FCM v1 API
    end
    E-->>M: Deliver Push Notification
```

## Key Technologies

- **Mobile**: React Native, Expo, React Navigation, Zustand
- **Web**: React, Vite, Tailwind CSS, Zustand
- **Backend/Database**: InstantDB (Real-time BaaS)
- **Push Notifications**: Node.js Proxy (Express, Firebase Admin SDK)
- **Authentication**: Google OAuth, Native Facebook SDK

## Getting Started

### Mobile App
- Root directory contains the Expo project.
- Run `npm install` and then `npx expo start`.
- Refer to [docs/README.md](docs/README.md) for more mobile-specific details.

### Web App
- Located in the `webapp/` directory.
- Run `cd webapp && npm install` and then `npm run dev`.
- Refer to [webapp/PUSH_PROXY_README.md](webapp/PUSH_PROXY_README.md) for push notification setup.

## Project Structure

- `src/`: Core logic for the mobile application.
- `webapp/`: Source code for the web client and push proxy server.
- `android/`: Native Android project files.
- `docs/`: Additional project documentation.
