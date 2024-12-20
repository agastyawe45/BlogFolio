// src/components/Home.js
import React from "react";
import { Container, Typography, Box } from "@mui/material";

const Home = ({ user }) => {
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
          Welcome, {user.username}!
        </Typography>
        <Typography>Email: {user.email}</Typography>
        <Typography>Account Type: {user.accountType}</Typography>
      </Box>
    </Container>
  );
};

export default Home;
