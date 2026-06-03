import { useCallback, useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  type AppSettings,
  type CompressionStrategy,
} from "../../storage/settings";
import shared from "../components/shared.module.css";
import styles from "./SettingsView.module.css";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={shared.toggle}>
      <div>
        <div className={shared.toggleLabel}>{label}</div>
        {hint ? <div className={shared.toggleHint}>{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${shared.switch} ${checked ? shared.switchOn : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className={shared.switchKnob} />
      </button>
    </div>
  );
}

export default function SettingsView() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [maxCharsInput, setMaxCharsInput] = useState("3000");

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    setMaxCharsInput(String(s.maxContextChars));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (partial: Partial<AppSettings>) => {
    await saveSettings(partial);
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleMaxCharsBlur = () => {
    const parsed = parseInt(maxCharsInput, 10);
    if (!settings) return;
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
    setMaxCharsInput(String(value));
    void patch({ maxContextChars: value });
  };

  if (!settings) {
    return <p className={shared.empty}>Loading settings…</p>;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.section}>
        <span className={shared.label}>Compression strategy</span>
        <div className={styles.segmented}>
          {(["extractive", "abstractive"] as CompressionStrategy[]).map(
            (strategy) => (
              <button
                key={strategy}
                type="button"
                className={`${styles.segment} ${
                  settings.compressionStrategy === strategy
                    ? styles.segmentActive
                    : ""
                }`}
                onClick={() => void patch({ compressionStrategy: strategy })}
              >
                {strategy}
              </button>
            )
          )}
        </div>
      </div>

      <Toggle
        label="Auto-inject on tab switch"
        hint="Inject context when opening a supported AI tab"
        checked={settings.autoInject}
        onChange={(autoInject) => void patch({ autoInject })}
      />

      <Toggle
        label="Context injection enabled"
        hint="Same as the floating page toggle (cb_inject_enabled)"
        checked={settings.injectEnabled}
        onChange={(injectEnabled) => void patch({ injectEnabled })}
      />

      <div>
        <label className={shared.label} htmlFor="max-chars">
          Max context characters
        </label>
        <input
          id="max-chars"
          type="number"
          min={500}
          max={10000}
          step={100}
          className={shared.input}
          value={maxCharsInput}
          onChange={(e) => setMaxCharsInput(e.target.value)}
          onBlur={handleMaxCharsBlur}
        />
      </div>

      <p className={styles.hint}>
        Extractive compression is fast and offline. Abstractive uses a local
        DistilBART model (first run downloads weights). Auto-inject requires
        injection to be enabled.
      </p>
    </div>
  );
}
