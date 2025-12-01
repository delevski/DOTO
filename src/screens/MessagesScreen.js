import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';
import { formatMessageTime } from '../utils/messaging';

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();

  // Fetch conversations where user is a participant
  const { isLoading, data } = db.useQuery({ conversations: {} });
  
  const conversations = (data?.conversations || [])
    .filter(conv => conv.participant1Id === user?.id || conv.participant2Id === user?.id)
    .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

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

  const renderConversation = ({ item: conversation }) => {
    const otherUser = getOtherParticipant(conversation);

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => navigation.navigate('Chat', { conversationId: conversation.id })}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: otherUser.avatar || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.timeText}>
              {formatMessageTime(conversation.lastMessageTime)}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage || 'No messages yet'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.border} />
      <Text style={styles.emptyTitle}>{t('noMessages')}</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation by messaging a post author
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('messages')}</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!isLoading && renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

