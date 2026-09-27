'use client';
import MovieRow from '@/features/catalog/components/MovieRow';

const LISTING_BY_TYPE = { movie: 'peliculas', series: 'series' };

/**
 * Renderiza las secciones de un feed curado. Los iconos son presentación:
 * se asignan por id de sección y no forman parte de la respuesta de la API.
 * @param {{ sections: Array<{ id: string, title: string, type: string, ranked: boolean, items: object[] }>, icons?: Record<string, { icon: import('react').ComponentType, color?: string }> }} props
 */
export default function FeedRows({ sections, icons = {} }) {
  return sections.map((section) => (
    <MovieRow
      key={section.id}
      title={section.title}
      items={section.items}
      listingType={LISTING_BY_TYPE[section.type]}
      icon={icons[section.id]?.icon}
      iconColor={icons[section.id]?.color}
      showRank={section.ranked}
    />
  ));
}
