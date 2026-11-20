import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

/*
 * Sin StrictMode a propósito: en desarrollo React ejecuta dos veces los efectos,
 * lo que consumiría el código de Google (single-use) dos veces seguidas.
 */
createRoot(document.getElementById('root')!).render(<App />);
