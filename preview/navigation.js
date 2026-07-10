export const referenceAreas = [
  {
    id: "foundations",
    label: "Foundations",
    description: "Tokens, type, layout, and visual properties",
    path: "foundations/",
    pages: [
      { id: "foundations", label: "Overview", path: "foundations/" },
      { id: "foundation-tokens", label: "Design tokens", path: "foundations/tokens/" },
      { id: "foundation-colors", label: "Colors", path: "foundations/colors/" },
      { id: "foundation-typography", label: "Typography", path: "foundations/typography/" },
      { id: "foundation-layout", label: "Layout", path: "foundations/layout/" },
      {
        id: "foundation-shape-depth",
        label: "Shape and depth",
        path: "foundations/shape-and-depth/",
      },
      { id: "foundation-motion", label: "Motion", path: "foundations/motion/" },
    ],
  },
  {
    id: "interface",
    label: "Interface",
    description: "Shared primitives and interaction examples",
    path: "interface/",
    pages: [
      { id: "interface", label: "Overview", path: "interface/" },
      { id: "interface-primitives", label: "Shared primitives", path: "interface/primitives/" },
      {
        id: "interface-examples",
        label: "Interaction examples",
        path: "interface/interaction-examples/",
      },
    ],
  },
  {
    id: "compositions",
    label: "Compositions",
    description: "Product, content, and public surfaces",
    path: "compositions/",
    pages: [
      { id: "compositions", label: "Overview", path: "compositions/" },
      { id: "composition-product", label: "Product surfaces", path: "compositions/product/" },
      { id: "composition-content", label: "Content surfaces", path: "compositions/content/" },
      { id: "composition-public", label: "Public surfaces", path: "compositions/public/" },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    description: "Adoption, adapters, skills, and release guidance",
    path: "resources/",
    pages: [
      { id: "resources", label: "Overview", path: "resources/" },
      { id: "resource-getting-started", label: "Getting started", path: "resources/getting-started/" },
      { id: "resource-theming", label: "Theming", path: "resources/theming/" },
      { id: "resource-adapters", label: "Consumer adapters", path: "resources/consumer-adapters/" },
      { id: "resource-tailwind", label: "Tailwind", path: "resources/tailwind/" },
      { id: "resource-skills", label: "Skills", path: "resources/skills/" },
      { id: "resource-accessibility", label: "Accessibility", path: "resources/accessibility/" },
      { id: "resource-release", label: "Release", path: "resources/release/" },
    ],
  },
];

export const referencePages = referenceAreas.flatMap((area) =>
  area.pages.map((page) => ({ ...page, areaId: area.id, areaLabel: area.label })),
);

export function getReferencePage(id) {
  return referencePages.find((page) => page.id === id);
}

export function getReferenceArea(id) {
  const page = getReferencePage(id);
  return referenceAreas.find((area) => area.id === (page?.areaId || id));
}
