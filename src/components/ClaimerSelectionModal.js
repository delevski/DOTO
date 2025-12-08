import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useRTL } from '../context/RTLContext';
import { useSettingsStore } from '../store/settingsStore';
import { colors, spacing } from '../styles/theme';
import Icon from './Icon';

// Helper function for formatting claim time
function formatClaimTime(timestamp) {
  if (!timestamp) return 'Just now';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

export default function ClaimerSelectionModal({ visible, onClose, post, onApproveClaimer }) {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();

  const claimers = post?.claimers || [];
  
  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('=== ClaimerSelectionModal Debug ===');
      console.log('Modal visible:', visible);
      console.log('Post:', post?.title);
      console.log('Claimers count:', claimers.length);
      console.log('Claimers data:', JSON.stringify(claimers, null, 2));
    }
  }, [visible, claimers.length, post?.title]);

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  const handleApprove = (claimerUserId) => {
    console.log('=== APPROVE BUTTON PRESSED ===');
    console.log('Approving claimer:', claimerUserId);
    onApproveClaimer(claimerUserId);
    onClose();
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  {t('post.chooseClaimer') || 'Choose a Claimer'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {claimers.length} {claimers.length === 1 
                    ? (t('post.personWantsToHelp') || 'person wants to help')
                    : (t('post.peopleWantToHelp') || 'people want to help')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Post info */}
          <View style={[styles.postInfo, { backgroundColor: themeColors.surface }]}>
            <Text 
              style={[styles.postTitle, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {post.title}
            </Text>
          </View>

          {/* CLAIMERS LIST */}
          <ScrollView 
            style={styles.claimersList} 
            contentContainerStyle={styles.claimersListContent}
          >
            {claimers.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="person-outline" size={48} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  {t('post.noClaimersYet') || 'No claimers yet'}
                </Text>
              </View>
            ) : (
              claimers.map((claimer, index) => (
                <View 
                  key={claimer.userId || `claimer-${index}`} 
                  style={[styles.claimerCard, { backgroundColor: themeColors.surface }]}
                >
                  {/* Claimer Info */}
                  <View style={styles.claimerInfo}>
                    <Image
                      source={{ uri: claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}` }}
                      style={styles.claimerAvatar}
                    />
                    <View style={styles.claimerDetails}>
                      <Text style={[styles.claimerName, { color: themeColors.text }]}>
                        {claimer.userName || 'Unknown User'}
                      </Text>
                      <Text style={[styles.claimTime, { color: themeColors.textSecondary }]}>
                        {formatClaimTime(claimer.claimedAt)}
                      </Text>
                    </View>
                  </View>

                  {/* APPROVE BUTTON */}
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(claimer.userId)}
                    activeOpacity={0.8}
                  >
                    <Icon name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.approveButtonText}>
                      ✓ APPROVE {claimer.userName?.toUpperCase() || 'THIS HELPER'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: themeColors.surface }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.background }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                {t('common.cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  claimersList: {
    flex: 1,
    maxHeight: 400,
  },
  claimersListContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  claimerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  claimerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  claimerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  claimerDetails: {
    flex: 1,
    marginLeft: 14,
  },
  claimerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  claimTime: {
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
