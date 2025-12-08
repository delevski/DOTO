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
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from '../components/Icon';
import { compressImage } from '../utils/imageCompression';

export default function ChatScreen({ route }) {
  const { conversationId, userName, userAvatar, userId } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  
  const [newMessage, setNewMessage] = useState('');
  const [messageImages, setMessageImages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
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
      return t('messages.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('messages.yesterday');
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

  // Pick image from gallery
  const pickImage = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const compressedImages = await Promise.all(
          result.assets.slice(0, 5 - messageImages.length).map(async (asset) => {
            const compressed = await compressImage(asset.uri);
            return compressed.base64;
          })
        );
        setMessageImages(prev => [...prev, ...compressedImages].slice(0, 5));
      }
    } catch (err) {
      console.error('Image picker error:', err);
    } finally {
      setIsPickingImage(false);
    }
  };

  // Remove image from selection
  const removeImage = (index) => {
    setMessageImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && messageImages.length === 0) || !user || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    const imagesToSend = [...messageImages];
    setNewMessage('');
    setMessageImages([]);

    try {
      const messageId = id();
      const timestamp = Date.now();
      const lastMessagePreview = messageText || (imagesToSend.length > 0 ? '📷 ' + t('messages.image') : '');

      // Create message with images
      await db.transact(
        db.tx.messages[messageId].update({
          id: messageId,
          conversationId,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          text: messageText,
          images: imagesToSend,
          timestamp,
          read: false,
        }),
        // Update conversation's last message
        db.tx.conversations[conversationId].update({
          lastMessage: lastMessagePreview,
          lastMessageTime: timestamp,
        })
      );
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(messageText);
      setMessageImages(imagesToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Icon name="chatbubbles-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
        <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
          {t('auth.pleaseLogin')}
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
      <View style={[styles.chatHeader, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}>
        <Image 
          source={{ uri: userAvatar || `https://i.pravatar.cc/150?u=${userId}` }}
          style={[styles.headerAvatar, isRTL ? { marginLeft: spacing.md, marginRight: 0 } : { marginRight: spacing.md }]}
        />
        <View style={[styles.headerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.headerName, { color: themeColors.text }]}>{userName}</Text>
          <Text style={[styles.headerStatus, { color: themeColors.textSecondary }]}>
            {messages.length > 0 ? t('messages.active') : t('messages.startChatting')}
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
              <Icon name="hand-left-outline" size={48} color={colors.primary} />
              <Text style={[styles.emptyChatText, { color: themeColors.textSecondary }]}>
                {t('messages.sayHelloTo', { name: userName })}
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
                      {message.text ? (
                        <Text style={[
                          styles.messageText,
                          isMe ? styles.myMessageText : { color: themeColors.text }
                        ]}>
                          {message.text}
                        </Text>
                      ) : null}
                      {/* Display images */}
                      {message.images && message.images.length > 0 && (
                        <View style={styles.messageImagesContainer}>
                          {message.images.map((img, idx) => (
                            <Image 
                              key={idx}
                              source={{ uri: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }}
                              style={styles.messageImage}
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      )}
                      <View style={[styles.messageTimeRow, { flexDirection: rtlStyles.row }]}>
                        <Text style={[
                          styles.messageTime,
                          isMe ? styles.myMessageTime : { color: themeColors.textSecondary }
                        ]}>
                          {formatTime(message.timestamp)}
                        </Text>
                        {isMe && (
                          <Icon 
                            name={message.read ? 'checkmark-done' : 'checkmark'} 
                            size={14} 
                            color={isMe ? 'rgba(255,255,255,0.7)' : themeColors.textSecondary} 
                          />
                        )}
                      </View>
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
        {/* Image Previews */}
        {messageImages.length > 0 && (
          <View style={[styles.imagePreviewContainer, { flexDirection: rtlStyles.row }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {messageImages.map((img, idx) => (
                <View key={idx} style={styles.imagePreviewWrapper}>
                  <Image 
                    source={{ uri: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(idx)}
                  >
                    <Icon name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        <View style={[styles.inputRow, { flexDirection: rtlStyles.row }]}>
          {/* Image Picker Button */}
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={pickImage}
            disabled={isPickingImage || messageImages.length >= 5}
          >
            {isPickingImage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="image-outline" size={22} color={messageImages.length >= 5 ? themeColors.textSecondary : colors.primary} />
            )}
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background, textAlign: rtlStyles.textAlign }]}
            placeholder={t('messages.typeMessage')}
            placeholderTextColor={themeColors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, (!newMessage.trim() && messageImages.length === 0 || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={(!newMessage.trim() && messageImages.length === 0) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
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
    padding: spacing.md,
    borderTopWidth: 1,
  },
  imagePreviewContainer: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 16,
    maxHeight: 100,
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
  messageImagesContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  messageTimeRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
