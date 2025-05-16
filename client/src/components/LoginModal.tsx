import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { loginUser, setTokenInLocalStorage } from "../services/api";
import { useNavigate } from "react-router-dom";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSignup: () => void;
  onOpenForgotPassword: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onOpenSignup,
  onOpenForgotPassword,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoadingLogin(true);
    try {
      const token = await loginUser(email, password);
      setTokenInLocalStorage(token);
      navigate("/chat");
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message);
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Box
          bgcolor="background.paper"
          p={4}
          borderRadius={2}
          boxShadow={3}
          maxWidth={400}
          width="100%"
        >
          <Typography variant="h5" mb={2} textAlign="center">
            Login
          </Typography>
          <TextField
            fullWidth
            label="Email"
            margin="normal"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
            disabled={loadingLogin}
          />
          <TextField
            fullWidth
            label="Password"
            margin="normal"
            required
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
            disabled={loadingLogin}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPw(!showPw)}
                    disabled={loadingLogin}
                  >
                    {showPw ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLogin}
            sx={{ mt: 2 }}
            disabled={loadingLogin || email.trim() === "" || password.trim() === ""}
          >
            {loadingLogin ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Login"
            )}
          </Button>
          <Box mt={2} textAlign="center">
            <Typography variant="body2">
              Don't have an account?{" "}
              <Button onClick={onOpenSignup} color="primary">
                Sign Up
              </Button>
            </Typography>
            <Typography variant="body2">
              Forgot your password?{" "}
              <Button onClick={onOpenForgotPassword} color="primary">
                Reset Password
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default LoginModal;
