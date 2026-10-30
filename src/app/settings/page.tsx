"use client";

import { Page } from "@/components/Page";
import { useApp } from "@/components/AppProvider";

export default function SettingsPage() {
  const { t } = useApp();
  return <Page title={t("settings.title")}><p className="text-muted">P0 placeholder</p></Page>;
}
