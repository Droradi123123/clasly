const BASE_URL = "https://clasly.app";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Clasly",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.svg`,
  description:
    "Clasly creates AI-powered interactive presentations. Build live lectures, quizzes, and polls—students join from their phones, no downloads needed.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Clasly",
  url: BASE_URL,
  description:
    "AI builds interactive presentations in seconds. Create live lectures, quizzes, and polls—students join from their phones.",
  publisher: {
    "@type": "Organization",
    name: "Clasly",
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/favicon.svg`,
    },
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clasly",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "AI-powered interactive presentation tool. Create live lectures with quizzes, polls, and word clouds. Students participate from their phones.",
};

export function StructuredData() {
  const schema = [
    organizationSchema,
    websiteSchema,
    softwareAppSchema,
  ];

  return (
    <>
      {schema.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
