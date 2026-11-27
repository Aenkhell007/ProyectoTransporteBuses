import { CargaSeccion } from './components/ui/CargaSeccion';
import { AuthProvider } from "./features/auth/AuthContext";
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el contenedor de la aplicación');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter><AuthProvider><Suspense fallback={<CargaSeccion />}><App /></Suspense></AuthProvider></BrowserRouter>
  </StrictMode>,
);
