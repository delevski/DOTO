import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';

export default function ChatScreen({ route }) {
  const { conversationId, userName, userAvatar, userId } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only query when authenticated and we have a conversationId
  const shouldQuery = isAuthenticated && conversationId;

  // Fetch messages for this conversation
  const { isLoading, data } = db.useQuery(shouldQuery ? { 
    messages: { $: { where: { conversationId } } }
  } : null);

  const messages = useMemo(() => {
    try {
      return (data?.messages || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } catch (e) {
      return [];
    }
  }, [data?.messages]);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Mark messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(m => m.senderId !== user?.id && !m.read);
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        try {
          await db.transact(db.tx.messages[msg.id].update({ read: true }));
        } catch (err) {
          console.error('Mark read error:', err);
        }
      });
    }
  }, [messages, user?.id]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const shouldShowDate = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const messageId = id();
      const timestamp = Date.now();

      // Create message
      await db.transact(
        db.tx.messages[messageId].update({
          id: messageId,
          conversationId,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          text: messageText,
          timestamp,
          read: false,
        }),
        // Update conversation's last message
        db.tx.conversations[conversationId].update({
          lastMessage: messageText,
          lastMessageTime: timestamp,
        })
      );
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
          Please login to view messages
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Chat Header */}
      <View style={[styles.chatHeader, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Image 
          source={{ uri: userAvatar || `https://i.pravatar.cc/150?u=${userId}` }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: themeColors.text }]}>{userName}</Text>
          <Text style={[styles.headerStatus, { color: themeColors.textSecondary }]}>
            {messages.length > 0 ? 'Active' : 'Start chatting'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>👋</Text>
              <Text style={[styles.emptyChatText, { color: themeColors.textSecondary }]}>
                Say hello to {userName}!
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = message.senderId === user.id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showDate = shouldShowDate(message, prevMessage);

              return (
                <View key={message.id}>
                  {showDate && (
                    <View style={styles.dateDivider}>
                      <Text style={[styles.dateText, { color: themeColors.textSecondary }]}>
                        {formatDate(message.timestamp)}
                      </Text>
                    </View>
                  )}
                  <View style={[
                    styles.messageRow,
                    isMe ? styles.messageRowRight : styles.messageRowLeft
                  ]}>
                    {!isMe && (
                      <Image 
                        source={{ uri: message.senderAvatar || `https://i.pravatar.cc/150?u=${message.senderId}` }}
                        style={styles.messageAvatar}
                      />
                    )}
                    <View style={[
                      styles.messageBubble,
                      isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: themeColors.surface }]
                    ]}>
                      <Text style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : { color: themeColors.text }
                      ]}>
                        {message.text}
                      </Text>
                      <Text style={[
                        styles.messageTime,
                        isMe ? styles.myMessageTime : { color: themeColors.textSecondary }
                      ]}>
                        {formatTime(message.timestamp)}
                        {isMe && (message.read ? ' ✓✓' : ' ✓')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <TextInput
          style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
          placeholder="Type a message..."
          placeholderTextColor={themeColors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>📤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  errorText: {
    fontSize: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyChatIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyChatText: {
    fontSize: 16,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
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
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 16,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
});
