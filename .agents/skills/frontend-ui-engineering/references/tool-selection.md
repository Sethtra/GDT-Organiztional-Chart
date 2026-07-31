# Tool and Component Selection

Use this reference only when the task requires choosing or replacing frontend tools.

## Start with constraints

Identify:

- existing framework, renderer, language, and styling system
- server rendering, hydration, static export, or client-only constraints
- supported browsers and devices
- accessibility and localization requirements
- team conventions and maintenance capacity
- bundle, performance, security, and licensing constraints
- whether the need is one component or a reusable system

Compatibility with the existing project is a hard gate.

## Selection order

1. Reuse an existing project component when its semantics and behavior fit.
2. Prefer native HTML and CSS for standard controls and layout.
3. Extend the installed component library consistently.
4. Build a small local abstraction when behavior is project-specific.
5. Add a dependency for complex, repeated, or standards-sensitive behavior that is costly to implement safely.

Examples of behavior that may justify a mature primitive include focus-managed dialogs, comboboxes, date selection, data grids, virtualized lists, rich text editing, maps, diagrams, and advanced charts.

## Evaluate a new dependency

Verify current information from the tool’s official documentation and repository. Compare:

| Dimension | Questions |
| --- | --- |
| Compatibility | Does it support the project’s framework and rendering model? |
| Accessibility | Are keyboard, focus, semantics, and screen-reader behaviors documented and testable? |
| Integration | Does it fit the current styling, tokens, forms, state, and test setup? |
| Cost | What are the bundle, runtime, build, and maintenance costs? |
| Control | Can the team customize behavior and visuals without fighting the abstraction? |
| Health | Are releases, issues, migration guidance, and security practices current? |
| Portability | Does it create avoidable lock-in or duplicate an installed system? |
| License | Is its license compatible with the project? |

Reject candidates that fail a hard requirement. When multiple candidates remain, present the smallest useful comparison and recommend one based on project evidence.

## Avoid common selection failures

- Do not add a second component system for one ordinary control.
- Do not replace working project conventions with a fashionable stack.
- Do not use download counts or social popularity as the primary argument.
- Do not install a package before confirming it is needed and compatible.
- Do not invent package APIs; consult current official documentation.
- Do not mix icon families casually; reuse the installed set first.
- Do not choose a chart or canvas library without checking interaction scale, accessibility, export, and performance needs.

## Greenfield projects

Choose the least complex stack that satisfies the product constraints. Establish one styling strategy, one component strategy, one icon family, a semantic token system, and a verification path. Record durable project decisions in the project’s normal guidance or architecture documentation rather than hard-coding them into this reusable skill.
