import React, { createContext, useContext, useState } from "react";
import Notification from "../components/Notification";

const NotificationContext = createContext({});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    actions: [],
    duration: 3000,
  });

  const showNotification = ({
    type = "info",
    title,
    message,
    duration = 3000,
  }) => {
    setNotification({
      visible: true,
      type,
      title,
      message,
      actions: [],
      duration,
    });
  };

  const showSuccess = (title, message, duration = 3000) => {
    showNotification({ type: "success", title, message, duration });
  };

  const showError = (title, message, duration = 4000) => {
    showNotification({ type: "error", title, message, duration });
  };

  const showWarning = (title, message, duration = 3500) => {
    showNotification({ type: "warning", title, message, duration });
  };

  const showInfo = (title, message, duration = 3000) => {
    showNotification({ type: "info", title, message, duration });
  };

  const showConfirm = ({
    type = "warning",
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmStyle = "default", // 'default' or 'destructive'
  }) => {
    setNotification({
      visible: true,
      type,
      title,
      message,
      duration: 0, // Don't auto-close
      actions: [
        {
          text: cancelText,
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: confirmText,
          style: confirmStyle,
          onPress: onConfirm,
        },
      ],
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      <>
        {children}
        <Notification
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          actions={notification.actions}
          duration={notification.duration}
          onClose={hideNotification}
        />
      </>
    </NotificationContext.Provider>
  );
};
