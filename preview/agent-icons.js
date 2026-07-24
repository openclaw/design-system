// Kept separate from the agent reference content so entry-graph modules
// can render icons without bundling the full component catalog.
const agentLucideNames = {
  "arrow-up": "arrow-up",
  "arrow-right": "arrow-right",
  check: "check",
  chevron: "chevron-down",
  "chevron-right": "chevron-right",
  "chevron-up": "chevron-up",
  "chevrons-down": "chevrons-down",
  close: "x",
  copy: "copy",
  file: "file-text",
  "file-code": "file-code",
  image: "image",
  mode: "mouse-pointer-2",
  model: "box",
  paperclip: "paperclip",
  plus: "plus",
  question: "circle-help",
  search: "search",
  sparkle: "sparkles",
  spinner: "loader-circle",
  stop: "square",
  terminal: "terminal",
  write: "pen-line",
};

export function agentIcon(name) {
  const lucideName = agentLucideNames[name] || name;
  return `<i class="oc-agent-icon" data-lucide="${lucideName}" aria-hidden="true"></i>`;
}
