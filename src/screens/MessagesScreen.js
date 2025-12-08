import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from '../components/Icon';
import { formatConversationTime, isUserInConversation } from '../utils/messaging';

function MessagesScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();

  // Track screen focus - only query when focused
  const [queryEnabled, setQueryEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track mounted state for cleanup
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Only enable query when screen is focused
  useFocusEffect(
    useCallback(() => {
      setQueryEnabled(true);
      return () => setQueryEnabled(false);
    }, [])
  );

  // SAME AS WEB APP: Fetch ALL conversations and ALL messages, filter client-side
  const { isLoading: conversationsLoading, data: conversationsData } = db.useQuery(
    isAuthenticated && queryEnabled ? { conversations: {} } : null
  );

  const { isLoading: messagesLoading, data: messagesData } = db.useQuery(
    isAuthenticated && queryEnabled ? { messages: {} } : null
  );

  const isLoading = conversationsLoading || messagesLoading;

  // Convert IDs to strings for comparison (same as web app)
  const currentUserId = user?.id ? String(user.id) : null;

  const allConversations = useMemo(() => {
    try {
      return conversationsData?.conversations || [];
    } catch (e) {
      return [];
    }
  }, [conversationsData?.conversations]);
  
  const allMessages = useMemo(() => {
    try {
      return messagesData?.messages || [];
    } catch (e) {
      return [];
    }
  }, [messagesData?.messages]);

  // Find conversations from messages where current user is involved but conversation might be missing
  // This helps discover conversations that might not be in the conversations table yet
  const conversationIdsFromMessages = useMemo(() => {
    const ids = new Set();
    if (currentUserId && allMessages.length > 0) {
      allMessages.forEach(msg => {
        // Check if message is from current user or conversation involves current user
        const msgSenderId = msg.senderId ? String(msg.senderId) : null;
        if (msgSenderId === currentUserId || isUserInConversation(msg.conversationId, currentUserId)) {
          ids.add(msg.conversationId);
        }
      });
    }
    return ids;
  }, [allMessages, currentUserId]);

  // Filter conversations where current user is a participant (same logic as web app)
  const userConversations = useMemo(() => {
    return allConversations.filter(conv => {
      const p1Id = conv.participant1Id ? String(conv.participant1Id) : null;
      const p2Id = conv.participant2Id ? String(conv.participant2Id) : null;
      return currentUserId && (p1Id === currentUserId || p2Id === currentUserId);
    });
  }, [allConversations, currentUserId]);

  // Get conversation IDs where current user is a participant
  const userConversationIds = useMemo(() => {
    return new Set([
      ...userConversations.map(conv => conv.id),
      ...Array.from(conversationIdsFromMessages)
    ]);
  }, [userConversations, conversationIdsFromMessages]);

  // Build a complete list of conversations by combining:
  // 1. Conversations from the conversations table
  // 2. Conversations inferred from messages (in case conversation record is missing)
  const allUserConversations = useMemo(() => {
    const conversationMap = new Map();
    
    // Add conversations from conversations table
    userConversations.forEach(conv => {
      conversationMap.set(conv.id, conv);
    });

    // For each message, ensure we have a conversation entry
    allMessages.forEach(msg => {
      if (isUserInConversation(msg.conversationId, currentUserId) && !conversationMap.has(msg.conversationId)) {
        // Parse conversation ID to get participant IDs
        const match = msg.conversationId.match(/^conv_(.+?)_(.+)$/);
        if (match) {
          const [, id1, id2] = match;
          const otherParticipantId = String(id1) === currentUserId ? String(id2) : String(id1);

          // Create a virtual conversation from the message data
          const virtualConv = {
            id: msg.conversationId,
            participant1Id: id1 < id2 ? id1 : id2,
            participant2Id: id1 < id2 ? id2 : id1,
            participant1Name: String(id1) === currentUserId ? user?.name || 'You' : msg.senderName || 'Unknown',
            participant2Name: String(id2) === currentUserId ? user?.name || 'You' : msg.senderName || 'Unknown',
            participant1Avatar: String(id1) === currentUserId ? user?.avatar : msg.senderAvatar,
            participant2Avatar: String(id2) === currentUserId ? user?.avatar : msg.senderAvatar,
            lastMessage: msg.text || (msg.images?.length > 0 ? '📷 Image' : ''),
            lastMessageTime: msg.timestamp || Date.now(),
            createdAt: msg.timestamp || Date.now(),
          };
          conversationMap.set(msg.conversationId, virtualConv);
        }
      }
    });

    return Array.from(conversationMap.values());
  }, [userConversations, allMessages, currentUserId, user]);

  // Sort conversations by last message time
  const sortedConversations = useMemo(() => {
    return [...allUserConversations].sort((a, b) =>
      (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
    );
  }, [allUserConversations]);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return sortedConversations;
    
    return sortedConversations.filter(conv => {
      const p1Id = conv.participant1Id ? String(conv.participant1Id) : null;
      const isP1CurrentUser = currentUserId && p1Id === currentUserId;
      const otherParticipantName = isP1CurrentUser
            ? conv.participant2Name 
            : conv.participant1Name;
      return otherParticipantName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [sortedConversations, searchQuery, currentUserId]);

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  const getOtherParticipant = useCallback((conversation) => {
    const p1Id = conversation.participant1Id ? String(conversation.participant1Id) : null;
    const isP1CurrentUser = currentUserId && p1Id === currentUserId;
    
    if (isP1CurrentUser) {
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
  }, [currentUserId]);

  const getUnreadCount = useCallback((conversationId) => {
    return allMessages.filter(
      m => m.conversationId === conversationId && 
           String(m.senderId) !== currentUserId && 
           !m.read
    ).length;
  }, [allMessages, currentUserId]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <View style={styles.emptyIconContainer}>
          <Icon name="chatbubbles" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{t('messages.loginRequired')}</Text>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          {t('messages.pleaseLoginToView')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('messages.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {t('messages.subtitle')}
          </Text>
        </View>
        
        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
          <Icon name="search" size={18} color={themeColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
            placeholder={t('messages.searchConversations')}
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            {t('messages.loadingConversations')}
          </Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIconContainer}>
            <Icon name="chatbubbles" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{t('messages.noMessages')}</Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            {searchQuery ? t('common.noResults') : t('messages.startConversation')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conversationsList}>
          {filteredConversations.map((conversation) => {
            const other = getOtherParticipant(conversation);
            const unreadCount = getUnreadCount(conversation.id);

            return (
              <TouchableOpacity
                key={conversation.id}
                style={[styles.conversationItem, { backgroundColor: themeColors.surface, flexDirection: rtlStyles.row }]}
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
                  style={[styles.avatar, isRTL ? { marginLeft: spacing.lg, marginRight: 0 } : { marginRight: spacing.lg }]}
                />
                <View style={styles.conversationContent}>
                  <View style={[styles.conversationHeader, { flexDirection: rtlStyles.row }]}>
                    <Text style={[styles.participantName, { color: themeColors.text }]}>
                      {other.name || t('common.unknown')}
                    </Text>
                    <Text style={[styles.messageTime, { color: themeColors.textSecondary }]}>
                      {formatConversationTime(conversation.lastMessageTime)}
                    </Text>
                  </View>
                  <View style={[styles.messagePreviewRow, { flexDirection: rtlStyles.row }]}>
                    <Text 
                      style={[
                        styles.messagePreview, 
                        { color: themeColors.textSecondary, textAlign: rtlStyles.textAlign },
                        unreadCount > 0 && styles.unreadPreview
                      ]} 
                      numberOfLines={1}
                    >
                      {conversation.lastMessage || t('messages.noMessagesYet')}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={[styles.unreadBadge, isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm }]}>
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

// Export memoized component to prevent unnecessary re-renders
export default React.memo(MessagesScreen);

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
  searchContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  emptyIconContainer: {
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
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
