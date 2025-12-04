import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder Map component
// react-native-maps requires additional native setup
// For now, using a placeholder that shows location text

export default function Map({ children, style, initialRegion, ...props }) {
  return (
    <View style={[style, styles.mapContainer]}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>Map View</Text>
        {initialRegion && (
          <Text style={styles.coordsText}>
            {initialRegion.latitude?.toFixed(4)}, {initialRegion.longitude?.toFixed(4)}
          </Text>
        )}
        <Text style={styles.subText}>
          Map functionality available in full release
        </Text>
      </View>
      {children}
    </View>
  );
}

export function MapMarker({ coordinate, title, description, ...props }) {
  // Placeholder marker - renders nothing visible
  // In production, would render actual map markers
  return null;
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  mapText: {
    color: '#333333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coordsText: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 8,
  },
  subText: {
    color: '#888888',
    fontSize: 12,
  },
});
