import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Subscriptions from './pages/Subscriptions';
import Events from './pages/Events';

function Nav() {
  const { token, user, logout } = useAuth();

  return (
    <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', alignItems: 'center' }}>
      {token ? (
        <>
          <Link to="/subscriptions">Subscriptions</Link>
          <Link to="/events">Events</Link>
          <span style={{ marginLeft: 'auto' }}>{user?.email}</span>
          <button onClick={logout} style={{ cursor: 'pointer' }}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Signup</Link>
        </>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
          <Nav />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <Subscriptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
