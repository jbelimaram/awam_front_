import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthContext';
import { ToastProvider } from './hooks/ToastContext';
import ToastContainer from './components/Common/ToastContainer';
import PageLoader from './components/Common/PageLoader';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import {
  ClimatePage,
  CropsPage,
  DashboardPage,
  EmployeesPage,
  ForgotPasswordPage,
  LoginPage,
  ProfilePage,
  RegisterPage,
  IrrigationPage,
} from './routes/lazyPages';
import { preloadMainPagesWhenIdle } from './routes/preload';

/**
 * Les pages sont chargées À LA DEMANDE (routes/lazyPages.ts) : le code d'une
 * page n'est téléchargé qu'à son ouverture, et la petite pousse de
 * PageLoader s'affiche pendant ce court téléchargement. Après l'ouverture,
 * les pages principales sont préchargées discrètement (routes/preload.ts),
 * pour que leur première visite soit immédiate.
 */
export default function App() {
  useEffect(() => {
    preloadMainPagesWhenIdle();
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
              <Route path="/reinitialiser-mot-de-passe/:token" element={<ForgotPasswordPage />} />
              <Route path="/cultures" element={<ProtectedRoute><CropsPage /></ProtectedRoute>} />
              <Route path="/employes" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
              <Route path="/climat" element={<ProtectedRoute><ClimatePage /></ProtectedRoute>} />
              <Route path="/irrigation" element={<ProtectedRoute><IrrigationPage /></ProtectedRoute>} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}