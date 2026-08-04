---
version: 1
slug: "src-pages-landingtestpage-tsx"
primary_target: "src/pages/LandingTestPage.tsx"
related_targets: ["src/pages/LandingTestPage.css","index.html"]
---

# Test landing surface brief

- Scope: isolated `/test-landing` preview; Persuade mode. Do not restyle or reroute the live landing page.
- Audience and job: public visitors, chart owners, and HR administrators should recognize the official GDT product, understand how people, structure, and jobs connect, then enter the correct role-aware destination.
- Proof and content: official theme-aware GDT wordmarks, the existing GDT headquarters photograph, the real Department → Office → Position model, the live Staff Directory / Organization / Job Architecture modules, and privacy enforced by database permissions. Do not expose personnel or invent counts.
- Direction: approved composition A, “Civic structure ribbon,” at `.impeccable/mocks/test-landing-structure-ribbon-a.png`. Keep the photo-led 5/7 split, content at left, and one uninterrupted green module band crossing the page. User adjustment: make the wordmark quieter than the comp (about 210–220px wide on desktop, smaller on mobile).
- Memorable moment: the green band turns three product areas into one connected path immediately beneath the institution and its purpose.
- Responsive behavior: hero stacks content before image; the ribbon becomes a vertical indexed sequence; mobile navigation is a focus-managed sheet; account disclosure closes on Escape/outside interaction and restores focus.
- Theme behavior: this isolated preview supports light and dark presentation without changing the live app. Light surfaces use `GDT-Logo (Light).png`; dark surfaces use `GDT-Logo (Dark).png`.

## Implementation inventory

| Visible ingredient | Medium | Commitment |
| --- | --- | --- |
| Compact official wordmark | Existing PNG assets | Correct light/dark file; intentionally smaller than comp |
| Hero headquarters image | Existing `building-city.png` | Wide architectural crop; no badges or invented overlays |
| Khmer-first headline and actions | Semantic HTML/CSS | Manrope + Noto Sans Khmer; primary action remains visible |
| Three-part structure ribbon | Semantic links, CSS grid, Lucide icons | One continuous band and brass indexed connector; never card tiles |
| Department → Office → Position proof | Semantic ordered flow | Text and arrows carry meaning without color alone |
| Account/profile disclosure | React + semantic buttons/links | Identity, My charts, profile, theme, HR portal when authorized, logout/error state |
| Mobile navigation | Existing Radix/shadcn dialog primitive | Focus trap, Escape/overlay close, scroll-safe sheet |
| Motion | CSS transforms/transitions | One ribbon-marker/arrow language; reduced-motion fallback |

- Unresolved decisions: none for this preview. Production adoption remains a separate user decision.
