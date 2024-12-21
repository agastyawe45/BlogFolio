// src/components/Home.js
import React, { useEffect, useState } from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import axios from "axios";

const Home = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // Fetch signed URLs based on the user's account type
        const response = await axios.post("http://localhost:5000/get-signed-urls", {
          accountType: user.accountType,
        });

        if (response.data.success) {
          setFiles(response.data.files);
        } else {
          setError(response.data.message || "Failed to fetch files.");
        }
      } catch (err) {
        console.error("Error fetching signed URLs:", err);
        setError("Error fetching files.");
      }
    };

    fetchFiles();
  }, [user.accountType]);

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

        <Box mt={5} width="100%">
          <Typography variant="h6" gutterBottom>
            Accessible Files:
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          {files.length > 0 ? (
            files.map((file, index) => (
              <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>{file.name}</Typography>
                <Button variant="contained" color="primary" href={file.url} target="_blank">
                  View
                </Button>
              </Box>
            ))
          ) : (
            <Typography>No files available for your account type.</Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
