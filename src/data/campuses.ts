import type { Campus } from '../types';

export const campuses: Campus[] = [
  { slug: 'toluca', name: 'TOLUCA', image: '/img/campus/toluca.jpg' },
  { slug: 'sur', name: 'SUR', image: '/img/campus/sur.jpg' },
  { slug: 'queretaro', name: 'QUERETARO', image: '/img/campus/queretaro.jpg' },
  { slug: 'guadalajara', name: 'GUADALAJARA', image: '/img/campus/guadalajara.jpg' },
  { slug: 'los-reyes', name: 'LOS REYES', image: '/img/campus/reyes.jpg' },
  { slug: 'marina', name: 'MARINA', image: '/img/campus/marina.jpg' },
  { slug: 'atizapan', name: 'ATIZAPAN', image: '/img/campus/atizapan.jpg' },
  { slug: 'leon', name: 'LEON', image: '/img/campus/leon.jpg' },
  { slug: 'cuitlahuac', name: 'CUITLAHUAC', image: '/img/campus/cuitlahuac.jpg' },
  { slug: 'ecatepec', name: 'ECATEPEC', image: '/img/campus/ecatepec.jpg' },
  { slug: 'monterrey', name: 'MONTERREY', image: '/img/campus/monterrey.jpg' },
  { slug: 'puebla', name: 'PUEBLA', image: '/img/campus/puebla.jpg' },
];

/** Los dos últimos campus se muestran centrados en una fila propia, como en el sitio original. */
export const lastRowCampuses: Campus[] = [
  { slug: 'merida', name: 'MÉRIDA', image: '/img/campus/merida.jpg' },
  { slug: 'online', name: 'ON LINE', image: '/img/campus/online.jpg' },
];

export const allCampuses = [...campuses, ...lastRowCampuses];

export function findCampusBySlug(slug: string | undefined): Campus | undefined {
  if (!slug) return undefined;
  return allCampuses.find((campus) => campus.slug === slug);
}
