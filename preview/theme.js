export const themeModes = ["light", "dark", "system"];

export function nextThemeMode(mode) {
  const currentIndex = themeModes.indexOf(mode);
  return themeModes[(currentIndex + 1) % themeModes.length];
}

export function resolveThemeMode(mode, prefersDark) {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode === "light" ? "light" : "dark";
}
