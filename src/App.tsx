import { useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        localStorage.getItem("fts_logged_in") === "true"
    );

    const handleLogin = () => {
        localStorage.setItem("fts_logged_in", "true");
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("fts_logged_in");
        setIsLoggedIn(false);
    };

    return isLoggedIn ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}

export default App;