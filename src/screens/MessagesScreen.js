import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';

export default function MessagesScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);

  // Fetch conversations from InstantDB
  const { isLoading, data } = db.useQuery({ 
    conversations: {},
    messages: {}
  });

  const allConversations = data?.conversations || [];
  const allMessages = data?.messages || [];

  // Filter conversations for current user
  const userConversations = allConversations.filter(conv => 
    conv.participant1Id === user?.id || conv.participant2Id === user?.id
  ).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getOtherParticipant = (conversation) => {
    if (conversation.participant1Id === user?.id) {
      return {
        id: conversation.participant2Id,
        name: conversation.participant2Name,
        avatar: conversation.participant2Avatar,
      };
    }
    return {
      id: conversation.participant1Id,
      name: conversation.participant1Name,
      avatar: conversation.participant1Avatar,
    };
  };

  const getUnreadCount = (conversationId) => {
    return allMessages.filter(
      m => m.conversationId === conversationId && 
           m.senderId !== user?.id && 
           !m.read
    ).length;
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Login Required</Text>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          Please login to view your messages
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Messages</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          Your conversations
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading conversations...
          </Text>
        </View>
      ) : userConversations.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Messages Yet</Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            Start a conversation by messaging someone from their post
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conversationsList}>
          {userConversations.map((conversation) => {
            const other = getOtherParticipant(conversation);
            const unreadCount = getUnreadCount(conversation.id);

            return (
              <TouchableOpacity
                key={conversation.id}
                style={[styles.conversationItem, { backgroundColor: themeColors.surface }]}
                onPress={() => navigation.navigate('Chat', {
                  conversationId: conversation.id,
                  userName: other.name,
                  userAvatar: other.avatar,
                  userId: other.id,
                })}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: other.avatar || `https://i.pravatar.cc/150?u=${other.id}` }}
                  style={styles.avatar}
                />
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={[styles.participantName, { color: themeColors.text }]}>
                      {other.name}
                    </Text>
                    <Text style={[styles.messageTime, { color: themeColors.textSecondary }]}>
                      {formatTime(conversation.lastMessageTime)}
                    </Text>
                  </View>
                  <View style={styles.messagePreviewRow}>
                    <Text 
                      style={[
                        styles.messagePreview, 
                        { color: themeColors.textSecondary },
                        unreadCount > 0 && styles.unreadPreview
                      ]} 
                      numberOfLines={1}
                    >
                      {conversation.lastMessage || 'No messages yet'}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  conversationsList: {
    padding: spacing.lg,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.lg,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
    fontSize: 14,
  },
  unreadPreview: {
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
