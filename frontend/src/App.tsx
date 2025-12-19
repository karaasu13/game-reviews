import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import WishlistPage from "./pages/Wishlist";
import SignInPage from "./pages/SignIn";
import GameDetailsPage from "./pages/GameDetails";
import AddGamePage from "./pages/AddGame";
import { AuthProvider } from "./state/auth";
import { WishlistProvider } from "./state/wishlist";

function App() {
  // Arvore principal com providers e rotas da SPA
  return (
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games/new" element={<AddGamePage />} />
            <Route path="/games/:id" element={<GameDetailsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
