---
name: shadcn-ui
description: Guidelines and best practices for building modern, accessible user interfaces using shadcn/ui and Tailwind CSS.
---

# shadcn/ui Skill Guidelines

When asked to build or modify UI components, use **shadcn/ui** and **Tailwind CSS** to maintain a cohesive, accessible, and premium design system.

## 1. Core Principles
- **Copy and Paste over npm install**: shadcn/ui components are owned by the project. They live in `components/ui` and can be customized heavily.
- **Accessibility First**: Rely on Radix UI primitives for keyboard navigation, focus management, and screen reader support.
- **Utility-First Styling**: Use Tailwind CSS for all styling. Avoid custom CSS files or inline styles unless strictly necessary for dynamic values.

## 2. Using Components
- To add a new component, always check if it exists in shadcn/ui first.
- If it exists, add it via CLI (if supported by the project environment) or manually by copying the code from the documentation:
  ```bash
  npx shadcn-ui@latest add [component-name]
  ```
- Example components: `Button`, `Input`, `Dialog`, `DropdownMenu`, `Card`, `Avatar`, `Toast`.

## 3. Customization & Theming
- **CSS Variables**: Customize the theme using CSS variables in `index.css` (or `globals.css`). shadcn/ui uses semantic colors like `--primary`, `--secondary`, `--muted`, `--destructive`.
- **Dark Mode**: Support dark mode out-of-the-box using Tailwind's `dark:` variant and switching CSS variables under the `.dark` class.
- **cn() utility**: Use the `cn()` utility (typically found in `lib/utils.js`) to merge Tailwind classes cleanly, especially when allowing overrides via `className` props:
  ```javascript
  import { cn } from "@/lib/utils"
  
  export function MyComponent({ className, ...props }) {
    return <div className={cn("base-classes", className)} {...props} />
  }
  ```

## 4. UI/UX Best Practices (Premium Feel)
- Use generous padding/margins and whitespace.
- Use subtle borders (`border-border`) and muted backgrounds (`bg-muted`) to establish hierarchy.
- For interactive elements, always include hover (`hover:bg-accent`), focus (`focus-visible:ring`), and disabled (`disabled:opacity-50`) states.
- Incorporate micro-interactions using framer-motion or simple Tailwind transitions (`transition-colors`, `duration-200`).

## 5. Directory Structure
- Place all reusable shadcn/ui components in `src/components/ui/`.
- Place composite components or layout files in `src/components/`.
- Utility functions (like `cn`) belong in `src/lib/utils.js`.
