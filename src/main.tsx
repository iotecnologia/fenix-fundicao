import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './estilos/base.css';
import './estilos/telas.css';
import './estilos/impressao.css';
import './estilos/gestao.css';
import './estilos/fenix.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
