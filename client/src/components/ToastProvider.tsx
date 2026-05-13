import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from "@mui/material";

interface ToastOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
}

interface ToastContextValue {
  showToast: (
    message: string,
    severity?: AlertColor,
    duration?: number,
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const SlideTransition = (props: SlideProps) => (
  <Slide {...props} direction="up" />
);

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({
    message: "",
    severity: "info",
    duration: 4000,
  });

  const showToast = useCallback(
    (message: string, severity: AlertColor = "info", duration = 4000) => {
      setToast({ message, severity, duration });
      setOpen(true);
    },
    [],
  );

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          elevation={6}
          sx={{ width: "100%", minWidth: 280 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
