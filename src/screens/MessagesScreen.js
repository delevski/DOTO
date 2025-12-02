import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { formatConversationTime } from '../utils/messaging';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

export default function MessagesScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations from InstantDB
  const { isLoading, data } = db.useQuery({ conversations: {} });
  const allConversations = data?.conversations || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Filter conversations for current user
  const myConversations = useMemo(() => {
    if (!user) return [];
    
    return allConversations
      .filter(conv => 
        conv.participant1Id === user.id || conv.participant2Id === user.id
      )
      .map(conv => {
        const isParticipant1 = conv.participant1Id === user.id;
        return {
          ...conv,
          otherUserId: isParticipant1 ? conv.participant2Id : conv.participant1Id,
          otherUserName: isParticipant1 ? conv.participant2Name : conv.participant1Name,
          otherUserAvatar: isParticipant1 ? conv.participant2Avatar : conv.participant1Avatar,
        };
      })
      .filter(conv => {
        if (!searchQuery.trim()) return true;
        return conv.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => (b.lastMessageTime || b.updatedAt || 0) - (a.lastMessageTime || a.updatedAt || 0));
  }, [allConversations, user, searchQuery]);

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: themeColors.surface }]}
      onPress={() => navigation.navigate('Chat', {
        conversationId: item.id,
        userName: item.otherUserName,
        userAvatar: item.otherUserAvatar,
        userId: item.otherUserId,
      })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.otherUserAvatar || `https://i.pravatar.cc/150?u=${item.otherUserId}` }}
        style={styles.avatar}
      />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.userName, { color: themeColors.text }]} numberOfLines={1}>
            {item.otherUserName || 'User'}
          </Text>
          <Text style={[styles.timestamp, { color: themeColors.textSecondary }]}>
            {formatConversationTime(item.lastMessageTime || item.updatedAt)}
          </Text>
        </View>
        <Text 
          style={[styles.lastMessage, { color: themeColors.textSecondary }]} 
          numberOfLines={1}
        >
          {item.lastMessage || 'Start a conversation...'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color={themeColors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {t('noConversations')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
        Start messaging by viewing a post and clicking "Send Message"
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('messages')}</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.surface }]}>
        <View style={[styles.searchBar, { borderColor: themeColors.border }]}>
          <Ionicons name="search-outline" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder={t('search')}
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={myConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            myConversations.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.xxl,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.md,
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyListContent: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.md,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: typography.xs,
  },
  lastMessage: {
    fontSize: typography.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
