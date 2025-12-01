import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { db } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { sendMessage, formatMessageTime } from '../utils/messaging';

export default function ChatScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef(null);

  // Fetch conversation and messages
  const { data } = db.useQuery({
    conversations: { $: { where: { id: conversationId } } },
    messages: { $: { where: { conversationId: conversationId } } }
  });

  const conversation = data?.conversations?.[0];
  const messages = (data?.messages || []).sort((a, b) => a.timestamp - b.timestamp);

  // Get other participant info
  const otherUser = conversation ? (
    conversation.participant1Id === user?.id
      ? { name: conversation.participant2Name, avatar: conversation.participant2Avatar }
      : { name: conversation.participant1Name, avatar: conversation.participant1Avatar }
  ) : null;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!newMessage.trim() || !user) return;

    sendMessage(
      conversationId,
      user.id,
      { name: user.name, avatar: user.avatar },
      newMessage.trim()
    );

    setNewMessage('');
  };

  const renderMessage = ({ item: message, index }) => {
    const isMyMessage = message.senderId === user?.id;
    const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;

    return (
      <View style={[
        styles.messageRow,
        isMyMessage ? styles.messageRowRight : styles.messageRowLeft
      ]}>
        {!isMyMessage && showAvatar && (
          <Image
            source={{ uri: message.senderAvatar || 'https://i.pravatar.cc/150' }}
            style={styles.messageAvatar}
          />
        )}
        {!isMyMessage && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        {otherUser && (
          <View style={styles.headerInfo}>
            <Image
              source={{ uri: otherUser.avatar || 'https://i.pravatar.cc/150' }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerName}>{otherUser.name}</Text>
          </View>
        )}
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={newMessage.trim() ? colors.white : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  headerName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  avatarSpacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
  },
  myMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});

