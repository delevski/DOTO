import { db, id } from '../lib/instant';

/**
 * Generate a consistent conversation ID from two user IDs
 * Ensures the same conversation ID regardless of order
 */
export function getConversationId(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
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
    lastMessageTime: now,
  };
  
  db.transact(
    db.tx.conversations[conversationId].update(conversation)
  );
  
  return conversation;
}

/**
 * Send a message
 */
export function sendMessage(conversationId, senderId, senderData, text, images = []) {
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
  
  const lastMessagePreview = text || (images.length > 0 ? '📷 Image' : '');
  
  db.transact(
    db.tx.messages[messageId].update(message),
    db.tx.conversations[conversationId].update({
      lastMessage: lastMessagePreview,
      lastMessageTime: timestamp,
    })
  );
  
  return message;
}

