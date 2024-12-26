import React, { useEffect, useState } from "react";
import { Container, Typography, Box, Button, CircularProgress } from "@mui/material";
import axios from "axios";

const Home = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Base API URL from environment variables
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      setError("");

      try {
        console.log("Fetching signed URLs for account type:", user.accountType);

        // Fetch signed URLs from the backend
        const response = await axios.post(`${apiBaseUrl}/api/get-signed-urls`, {
          accountType: user.accountType,
        });

        console.log("Files fetched successfully:", response.data);

        if (response.data.success) {
          setFiles(response.data.files);
        } else {
          setError(response.data.message || "Failed to fetch files.");
        }
      } catch (err) {
        console.error("Error fetching signed URLs:", err);
        setError("Error fetching files. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [user.accountType, apiBaseUrl]);

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
          {isLoading ? (
            <Box display="flex" justifyContent="center" mt={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : files.length > 0 ? (
            files.map((file, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                p={1}
                border={1}
                borderRadius={2}
              >
                <Typography>{file.name}</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </Button>
              </Box>
            ))
          ) : (
            <Typography>No files available at the moment.</Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
