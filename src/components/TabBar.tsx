"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { Icon, type IconName } from "./Icon";
import type { I18nKey } from "@/lib/i18n";

const tabs: { href: string; icon: IconName; label: I18nKey }[] = [
  { href: "/", icon: "today", label: "tab.today" },
  { href: "/practice/", icon: "practice", label: "tab.practice" },
  { href: "/cards/", icon: "cards", label: "tab.cards" },
  { href: "/progress/", icon: "progress", label: "tab.progress" },
  { href: "/settings/", icon: "settings", label: "tab.settings" },
];

function isActive(pathname: string, href: string) {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (href === "/") return p === "/";
  return p.startsWith(href) || (href === "/practice/" && p.startsWith("/desktop/"));
}

export function TabBar() {
  const pathname = usePathname();
  const { t } = useApp();

  // The question/session screen is full-screen: it has its own sticky action bar.
  if (pathname.startsWith("/session")) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-accent font-semibold" : "text-muted"
                }`}
              >
                <Icon name={tab.icon} className="h-6 w-6" />
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
