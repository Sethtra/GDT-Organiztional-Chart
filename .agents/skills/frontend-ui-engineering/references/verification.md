# Frontend Verification

Select checks proportionally to the risk and available tools.

## Functional

- Exercise the changed user flow and applicable states.
- Verify event handling, navigation, persistence, validation, recovery, and destructive-action safeguards.
- Check long content, missing content, slow responses, and failure responses when relevant.

## Responsive and visual

- Inspect narrow mobile, intermediate, and wide desktop layouts.
- Check overflow, wrapping, clipping, sticky/fixed elements, zoom, and orientation.
- Compare before and after when preserving an existing design.
- Check light/dark themes and reduced motion when supported.

## Accessibility

- Navigate the changed surface using only the keyboard.
- Confirm visible focus and logical focus order.
- Verify semantic elements, names, labels, descriptions, errors, headings, landmarks, and live announcements.
- Check text and non-text contrast.
- Inspect the accessibility tree or run the project’s accessibility tooling when available.
- Avoid claiming complete accessibility from automated checks alone.

## Engineering

- Run the narrowest relevant tests, then broader checks when risk warrants.
- Run build, type checking, linting, and formatting commands defined by the project.
- Check browser console errors and failed network requests.
- Review performance for large lists, images, animation, charts, canvas, or expensive rerenders.
- Inspect the diff for unrelated formatting, duplicated components, hard-coded tokens, and unnecessary dependencies.

## Completion report

State:

1. what changed
2. which checks passed
3. what could not be run or observed
4. remaining risks or decisions
