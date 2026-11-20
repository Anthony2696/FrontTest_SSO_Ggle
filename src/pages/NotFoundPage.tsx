import { Link } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';

interface NotFoundProps {
  title?: string;
  message?: string;
}

export function NotFoundPage({
  title = 'Página no encontrada',
  message = 'La ruta que buscas no existe en este simulador.',
}: NotFoundProps) {
  return (
    <div className="page">
      <AppHeader />
      <main className="auth-main">
        <section className="auth-panel">
          <div className="auth-icon auth-icon--neutral">?</div>
          <h1>{title}</h1>
          <p className="auth-text">{message}</p>
          <div className="auth-actions">
            <Link className="button button--primary" to="/">
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
