import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TabBar } from "@/components/TabBar";
import { BASE_PATH } from "@/lib/base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Programming Hub",
  description: "Latihan pemrograman harian — offline, mobile-first.",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: `${BASE_PATH}/icon.svg`,
    apple: `${BASE_PATH}/icons/apple-touch-icon.png`,
  },
  appleWebApp: { capable: true, title: "Prog Hub", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Lets the layout shrink when the on-screen keyboard opens (Chrome Android),
  // so the sticky action bar and code toolbar stay visible.
  interactiveWidget: "resizes-content",
  themeColor: "#0e1016",
};

// Runs before first paint so the page never flashes the wrong theme.
const themeBoot = `try{var t=localStorage.getItem('ph-theme')||'dark';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <AppProvider>
          <ServiceWorker />
          {children}
          <TabBar />
        </AppProvider>
      </body>
    </html>
  );
}
