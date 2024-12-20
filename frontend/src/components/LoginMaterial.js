// src/components/LoginMaterial.js
import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Link,
} from "@mui/material";

const LoginMaterial = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (data.success) {
      onLogin(data.user);
    } else {
      setMessage(data.message);
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
        >
          Login
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
