import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomDialog from '../components/CustomDialog';

const DialogContext = createContext(null);

/**
 * DialogProvider - Provides app-wide dialog functionality
 * Wrap your app with this provider to use showDialog anywhere
 */
export function DialogProvider({ children }) {
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
  });

  const showDialog = useCallback((title, message, buttons) => {
    // Handle different call signatures
    // showDialog(title, message) - simple alert
    // showDialog(title, message, buttons) - with custom buttons
    // showDialog({ title, message, buttons }) - object config
    
    if (typeof title === 'object') {
      // Object config format
      setDialogConfig({
        visible: true,
        title: title.title || '',
        message: title.message || '',
        buttons: title.buttons || [{ text: 'OK' }],
      });
    } else {
      // Traditional format: showDialog(title, message, buttons?)
      const resolvedButtons = buttons || [{ text: 'OK' }];
      setDialogConfig({
        visible: true,
        title: title || '',
        message: message || '',
        buttons: Array.isArray(resolvedButtons) ? resolvedButtons : [resolvedButtons],
      });
    }
  }, []);

  const hideDialog = useCallback(() => {
    setDialogConfig(prev => ({ ...prev, visible: false }));
  }, []);

  // Convenience method that mimics Alert.alert API
  const alert = useCallback((title, message, buttons) => {
    showDialog(title, message, buttons);
  }, [showDialog]);

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog, alert }}>
      {children}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        onClose={hideDialog}
      />
    </DialogContext.Provider>
  );
}

/**
 * useDialog - Hook to access dialog functions
 * @returns {{ showDialog: Function, hideDialog: Function, alert: Function }}
 */
export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export default DialogContext;

