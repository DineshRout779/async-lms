import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'CodeGuru';
const BASE_URL = 'https://codeguru.app';

export default function SEO({ title, description, noIndex = false }: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name='description' content={description} />}
      <meta name='robots' content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel='canonical' href={`${BASE_URL}${window.location.pathname}`} />

      <meta property='og:title' content={fullTitle} />
      {description && <meta property='og:description' content={description} />}

      <meta name='twitter:title' content={fullTitle} />
      {description && <meta name='twitter:description' content={description} />}
    </Helmet>
  );
}
