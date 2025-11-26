import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, Image as ImageIcon, X, MessageCircle } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/useStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { 
  getConversationId, 
  formatMessageTime, 
  formatConversationTime,
  createOrUpdateConversation,
  sendMessage as sendMessageUtil
} from '../utils/messaging';

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useSettingsStore();
  const { user } = useAuthStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  
  const [selectedConversationId, setSelectedConversationId] = useState(searchParams.get('conversation') || null);
  const [messageText, setMessageText] = useState('');
  const [messageImages, setMessageImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Fetch all conversations (InstantDB doesn't support $or, so we filter client-side)
  const { isLoading: conversationsLoading, data: conversationsData } = db.useQuery({
    conversations: {}
  });

  // Fetch messages for selected conversation
  const { isLoading: messagesLoading, data: messagesData } = db.useQuery({
    messages: selectedConversationId ? {
      $: {
        where: { conversationId: selectedConversationId }
      }
    } : {}
  });

  const allConversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  // Debug: Log conversations and user ID
  useEffect(() => {
    if (allConversations.length > 0) {
      console.log('All conversations:', allConversations);
      console.log('Current user ID:', user?.id);
    }
  }, [allConversations, user?.id]);

  // Filter conversations where current user is a participant
  const conversations = allConversations.filter(conv => {
    const matches = conv.participant1Id === user?.id || conv.participant2Id === user?.id;
    if (!matches && allConversations.length > 0) {
      console.log('Conversation filtered out:', conv.id, 'participant1:', conv.participant1Id, 'participant2:', conv.participant2Id, 'user:', user?.id);
    }
    return matches;
  });

  // Sort conversations by last message time
  const sortedConversations = [...conversations].sort((a, b) => 
    (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
  );

  // Filter conversations by search query
  const filteredConversations = sortedConversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const otherParticipantName = conv.participant1Id === user?.id 
      ? conv.participant2Name 
      : conv.participant1Name;
    return otherParticipantName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => 
    (a.timestamp || 0) - (b.timestamp || 0)
  );

  // Get other participant info for selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const otherParticipant = selectedConversation ? {
    id: selectedConversation.participant1Id === user?.id 
      ? selectedConversation.participant2Id 
      : selectedConversation.participant1Id,
    name: selectedConversation.participant1Id === user?.id 
      ? selectedConversation.participant2Name 
      : selectedConversation.participant1Name,
    avatar: selectedConversation.participant1Id === user?.id 
      ? selectedConversation.participant2Avatar 
      : selectedConversation.participant1Avatar,
  } : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages]);

  // Auto-focus message input when conversation is selected
  useEffect(() => {
    if (selectedConversationId && messageInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [selectedConversationId]);

  // Update URL when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      setSearchParams({ conversation: selectedConversationId });
    } else {
      setSearchParams({});
    }
  }, [selectedConversationId, setSearchParams]);

  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    setMessageText('');
    setMessageImages([]);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('Image size should be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMessageImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setMessageImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (!user || !selectedConversationId) return;
    
    if (!messageText.trim() && messageImages.length === 0) {
      return;
    }

    sendMessageUtil(
      selectedConversationId,
      user.id,
      { name: user.name, avatar: user.avatar },
      messageText.trim(),
      messageImages
    );

    setMessageText('');
    setMessageImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col ${isRTL ? 'rtl' : ''}`}>
      <div className="flex-1 flex overflow-hidden min-h-[600px]">
        {/* Left Sidebar - Conversation List */}
        <div className={`w-full md:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col ${isRTL ? 'border-l border-r-0' : ''}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('messages')}</h1>
            <div className="relative">
              <Search size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500`} />
              <input 
                type="text" 
                placeholder={t('search') + '...'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 dark:text-white`}
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">{t('noConversations')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredConversations.map(conv => {
                  const otherParticipantName = conv.participant1Id === user?.id 
                    ? conv.participant2Name 
                    : conv.participant1Name;
                  const otherParticipantAvatar = conv.participant1Id === user?.id 
                    ? conv.participant2Avatar 
                    : conv.participant1Avatar;
                  const isSelected = conv.id === selectedConversationId;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${isRTL ? 'text-right' : ''} ${
                        isSelected ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600' : ''
                      }`}
                    >
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img 
                          src={otherParticipantAvatar || 'https://i.pravatar.cc/150?u=' + (conv.participant1Id === user?.id ? conv.participant2Id : conv.participant1Id)} 
                          alt={otherParticipantName} 
                          className="w-12 h-12 rounded-full ring-2 ring-gray-100 dark:ring-gray-700 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{otherParticipantName}</h3>
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                              {formatConversationTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {conv.lastMessage || t('noMessages')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Active Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                {otherParticipant ? (
                  <>
                    <img 
                      src={otherParticipant.avatar || 'https://i.pravatar.cc/150?u=' + otherParticipant.id} 
                      alt={otherParticipant.name || 'User'} 
                      className="w-10 h-10 rounded-full ring-2 ring-gray-100 dark:ring-gray-700" 
                    />
                    <div className="flex-1">
                      <h2 className="font-bold text-gray-900 dark:text-white">{otherParticipant.name || 'User'}</h2>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <h2 className="font-bold text-gray-900 dark:text-white">New Conversation</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Start typing to send a message</p>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messagesLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
                ) : sortedMessages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>{t('noMessages')}</p>
                  </div>
                ) : (
                  sortedMessages.map(message => {
                    const isMyMessage = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`max-w-[70%] ${isMyMessage ? 'order-2' : ''}`}>
                          {!isMyMessage && (
                            <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <img 
                                src={message.senderAvatar || 'https://i.pravatar.cc/150?u=' + message.senderId} 
                                alt={message.senderName} 
                                className="w-6 h-6 rounded-full" 
                              />
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {message.senderName}
                              </span>
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isMyMessage
                                ? 'bg-red-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {message.text && (
                              <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                            )}
                            {message.images && message.images.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Image ${idx + 1}`}
                                    className="max-w-full rounded-lg"
                                  />
                                ))}
                              </div>
                            )}
                            <p className={`text-xs mt-1 ${
                              isMyMessage ? 'text-red-100' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              {formatMessageTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {/* Image Previews */}
                {messageImages.length > 0 && (
                  <div className={`mb-3 flex gap-2 overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {messageImages.map((img, idx) => (
                      <div key={idx} className="relative flex-shrink-0">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('typeMessage')}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() && messageImages.length === 0}
                    className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MessageCircle size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium mb-2">{t('selectConversation')}</p>
                <p className="text-sm">{t('noConversations')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
