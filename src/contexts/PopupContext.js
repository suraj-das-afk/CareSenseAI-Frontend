import React, { createContext, useContext, useState } from "react";
import AppPopup from "../components/AppPopup";

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    confirmText: null,
    cancelText: null,
    onConfirm: null,
    autoClose: false,
  });

  const showPopup = ({
    type = "info",
    title = "",
    message = "",
    confirmText = null,
    cancelText = null,
    onConfirm = null,
    autoClose = false,
  }) => {
    setPopup({
      visible: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      autoClose,
    });

    if (autoClose) {
      setTimeout(() => {
        setPopup(p => ({ ...p, visible: false }));
      }, 2500);
    }
  };

  const hidePopup = () =>
    setPopup(prev => ({ ...prev, visible: false }));

  return (
    <PopupContext.Provider value={{ showPopup, hidePopup }}>
      {children}
      <AppPopup popup={popup} onClose={hidePopup} />
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
