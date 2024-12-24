// src/App.js
import React, { useState } from "react";
import LoginMaterial from "./components/LoginMaterial";
import Register from "./components/Register";
import Home from "./components/Home";

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = (user) => {
    if (user) {
      setUser(user); // Set the logged-in user
    } else {
      setIsRegistering(true); // Redirect to the register page
    }
  };

  const handleLogout = () => {
    setUser(null); // Clear the user state
    setIsRegistering(false); // Redirect to login
  };

  return (
    <div>
      {user ? (
        <Home user={user} onLogout={handleLogout} />
      ) : isRegistering ? (
        <Register onRegister={() => setIsRegistering(false)} />
      ) : (
        <LoginMaterial onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
