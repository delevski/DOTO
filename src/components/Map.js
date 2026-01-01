import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function Map({ children, style, initialRegion, region, onRegionChangeComplete, ...props }) {
  const [mapError, setMapError] = useState(null);

  // Use initialRegion for initial load, then use region for controlled updates
  // Don't use both at the same time to avoid conflicts
  const mapProps = region 
    ? { region, onRegionChangeComplete }
    : { initialRegion, onRegionChangeComplete };

  // Handle map errors gracefully
  if (mapError) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.errorText}>Map Error</Text>
        <Text style={styles.errorSubtext}>
          {mapError.message || 'Unable to load map'}
        </Text>
      </View>
    );
  }

  return (
    <MapView
      style={[{ flex: 1 }, style]}
      {...mapProps}
      showsUserLocation={true}
      showsMyLocationButton={Platform.OS === 'android'}
      onMapReady={() => setMapError(null)}
      onError={(error) => {
        console.error('MapView error:', error);
        setMapError(error);
      }}
      {...props}
    >
      {children}
    </MapView>
  );
}

export function MapMarker({ coordinate, title, description, onPress, ...props }) {
  if (!coordinate || !coordinate.latitude || !coordinate.longitude) {
    return null;
  }

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      onPress={onPress}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
