import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

let MapView, Marker;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function Map({ children, style, ...props }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, styles.webMap]}>
        <Text style={styles.webText}>Map is not fully supported on web yet.</Text>
        <Text style={styles.subText}>Please use the mobile app for the full experience.</Text>
      </View>
    );
  }

  return (
    <MapView style={style} {...props}>
      {children}
    </MapView>
  );
}

export function MapMarker(props) {
  if (Platform.OS === 'web') return null;
  return <Marker {...props} />;
}

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});

