import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import MapView, { MapMarker as Marker } from '../components/Map';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../styles/theme';

export default function MapScreen({ navigation }) {
  const [region] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const markers = [
    { id: 1, latitude: 37.7849, longitude: -122.4094, color: 'blue' },
    { id: 2, latitude: 37.7649, longitude: -122.4294, color: 'red' },
    { id: 3, latitude: 37.7749, longitude: -122.4194, color: 'blue' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>20 km</Text>
        <View style={styles.headerCenter}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={styles.headerText}>15</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={20} color={colors.primary} />
          <Text style={styles.headerText}>7</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            pinColor={marker.color}
          />
        ))}
        <Marker
          coordinate={region}
          pinColor="green"
        />
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.locationText}>
          14, Wallden St. Beverly Hills, California.
        </Text>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => navigation.navigate('PostCreate')}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton}>
            <Ionicons name="share-social" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkSecondary,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.darkSecondary,
    padding: spacing.md,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerButton: {
    padding: spacing.sm,
  },
  postButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'center',
  },
  postButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

