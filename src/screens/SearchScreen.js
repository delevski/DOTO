import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing } from '../styles/theme';

const locations = [
  { id: 1, name: 'Gordon Flowers', address: 'Tel Aviv-Yafo 98 בן יהודה', icon: 'cart' },
  { id: 2, name: 'Deborah Hotel', address: 'Ben Yehuda Street 87, Tel Aviv-Yafo', icon: 'bed' },
  { id: 3, name: 'Tamara Yogurt', address: 'Ben Yehuda Street 96, Tel Aviv-Yafo', icon: 'restaurant' },
  { id: 4, name: 'Stern Gallery', address: 'J. L. Gordon Street 30', icon: 'star' },
  { id: 5, name: 'Reflexology Wellness Clinic', address: '21 Gordon Street, Tel Aviv-Yafo', icon: 'medical' },
];

const iconMap = {
  cart: 'cart',
  bed: 'bed',
  restaurant: 'restaurant',
  star: 'star',
  medical: 'medical',
};

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('NEARBY');

  const tabs = ['RECENT', 'NEARBY', 'AIRPORTS', 'TRAIN STATION'];

  const renderLocation = ({ item }) => (
    <TouchableOpacity style={styles.locationItem}>
      <Icon
        name={iconMap[item.icon] || 'location'}
        size={24}
        color={colors.primary}
        style={styles.locationIcon}
      />
      <View style={styles.locationInfo}>
        <Text style={styles.locationName}>{item.name}</Text>
        <Text style={styles.locationAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Look for Posts</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Q Search address"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={locations}
        renderItem={renderLocation}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY Google</Text>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="home" size={24} color={colors.white} />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="briefcase" size={24} color={colors.white} />
            <Text style={styles.navText}>Work</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="star" size={24} color={colors.white} />
            <Text style={styles.navText}>Favorites</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.darkSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkSecondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  locationItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  locationIcon: {
    marginRight: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    backgroundColor: colors.darkSecondary,
    padding: spacing.md,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  navText: {
    color: colors.white,
    fontSize: 12,
  },
});


