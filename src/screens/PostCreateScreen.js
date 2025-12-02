import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import MapView from '../components/Map';
import Icon from '../components/Icon';
import { colors, spacing } from '../styles/theme';

export default function PostCreateScreen({ navigation }) {
  const [what, setWhat] = useState('');
  const [angels, setAngels] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState('');
  const [details, setDetails] = useState('');
  const [where, setWhere] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>20 km</Text>
        <View style={styles.headerCenter}>
          <Icon name="location" size={20} color={colors.primary} />
          <Text style={styles.headerText}>15</Text>
        </View>
        <View style={styles.headerRight}>
          <Icon name="person" size={20} color={colors.primary} />
          <Text style={styles.headerText}>7</Text>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
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
              <Text style={styles.label}>What you need? *</Text>
              <TextInput
                style={styles.input}
                value={what}
                onChangeText={setWhat}
                placeholder="Enter what you need"
              />

              <Text style={styles.label}>How many Angels? *</Text>
              <TextInput
                style={styles.input}
                value={angels}
                onChangeText={setAngels}
                keyboardType="numeric"
                placeholder="Enter number"
              />

              <Text style={styles.label}>When? *</Text>
              <TextInput
                style={styles.input}
                value={when}
                onChangeText={setWhen}
                placeholder="Enter time"
              />

              <Text style={styles.label}>Duration of post? *</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="Enter duration"
              />

              <Text style={styles.label}>Details:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
                placeholder="Enter details"
              />

              <Text style={styles.label}>Where?</Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  value={where}
                  onChangeText={setWhere}
                  placeholder="Enter location"
                />
                <TouchableOpacity style={styles.locationButton}>
                  <Text style={styles.locationButtonText}>My Location</Text>
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
  label: {
    color: colors.overlayText,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.overlayText,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    justifyContent: 'center',
  },
  locationButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});


