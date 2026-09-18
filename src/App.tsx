import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
<<<<<<< HEAD
import { clearSession, isAuthenticated } from "./services/sessionStorage";
import { AUTH_MODES, getAuthMode, getSupabaseAuthSession, signOutAuth } from "./services/authService";
=======
import { TrackedVehiclesProvider } from "./context/TrackedVehiclesContext";
>>>>>>> e19f46db99295929579026857074dda7619efeec

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        isAuthenticated()
    );
    const [authChecked, setAuthChecked] = useState(getAuthMode() !== AUTH_MODES.SUPABASE);

    useEffect(() => {
        if (getAuthMode() !== AUTH_MODES.SUPABASE) return;
        getSupabaseAuthSession()
            .then((session) => {
                const authenticated = Boolean(session) && isAuthenticated();
                if (!authenticated) clearSession();
                setIsLoggedIn(authenticated);
            })
            .catch(() => {
                clearSession();
                setIsLoggedIn(false);
            })
            .finally(() => setAuthChecked(true));
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        try {
            await signOutAuth();
        } catch (error) {
            console.error("Güvenli çıkış tamamlanamadı:", error);
        }
        clearSession();
        setIsLoggedIn(false);
    };

<<<<<<< HEAD
    if (!authChecked) return null;
    return isLoggedIn ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
=======
    return (
        <TrackedVehiclesProvider>
            {isLoggedIn ? (
                <Home onLogout={handleLogout} />
            ) : (
                <Login onLogin={handleLogin} />
            )}
        </TrackedVehiclesProvider>
    );
>>>>>>> e19f46db99295929579026857074dda7619efeec
}

export default App;
