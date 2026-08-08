import { useMatches } from 'react-router';

// ----------------------------------------------------------------------

export type RouteMetadata = {
  title?: string;
  description?: string;
  keywords?: string;
};

const routeMetadataKeys = ['title', 'description', 'keywords'] as const;

const isRouteMetadata = (handle: unknown): handle is RouteMetadata => {
  if (typeof handle !== 'object' || handle === null) return false;

  return routeMetadataKeys.some(
    (key) => typeof (handle as Record<string, unknown>)[key] === 'string'
  );
};

export function RouteMeta() {
  const metadata = [...useMatches()]
    .reverse()
    .map(({ handle }) => handle)
    .find(isRouteMetadata);

  if (!metadata) return null;

  return (
    <>
      {metadata.title ? <title>{metadata.title}</title> : null}
      {metadata.description ? <meta name="description" content={metadata.description} /> : null}
      {metadata.keywords ? <meta name="keywords" content={metadata.keywords} /> : null}
    </>
  );
}
