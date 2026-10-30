"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Page } from "@/components/Page";
import { Button, Card } from "@/components/ui";
import { loadIndex } from "@/lib/content/loader";
import { localDate } from "@/lib/engine/dates";
import { getStorage, type ImportMode, type Settings } from "@/lib/storage";
import { parseExportFile } from "@/lib/storage/export-schema";
import { downloadBlob } from "@/lib/zip";

// Chrome/Edge/Android fire this event when the app can be installed.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-lg px-2 text-sm ${value === o.value ? "bg-surface font-semibold shadow" : "text-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { t, settings, updateSettings } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [version, setVersion] = useState("");
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIndex().then((i) => setVersion(`${i.version} · ${i.questions.length} soal`)).catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    navigator.serviceWorker?.getRegistration().then((r) => setOffline(!!r?.active)).catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const exportData = async () => {
    const data = await getStorage().exportAll();
    downloadBlob(JSON.stringify(data, null, 2), `programming-hub-backup-${localDate()}.json`, "application/json");
  };

  const importData = async (file: File) => {
    try {
      const parsed = parseExportFile(JSON.parse(await file.text()));
      await getStorage().importAll(parsed, mode);
      setMessage(t("settings.importDone"));
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setMessage(`${t("settings.importFailed")}: ${(e as Error).message}`);
    }
  };

  const reset = async () => {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    await getStorage().resetAll();
    try {
      localStorage.removeItem("ph-daily");
    } catch {
      // ignore
    }
    setMessage(t("settings.resetDone"));
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <Page title={t("settings.title")}>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t("settings.theme")}</span>
            <Segmented<Settings["theme"]>
              label={t("settings.theme")}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: "dark", label: t("settings.theme.dark") },
                { value: "light", label: t("settings.theme.light") },
                { value: "system", label: t("settings.theme.system") },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t("settings.lang")}</span>
            <Segmented<Settings["lang"]>
              label={t("settings.lang")}
              value={settings.lang}
              onChange={(lang) => updateSettings({ lang })}
              options={[{ value: "id", label: "Bahasa Indonesia" }, { value: "en", label: "English" }]}
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t("settings.goal")}: {settings.dailyGoalMinutes}</span>
            <input type="range" min={5} max={60} step={5} value={settings.dailyGoalMinutes}
              onChange={(e) => updateSettings({ dailyGoalMinutes: Number(e.target.value) })}
              className="h-11 accent-[var(--accent)]" />
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("settings.data")}</h2>
          <Button variant="primary" onClick={exportData}>{t("settings.export")}</Button>
          <Segmented<ImportMode>
            label={t("settings.import")}
            value={mode}
            onChange={setMode}
            options={[{ value: "merge", label: t("settings.importMerge") }, { value: "replace", label: t("settings.importReplace") }]}
          />
          <Button onClick={() => fileInput.current?.click()}>{t("settings.import")}</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <Button variant="danger" onClick={reset}>{t("settings.reset")}</Button>
          {message && <p role="status" className="text-sm">{message}</p>}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("settings.install")}</h2>
          <p className="text-sm text-muted">{t("settings.installHelp")}</p>
          {installEvent && <Button variant="primary" onClick={() => installEvent.prompt()}>{t("settings.installNow")}</Button>}
        </Card>

        <Card className="flex flex-col gap-1 text-sm text-muted">
          <h2 className="font-semibold text-text">{t("settings.about")}</h2>
          <p>{t("settings.contentVersion")}: {version || "–"}</p>
          {offline && <p className="text-ok">✓ {t("settings.offlineReady")}</p>}
        </Card>
      </div>
    </Page>
  );
}
