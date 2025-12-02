import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db, id } from '../lib/instant';
import { sendMessage, formatMessageTime } from '../utils/messaging';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, userName, userAvatar, userId } = route.params;
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);

  // Fetch messages for this conversation
  const { isLoading, data } = db.useQuery({ 
    messages: { $: { where: { conversationId: conversationId } } }
  });

  const messages = (data?.messages || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image 
            source={{ uri: userAvatar || `https://i.pravatar.cc/150?u=${userId}` }}
            style={styles.headerAvatar}
          />
          <Text style={[styles.headerName, { color: themeColors.text }]}>{userName}</Text>
        </View>
      ),
    });
  }, [userName, userAvatar, darkMode]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;

    setIsSending(true);
    const text = messageText.trim();
    setMessageText('');

    try {
      await sendMessage(
        conversationId,
        user.id,
        { name: user.name, avatar: user.avatar },
        text
      );
    } catch (error) {
      console.error('Send message error:', error);
      setMessageText(text); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsSending(true);
      try {
        const imageUri = result.assets[0].base64 
          ? `data:image/jpeg;base64,${result.assets[0].base64}` 
          : result.assets[0].uri;
        
        await sendMessage(
          conversationId,
          user.id,
          { name: user.name, avatar: user.avatar },
          '',
          [imageUri]
        );
      } catch (error) {
        console.error('Send image error:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === user?.id;
    const showAvatar = !isMyMessage && (
      index === 0 || messages[index - 1]?.senderId !== item.senderId
    );

    return (
      <View style={[
        styles.messageRow,
        isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
      ]}>
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <Image 
                source={{ uri: item.senderAvatar || `https://i.pravatar.cc/150?u=${item.senderId}` }}
                style={styles.messageAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myBubble : [styles.otherBubble, { backgroundColor: themeColors.surface }],
        ]}>
          {item.images && item.images.length > 0 && (
            <Image 
              source={{ uri: item.images[0] }}
              style={styles.messageImage}
            />
          )}
          {item.text ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : { color: themeColors.text },
            ]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : { color: themeColors.textSecondary },
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color={themeColors.textSecondary} />
      <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
        {t('noMessages')}
      </Text>
      <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
        Say hello to start the conversation!
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { 
        backgroundColor: themeColors.surface,
        borderTopColor: themeColors.border,
      }]}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handlePickImage}
        >
          <Ionicons name="image-outline" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
          <TextInput
            style={[styles.textInput, { color: themeColors.text }]}
            placeholder={t('typeMessage')}
            placeholderTextColor={themeColors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!messageText.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerName: {
    fontSize: typography.md,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: typography.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    marginRight: spacing.sm,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  otherBubble: {
    borderBottomLeftRadius: spacing.xs,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: typography.md,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
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
    gap: spacing.sm,
  },
  attachButton: {
    padding: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  textInput: {
    fontSize: typography.md,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
