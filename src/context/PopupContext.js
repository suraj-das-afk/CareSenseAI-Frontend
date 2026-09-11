import React, { createContext, useState } from 'react';

export const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = 'info') => {
    setPopup({ title, message, type });
    setTimeout(() => {
      setPopup(null);
    }, 3000);
  };

  const hidePopup = () => {
    setPopup(null);
  };

  return (
    <PopupContext.Provider value={{ popup, showPopup, hidePopup }}>
      {children}
    </PopupContext.Provider>
  );
};
