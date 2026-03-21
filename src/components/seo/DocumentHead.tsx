import { Helmet } from "react-helmet-async";

const BASE_URL = "https://clasly.app";

export interface DocumentHeadProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}

export function DocumentHead({
  title,
  description,
  path = "/",
  ogImage = `${BASE_URL}/og-image.svg`,
}: DocumentHeadProps) {
  const canonicalUrl = path === "/" ? BASE_URL : `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
