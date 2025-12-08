import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { sendPushNotificationToUser } from './pushNotifications';

/**
 * Generate a consistent conversation ID from two user IDs
 * Ensures the same conversation ID regardless of order
 */
export function getConversationId(userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
}

/**
 * Find existing conversation or create a new one
 */
export function findOrCreateConversation(userId1, userId2, user1Data, user2Data) {
  const conversationId = getConversationId(userId1, userId2);
  
  // Check if conversation exists
  // Note: We'll need to query this from the component, but this function
  // will handle the creation logic
  return {
    conversationId,
    participant1Id: userId1 < userId2 ? userId1 : userId2,
    participant2Id: userId1 < userId2 ? userId2 : userId1,
  };
}

/**
 * Format message timestamp for display
 */
export function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  // For older messages, show date
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Format conversation last message time
 */
export function formatConversationTime(timestamp) {
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
}

/**
 * Create or update a conversation
 */
export function createOrUpdateConversation(conversationId, participant1Id, participant2Id, participant1Data, participant2Data) {
  const now = Date.now();
  const conversation = {
    id: conversationId,
    participant1Id,
    participant2Id,
    participant1Name: participant1Data.name,
    participant2Name: participant2Data.name,
    participant1Avatar: participant1Data.avatar || 'https://i.pravatar.cc/150?u=' + participant1Id,
    participant2Avatar: participant2Data.avatar || 'https://i.pravatar.cc/150?u=' + participant2Id,
    createdAt: now,
    lastMessage: '',
    lastMessageTime: now, // Set initial time so conversation appears in list
  };
  
  console.log('Creating/updating conversation:', conversation);
  
  db.transact(
    db.tx.conversations[conversationId].update(conversation)
  );
  
  return conversation;
}

/**
 * Get the other participant's ID from a conversation ID
 */
export function getOtherParticipantId(conversationId, currentUserId) {
  if (!currentUserId || !conversationId) return null;
  
  const match = conversationId.match(/^conv_(.+?)_(.+)$/);
  if (match) {
    const [, id1, id2] = match;
    return id1 === currentUserId ? id2 : id1;
  }
  
  return null;
}

/**
 * Send a message
 */
export async function sendMessage(conversationId, senderId, senderData, text, images = []) {
  const messageId = id();
  const timestamp = Date.now();
  
  const message = {
    id: messageId,
    conversationId,
    senderId,
    senderName: senderData.name,
    senderAvatar: senderData.avatar || 'https://i.pravatar.cc/150?u=' + senderId,
    text: text || '',
    images: images.length > 0 ? images : [],
    timestamp,
    read: false,
  };
  
  // Update conversation's last message
  const lastMessagePreview = text || (images.length > 0 ? '📷 Image' : '');
  
  console.log('Sending message:', {
    messageId,
    conversationId,
    senderId,
    text: text ? text.substring(0, 50) + '...' : '(no text)',
    timestamp
  });
  
  // Update both the message and conversation
  // Ensure conversation exists and is updated with latest message info
  await db.transact(
    db.tx.messages[messageId].update(message),
    db.tx.conversations[conversationId].update({
      lastMessage: lastMessagePreview,
      lastMessageTime: timestamp,
    })
  );
  
  console.log('Message sent and conversation updated');
  
  // Send push notification to the recipient
  const recipientId = getOtherParticipantId(conversationId, senderId);
  if (recipientId) {
    console.log('Sending push notification for new message to:', recipientId);
    await sendPushNotificationToUser(
      recipientId,
      'newMessage',
      { userName: senderData.name },
      { conversationId, type: 'new_message', senderId }
    );
  }
  
  return message;
}

