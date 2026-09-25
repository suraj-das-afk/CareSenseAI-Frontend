import React, {
  createContext,
  useState,
} from 'react';

export const PopupContext =
  createContext();

export const PopupProvider = ({
  children,
}) => {
  const [
    popup,
    setPopup,
  ] = useState(null);

  const showPopup = (
    title,
    message,
    type = 'info',
    onConfirm = null,
    confirmText = 'OK',
    cancelText = 'Cancel',
  ) => {
    setPopup({
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
    });
  };

  const hidePopup = () => {
    setPopup(null);
  };

  return (
    <PopupContext.Provider
      value={{
        popup,
        showPopup,
        hidePopup,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};