import { useCallback, useEffect, useState } from "react";
import {
  readExtensionSettings,
  writeExtensionSettings,
  type ExtensionSettings,
} from "../../storage/extensionSettings";
import shared from "../components/shared.module.css";
import styles from "./ExtensionSettingsView.module.css";

function SettingsToggleSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (isChecked: boolean) => void;
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

export default function ExtensionSettingsView() {
  const [extensionSettings, setExtensionSettings] =
    useState<ExtensionSettings | null>(null);

  const loadExtensionSettings = useCallback(async () => {
    setExtensionSettings(await readExtensionSettings());
  }, []);

  useEffect(() => {
    void loadExtensionSettings();
  }, [loadExtensionSettings]);

  const updateExtensionSetting = async <SettingName extends keyof ExtensionSettings>(
    settingName: SettingName,
    settingValue: ExtensionSettings[SettingName]
  ) => {
    await writeExtensionSettings({ [settingName]: settingValue });
    setExtensionSettings((previousSettings) =>
      previousSettings
        ? { ...previousSettings, [settingName]: settingValue }
        : previousSettings
    );
  };

  if (!extensionSettings) {
    return <p className={shared.empty}>Loading settings…</p>;
  }

  return (
    <div className={styles.stack}>
      <SettingsToggleSwitch
        label="Auto-inject on tab switch"
        hint="Paste the summary when opening a supported AI tab"
        checked={extensionSettings.autoInject}
        onChange={(autoInject) =>
          void updateExtensionSetting("autoInject", autoInject)
        }
      />

      <SettingsToggleSwitch
        label="Context injection enabled"
        hint="Same as the floating page toggle (cb_inject_enabled)"
        checked={extensionSettings.injectEnabled}
        onChange={(injectEnabled) =>
          void updateExtensionSetting("injectEnabled", injectEnabled)
        }
      />

      <div>
        <label className={shared.label} htmlFor="api-url">
          API URL
        </label>
        <input
          id="api-url"
          type="url"
          className={shared.input}
          value={extensionSettings.apiUrl}
          onChange={(event) =>
            void updateExtensionSetting("apiUrl", event.target.value)
          }
        />
      </div>

      <div>
        <label className={shared.label} htmlFor="api-key">
          API key
        </label>
        <input
          id="api-key"
          type="password"
          className={shared.input}
          value={extensionSettings.apiKey}
          onChange={(event) =>
            void updateExtensionSetting("apiKey", event.target.value)
          }
          autoComplete="off"
        />
      </div>

      <div>
        <label className={shared.label} htmlFor="api-model">
          Model
        </label>
        <input
          id="api-model"
          type="text"
          className={shared.input}
          value={extensionSettings.apiModel}
          onChange={(event) =>
            void updateExtensionSetting("apiModel", event.target.value)
          }
        />
      </div>

      <p className={styles.hint}>
        When you switch away from an AI tab, ContextBridge reads the full
        conversation from the page, sends it to your API once, and pastes the
        summary into the next tab. Uses OpenAI-compatible chat completions.
      </p>
    </div>
  );
}
