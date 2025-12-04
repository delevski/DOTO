import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useRTL } from '../context/RTLContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CustomDialog - A styled dialog component with red background and white text
 * 
 * @param {boolean} visible - Controls dialog visibility
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Array} buttons - Array of button objects with { text, onPress, style? }
 * @param {function} onClose - Called when dialog is dismissed
 */
export default function CustomDialog({ 
  visible, 
  title, 
  message, 
  buttons = [{ text: 'OK', onPress: () => {} }],
  onClose,
}) {
  const { isRTL } = useRTL();

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          {/* Dialog Content */}
          <View style={styles.contentContainer}>
            {title && (
              <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
                {title}
              </Text>
            )}
            {message && (
              <Text style={[styles.message, { textAlign: isRTL ? 'right' : 'left' }]}>
                {message}
              </Text>
            )}
          </View>

          {/* Buttons */}
          <View style={[
            styles.buttonContainer, 
            { flexDirection: isRTL ? 'row-reverse' : 'row' }
          ]}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.buttonCancel,
                  buttons.length === 1 && styles.buttonFull,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.buttonText,
                  button.style === 'cancel' && styles.buttonTextCancel,
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContainer: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    width: Math.min(SCREEN_WIDTH - 48, 340),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonFull: {
    borderLeftWidth: 0,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    fontWeight: '500',
    opacity: 0.9,
  },
});

