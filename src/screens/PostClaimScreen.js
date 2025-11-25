import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import MapView from '../components/Map';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../styles/theme';

export default function PostClaimScreen({ navigation, route }) {
  const post = route?.params?.post || {
    poster: 'John Denver',
    rating: 545,
    percentage: 96,
    title: 'Looking for Help with Carrying Groceries',
    expiresAt: '12:35 pm (in 35min.)',
    details: 'Carry to 4th floor, no Elevator',
    address: '12, Chicago St. New York, New York',
    eta: 'in 30 min.',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>20 km</Text>
        <View style={styles.headerCenter}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={styles.headerText}>15</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="person" size={20} color={colors.primary} />
          <Text style={styles.headerText}>7</Text>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 40.7128,
          longitude: -74.0060,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      <Modal
        visible={true}
        animationType="slide"
        transparent={true}
        onRequestClose={() => navigation.goBack()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.title}>Claim this Post?</Text>

              <View style={styles.posterInfo}>
                <Text style={styles.posterLabel}>By: {post.poster}</Text>
                <View style={styles.rating}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{post.rating}</Text>
                  <Text style={styles.percentageText}>{post.percentage}%</Text>
                </View>
              </View>

              <View style={styles.details}>
                <Text style={styles.detailLabel}>Post:</Text>
                <Text style={styles.detailText}>{post.title}</Text>

                <Text style={styles.detailLabel}>Expires at:</Text>
                <Text style={styles.detailText}>{post.expiresAt}</Text>

                <Text style={styles.detailLabel}>Details:</Text>
                <Text style={styles.detailText}>{post.details}</Text>

                <Text style={styles.detailText}>{post.address}</Text>
              </View>

              <TouchableOpacity style={styles.etaButton}>
                <Ionicons name="time" size={20} color={colors.white} />
                <Text style={styles.etaButtonText}>ETA: {post.eta}</Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.claimButton}>
                  <Text style={styles.claimButtonText}>Claim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <Ionicons name="share-social" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.overlayText,
    marginBottom: spacing.md,
  },
  posterInfo: {
    marginBottom: spacing.md,
  },
  posterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.overlayText,
    marginBottom: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    color: colors.overlayText,
  },
  percentageText: {
    fontSize: 14,
    color: colors.overlayText,
    marginLeft: spacing.xs,
  },
  details: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.overlayText,
    marginTop: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.overlayText,
    marginBottom: spacing.xs,
  },
  etaButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  etaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  claimButton: {
    backgroundColor: colors.primary,
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: spacing.md,
  },
});


