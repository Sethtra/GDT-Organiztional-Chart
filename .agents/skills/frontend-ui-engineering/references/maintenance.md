# Skill Freshness and Maintenance

This directory is the portable source of truth for the skill.

- Install it under `.agents/skills/frontend-ui-engineering` for Codex or Gemini CLI.
- Install it under `.claude/skills/frontend-ui-engineering` for Claude Code.
- When one repository supports all three agents, keep a canonical `.agents/skills` copy and optionally use a thin Claude wrapper that points to it.

## Runtime freshness

Do not embed a permanent catalog of “best” frameworks, component libraries, or versions. When a decision depends on current status:

1. Detect the versions and constraints in the repository.
2. Consult primary sources: official standards, framework documentation, package documentation, release notes, and the project’s official repository.
3. Verify compatibility and migration requirements.
4. Distinguish documented fact from inference.
5. Record the reasoning in the task result, not as an automatic dependency change.

This gives every supported agent current decision-making without rewriting the skill on every run.

## Maintenance mode

Enter maintenance mode only when the user asks to refresh the skill or a durable rule is proven stale.

1. Identify the exact stale or missing guidance.
2. Verify the replacement with primary sources.
3. Update the canonical skill or the smallest relevant reference.
4. Keep provider-specific syntax out of the canonical frontmatter.
5. Run:

```text
node <skill-directory>/scripts/validate-skill.mjs
node <skill-directory>/scripts/inspect-frontend.mjs .
node <skill-directory>/scripts/check-contrast.mjs "#111827" "#ffffff" normal
```

6. Forward-test at least:
   - a small change in an existing non-Tailwind project
   - a substantial screen in an existing component system
   - a greenfield tool-selection request
7. Review whether the skill caused unnecessary questions, dependencies, restyling, or claims it could not verify.

Do not silently self-edit during unrelated product work. Do not auto-upgrade project dependencies. Propose consequential maintenance changes clearly and preserve a reviewable diff.
