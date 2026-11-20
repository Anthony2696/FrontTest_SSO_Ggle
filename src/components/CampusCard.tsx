import type { Campus } from '../types';

interface CampusCardProps {
  campus: Campus;
  busy: boolean;
  disabled: boolean;
  variant?: 'default' | 'tail';
  onEnter: (campus: Campus) => void;
}

function EnterIcon() {
  return (
    <svg className="enter-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

export function CampusCard({ campus, busy, disabled, variant = 'default', onEnter }: CampusCardProps) {
  return (
    <article className={`campus-card${variant === 'tail' ? ' campus-card--tail' : ''}`}>
      <div className="campus-card__media">
        <img
          className="img"
          src={campus.image}
          alt={`Imagen del campus ${campus.name}`}
          loading="lazy"
        />
      </div>
      <div className="campus-card__text">
        <h6 className="campus-card__name">{campus.name}</h6>
      </div>
      <button
        type="button"
        className="campus-card__action"
        onClick={() => onEnter(campus)}
        disabled={disabled}
        aria-label={`Ingresar al campus ${campus.name}`}
      >
        {busy ? <span className="spinner spinner--small" aria-hidden="true" /> : <EnterIcon />}
        <span className="ingresar">{busy ? 'CONECTANDO…' : 'INGRESAR'}</span>
      </button>
    </article>
  );
}
