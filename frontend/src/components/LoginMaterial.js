import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const LoginMaterial = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Base API URL from environment variable
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleLogin = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      // Use axios to send login request
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password,
      });

      if (response.data.success) {
        onLogin(response.data.user);
      } else {
        setMessage(response.data.message || "Invalid username or password.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setMessage("Error connecting to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        mt={10}
        p={3}
        boxShadow={3}
        borderRadius={2}
      >
        <Typography variant="h4" gutterBottom>
          Login
        </Typography>
        {message && (
          <Typography color="error" variant="body2">
            {message}
          </Typography>
        )}
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : "Login"}
        </Button>
        <Link
          sx={{ mt: 2, cursor: "pointer" }}
          onClick={() => onLogin(null)}
          underline="hover"
        >
          Don't have an account? Register here.
        </Link>
      </Box>
    </Container>
  );
};

export default LoginMaterial;
