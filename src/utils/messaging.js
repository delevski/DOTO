import { db, id } from '../lib/instant';

// Generate a consistent conversation ID for two users
export const getConversationId = (userId1, userId2) => {
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
};

// Create or update a conversation
export const createOrUpdateConversation = async (
  conversationId,
  participant1Id,
  participant2Id,
  participant1Info,
  participant2Info
) => {
  const now = Date.now();
  
  await db.transact(
    db.tx.conversations[conversationId].update({
      id: conversationId,
      participant1Id,
      participant2Id,
      participant1Name: participant1Info.name,
      participant1Avatar: participant1Info.avatar,
      participant2Name: participant2Info.name,
      participant2Avatar: participant2Info.avatar,
      updatedAt: now,
      createdAt: now,
    })
  );
  
  return conversationId;
};

// Send a message
export const sendMessage = async (
  conversationId,
  senderId,
  senderInfo,
  text,
  images = []
) => {
  const messageId = id();
  const now = Date.now();
  
  // Create message
  await db.transact(
    db.tx.messages[messageId].update({
      id: messageId,
      conversationId,
      senderId,
      senderName: senderInfo.name,
      senderAvatar: senderInfo.avatar,
      text,
      images,
      timestamp: now,
      createdAt: now,
    })
  );
  
  // Update conversation with last message
  await db.transact(
    db.tx.conversations[conversationId].update({
      lastMessage: text || (images.length > 0 ? '📷 Image' : ''),
      lastMessageTime: now,
      updatedAt: now,
    })
  );
  
  return messageId;
};

// Format message time
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  
  return date.toLocaleDateString();
};

// Format conversation time (shorter)
export const formatConversationTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
