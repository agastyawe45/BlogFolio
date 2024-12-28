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

  // Function to handle login
  const handleLogin = async () => {
    console.log("Login process started. Username:", username);

    setIsLoading(true);
    setMessage("");

    if (!username || !password) {
      console.warn("Missing username or password.");
      setMessage("Please provide both username and password.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Sending login request to the backend...");
      const response = await axios.post("/api/login", { username, password });

      if (response.data.success) {
        console.log("Login successful. User data:", response.data.user);
        setMessage("Login successful!");
        onLogin(response.data.user);
      } else {
        console.warn("Login failed. Server response:", response.data.message);
        setMessage(response.data.message || "Invalid username or password.");
      }
    } catch (error) {
      console.error("Error during login:", error.response?.data || error.message);
      setMessage(
        error.response?.data?.message ||
        "Error connecting to the server. Please try again later."
      );
    } finally {
      setIsLoading(false);
      console.log("Login process completed.");
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
          <Typography
            color={message === "Login successful!" ? "green" : "error"}
            variant="body2"
            sx={{ mb: 2 }}
          >
            {message}
          </Typography>
        )}

        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => {
            console.log("Username input changed:", e.target.value);
            setUsername(e.target.value);
          }}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => {
            console.log("Password input changed.");
            setPassword(e.target.value);
          }}
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
          onClick={() => {
            console.log("Redirecting to registration page.");
            onLogin(null);
          }}
          underline="hover"
        >
          Don't have an account? Register here.
        </Link>
      </Box>
    </Container>
  );
};

export default LoginMaterial;
