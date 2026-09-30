# PriceWatch Mobile App

React Native (Expo) mobile application for price monitoring.

## Features

- Add Amazon/Flipkart product links
- View watch list
- Price history charts (skeleton)
- Push notifications for price alerts
- Set target prices

## Setup

```bash
npm install
npm start
```

## Push Notifications

Push notifications use Firebase Cloud Messaging (FCM). To enable:

1. Create a Firebase project at https://console.firebase.google.com/
2. Add an Android app with package `com.pricewatch.app`
3. Download `google-services.json` and place it in this directory
4. Configure FCM credentials in the API `.env` file

## Development

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser

## Note

This is a working skeleton implementation. The app connects to the API and demonstrates core functionality. Production use would require:

- User authentication
- Enhanced UI/UX
- Offline support
- Image optimization
- Error boundaries
- Analytics
