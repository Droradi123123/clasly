/**
 * Shared helpers for Educator vs Webinar product context in the app shell.
 */

/** Total height of fixed app header: main row (64px) + product context bar (36px). */
export const APP_SHELL_HEADER_PX = 100;

export function appMainPaddingClass(): string {
  return "pt-[100px]";
}

export function isAppSurfacePath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/webinar/dashboard")) return true;
  if (pathname.startsWith("/webinar/editor")) return true;
  if (pathname.startsWith("/webinar/present")) return true;
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/present")) return true;
  if (/^\/lecture\/[^/]+\/analytics$/.test(pathname)) return true;
  return false;
}

/**
 * Webinar accent for header/auth/pricing (matches legacy Header logic):
 * webinar marketing routes, /webinar/* app routes, or editor/present with ?track=webinar.
 */
export function isWebinarChromeContext(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === "/webinar") return true;
  if (pathname.startsWith("/webinar/")) return true;
  if (pathname === "/pricing" && searchParams.get("product") === "webinar") return true;
  if (pathname.startsWith("/editor") && searchParams.get("track") === "webinar") return true;
  if (pathname.startsWith("/present") && searchParams.get("track") === "webinar") return true;
  return false;
}

export function isWebinarSurfaceActive(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return (
    pathname.startsWith("/webinar/dashboard") ||
    pathname.startsWith("/webinar/editor") ||
    pathname.startsWith("/webinar/present") ||
    (pathname === "/pricing" && searchParams.get("product") === "webinar") ||
    (pathname.startsWith("/editor") && searchParams.get("track") === "webinar") ||
    (pathname.startsWith("/present") && searchParams.get("track") === "webinar") ||
    (/^\/lecture\/[^/]+\/analytics$/.test(pathname) && searchParams.get("track") === "webinar")
  );
}

export function isEducatorSurfaceActive(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return (
    pathname === "/dashboard" ||
    (pathname === "/pricing" && searchParams.get("product") !== "webinar") ||
    (pathname.startsWith("/editor") && searchParams.get("track") !== "webinar") ||
    (pathname.startsWith("/present") && searchParams.get("track") !== "webinar") ||
    (/^\/lecture\/[^/]+\/analytics$/.test(pathname) && searchParams.get("track") !== "webinar")
  );
}

export type ProductSurfaceInfo = {
  product: "education" | "webinar";
  title: string;
  subtitle: string;
};

export function getProductSurfaceInfo(
  pathname: string,
  searchParams: URLSearchParams,
): ProductSurfaceInfo {
  const webinar =
    pathname.startsWith("/webinar/dashboard") ||
    pathname.startsWith("/webinar/editor") ||
    pathname.startsWith("/webinar/present") ||
    (pathname === "/pricing" && searchParams.get("product") === "webinar") ||
    (pathname.startsWith("/editor") && searchParams.get("track") === "webinar") ||
    (pathname.startsWith("/present") && searchParams.get("track") === "webinar") ||
    (/^\/lecture\/[^/]+\/analytics$/.test(pathname) && searchParams.get("track") === "webinar");
  const base = webinar
    ? {
        product: "webinar" as const,
        title: "Clasly for Webinar",
        subtitle: "Live sessions, lead capture & CTAs",
      }
    : {
        product: "education" as const,
        title: "Clasly for Educator",
        subtitle: "Interactive lectures & classes",
      };

  if (pathname === "/pricing") {
    return { ...base, subtitle: "Pricing" };
  }
  if (pathname === "/dashboard" || pathname.startsWith("/webinar/dashboard")) {
    return {
      ...base,
      subtitle: webinar ? "My webinars" : "My lectures",
    };
  }
  if (pathname.startsWith("/editor") || pathname.startsWith("/webinar/editor")) {
    return { ...base, subtitle: "Editor" };
  }
  if (pathname.startsWith("/present") || pathname.startsWith("/webinar/present")) {
    return { ...base, subtitle: "Present" };
  }
  if (/^\/lecture\/[^/]+\/analytics$/.test(pathname)) {
    return { ...base, subtitle: "Session analytics" };
  }
  return base;
}
