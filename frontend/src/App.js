// src/App.js
import React, { useState } from "react";
import LoginMaterial from "./components/LoginMaterial";
import Register from "./components/Register";
import Home from "./components/Home";

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Handle login action
  const handleLogin = (loggedInUser) => {
    if (loggedInUser) {
      console.log("User logged in successfully:", loggedInUser); // Debugging log
      setUser(loggedInUser); // Set the logged-in user
    } else {
      console.log("No user found. Redirecting to registration page."); // Debugging log
      setIsRegistering(true); // Redirect to the register page
    }
  };

  // Handle logout action
  const handleLogout = () => {
    console.log("User logged out. Clearing session."); // Debugging log
    setUser(null); // Clear the user state
    setIsRegistering(false); // Redirect to login
  };

  // Handle successful registration
  const handleRegistration = () => {
    console.log("Registration completed. Redirecting to login page."); // Debugging log
    setIsRegistering(false); // Redirect to login page after registration
  };

  return (
    <div>
      {user ? (
        <Home user={user} onLogout={handleLogout} />
      ) : isRegistering ? (
        <Register onRegister={handleRegistration} />
      ) : (
        <LoginMaterial onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
