const SVG_XML_NAMESPACE = "http://www.w3.org/2000/svg";

function createBrainIconPathElement(): SVGPathElement {
  const pathElement = document.createElementNS(SVG_XML_NAMESPACE, "path");
  pathElement.setAttribute(
    "d",
    "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 4 4 0 0 0 7.636 2.106 3.2 3.2 0 0 0 .164-.546 4 4 0 0 0 1.84-2.16 4 4 0 0 0 .86-2.12 3 3 0 0 0 .86-2.12 4 4 0 0 0-1.84-2.16 3.2 3.2 0 0 0-.164-.546 4 4 0 0 0-7.636 2.106 4 4 0 0 0-.556 6.588 4 4 0 0 0 2.526 5.77A3 3 0 0 0 12 5z"
  );
  return pathElement;
}

function createBrainIconSvgElement(): SVGSVGElement {
  const svgElement = document.createElementNS(SVG_XML_NAMESPACE, "svg");
  svgElement.setAttribute("width", "20");
  svgElement.setAttribute("height", "20");
  svgElement.setAttribute("viewBox", "0 0 24 24");
  svgElement.setAttribute("fill", "none");
  svgElement.setAttribute("stroke", "currentColor");
  svgElement.setAttribute("stroke-width", "1.75");
  svgElement.setAttribute("stroke-linecap", "round");
  svgElement.setAttribute("stroke-linejoin", "round");
  svgElement.setAttribute("aria-hidden", "true");
  svgElement.append(createBrainIconPathElement());
  return svgElement;
}

function createToggleButtonStylesheet(): HTMLStyleElement {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    :host { all: initial; }
    .cb-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #1a1a1a;
      color: #ffffff;
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
      transition: background 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .cb-toggle:hover { transform: scale(1.05); background: #2a2a2a; }
    .cb-toggle:focus-visible { outline: 2px solid #6b9fff; outline-offset: 2px; }
    .cb-toggle.cb-off { opacity: 0.55; background: #3a3a3a; }
    .cb-toggle svg { display: block; }
  `;
  return styleElement;
}

function buildToggleButtonTitle(isInjectionEnabled: boolean): string {
  return isInjectionEnabled
    ? "ContextBridge: context injection on (click to disable)"
    : "ContextBridge: context injection off (click to enable)";
}

function updateInjectionToggleButtonAppearance(
  toggleButton: HTMLButtonElement,
  isInjectionEnabled: boolean
): void {
  toggleButton.classList.toggle("cb-off", !isInjectionEnabled);
  toggleButton.title = buildToggleButtonTitle(isInjectionEnabled);
  toggleButton.setAttribute("aria-pressed", String(isInjectionEnabled));
}

function createInjectionToggleButton(
  isInjectionEnabled: boolean,
  onToggleClick: () => void
): HTMLButtonElement {
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "cb-toggle";
  toggleButton.title = "ContextBridge: context injection on";
  toggleButton.append(createBrainIconSvgElement());
  updateInjectionToggleButtonAppearance(toggleButton, isInjectionEnabled);
  toggleButton.addEventListener("click", onToggleClick);
  return toggleButton;
}

function createInjectionToggleHostElement(
  toggleButton: HTMLButtonElement
): HTMLDivElement {
  const hostElement = document.createElement("div");
  hostElement.id = "contextbridge-toggle-host";
  const shadowRoot = hostElement.attachShadow({ mode: "closed" });
  shadowRoot.append(createToggleButtonStylesheet(), toggleButton);
  return hostElement;
}

function floatingInjectionToggleAlreadyMounted(): boolean {
  return !!document.getElementById("contextbridge-toggle-host");
}

export function mountFloatingInjectionToggleButton(
  isInjectionEnabled: boolean,
  onInjectionEnabledChange: (isEnabled: boolean) => void
): void {
  if (floatingInjectionToggleAlreadyMounted()) return;

  let currentInjectionEnabled = isInjectionEnabled;
  const toggleButton = createInjectionToggleButton(currentInjectionEnabled, () => {
    currentInjectionEnabled = !currentInjectionEnabled;
    updateInjectionToggleButtonAppearance(toggleButton, currentInjectionEnabled);
    onInjectionEnabledChange(currentInjectionEnabled);
  });

  document.body.appendChild(createInjectionToggleHostElement(toggleButton));
}

export function mountFloatingInjectionToggleButtonWhenPageReady(
  isInjectionEnabled: boolean,
  onInjectionEnabledChange: (isEnabled: boolean) => void
): void {
  if (document.body) {
    mountFloatingInjectionToggleButton(
      isInjectionEnabled,
      onInjectionEnabledChange
    );
    return;
  }

  document.addEventListener(
    "DOMContentLoaded",
    () =>
      mountFloatingInjectionToggleButton(
        isInjectionEnabled,
        onInjectionEnabledChange
      ),
    { once: true }
  );
}
