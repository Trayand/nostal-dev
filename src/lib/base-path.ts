/** Prefix for static files when the site is hosted under a sub-path (GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
