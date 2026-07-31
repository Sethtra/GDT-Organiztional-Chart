# Color and Visual System

## Gather evidence

Inspect existing CSS variables, theme objects, brand assets, screenshots, typography, iconography, and representative screens. Determine whether the interface is primarily content, commerce, administration, productivity, data visualization, or another domain.

Preserve established brand choices unless the user requests a new direction. If no brand exists, choose a restrained neutral foundation and an accent appropriate to the product’s tone and audience.

## Define semantic tokens

Prefer semantic roles such as:

```text
background, surface, surface-raised
text, text-muted, text-inverse
border, border-strong
primary, primary-hover, primary-active, on-primary
success, warning, danger, info
focus-ring, selection
```

Add component-specific tokens only when shared semantic tokens cannot express a real distinction. Keep light and dark themes role-equivalent rather than mechanically inverting colors.

## Contrast and meaning

- Target WCAG 2.2 AA unless the project specifies a higher bar.
- Use at least 4.5:1 for normal text and 3:1 for large-scale text.
- Use at least 3:1 for meaningful component boundaries, icons, focus indicators, and graphical objects where non-text contrast applies.
- Treat disabled and purely decorative content according to the applicable standard, but keep it understandable.
- Never communicate status, hierarchy, or chart series by color alone. Add labels, shapes, patterns, icons, or position.
- Test hover, focus, selected, disabled, error, and dark-theme combinations—not only the default state.

Use the bundled contrast script for hex or RGB color pairs. For gradients, transparency, images, and dynamic backgrounds, inspect the rendered result across the actual range.

## Visual hierarchy

- Establish hierarchy through scale, weight, spacing, grouping, and placement before adding decoration.
- Use a spacing rhythm derived from the project instead of enforcing one universal scale.
- Use radii, borders, elevation, and motion consistently and sparingly.
- Preserve information density appropriate to the task. Administrative and analytical tools should not be padded like marketing pages.
- Avoid defaulting to purple gradients, oversized hero copy, excessive cards, glass effects, or shadows unless they support the product’s character.

## Data visualization

Choose categorical, sequential, or diverging palettes according to the data relationship. Verify adjacent colors, small marks, selection states, and color-vision deficiencies. Provide textual values or another non-color representation for essential information.
