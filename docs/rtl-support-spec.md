# Full Hebrew (RTL) Support Specification

Goal: Provide a technical, clear, and enforceable specification for
building full RTL/Hebrew support in a web application.

------------------------------------------------------------------------

## Core Requirements

-   Apply page direction (`dir="rtl"`) when Hebrew is active.
-   Use CSS logical properties instead of left/right.
-   Icons appear before the text visually (left side in RTL).
-   All text aligned to the right by default.
-   Full i18n string architecture (plural rules, interpolation,
    fallback).
-   Visual, functional, and accessibility testing for RTL.

------------------------------------------------------------------------

## UI/UX Requirements

### 1. Direction & Layout Context

-   Set `<html lang="he" dir="rtl">` when Hebrew is selected.
-   Avoid mixing RTL/LTR at component level unless required.

### 2. CSS Logical Properties

Use: - `margin-inline-start`, `margin-inline-end` -
`padding-inline-start`, `padding-inline-end` - `text-align: start;` -
`float: inline-start` / `inline-end`

Example:

``` css
.btn { padding-inline: 12px 18px; text-align: center; }
.label { margin-inline-end: 8px; }
```

### 3. Icons + Text

-   Icon should appear before text visually in RTL (DOM order stays
    consistent).
-   Use flex with `gap` when needed.
-   Directional icons (arrows) must flip in RTL using
    `transform: scaleX(-1)` or separate assets.

### 4. Complex Components

-   Sidebars open from the right.
-   Breadcrumbs aligned to the right; separators flipped appropriately.
-   Menus, dialogs, and dropdowns must anchor correctly in RTL.

### 5. Mixed Content (LTR inside RTL)

-   Email/phone/URLs should be wrapped with `<span dir="ltr">`.
-   Use Unicode BiDi controls only when unavoidable.

------------------------------------------------------------------------

## i18n Architecture

-   All textual content must be stored in translation files
    (`.json`/`.yaml`).
-   No hard‑coded strings in code.
-   Use CLDR plural rules via `i18next`, `react-intl`, or similar.
-   Ensure placeholders, validation messages, button labels, and
    alt-texts are included.

------------------------------------------------------------------------

## Forms & Inputs

-   Default `dir="rtl"` for text inputs.
-   Specific fields (email, number, password) must force `dir="ltr"`.
-   Error messages aligned to the right with consistent icon placement.

------------------------------------------------------------------------

## Images & SVG

-   Any directional asset must have an RTL variant.
-   SVG arrows should invert via `scaleX(-1)`.

------------------------------------------------------------------------

## Accessibility (A11Y)

-   Set `<html lang="he">`.
-   Screen reader order must follow DOM; ensure logical navigation.
-   Validate with axe-core, NVDA, and VoiceOver (Hebrew).

------------------------------------------------------------------------

## Testing Requirements

### 1. Unit & Snapshot Tests

-   Include snapshots for RTL rendering.
-   Test mixed strings (hebrew + english).

### 2. E2E Tests

-   Run two modes: LTR and RTL.
-   Validate:
    -   navigation
    -   forms
    -   dialogs
    -   menus
    -   layout integrity

### 3. Visual Regression Tests

-   Compare RTL screenshots vs. baseline using tools like
    Percy/Chromatic.

### 4. Accessibility Tests

-   Ensure zero critical A11Y violations in RTL.

------------------------------------------------------------------------

## Cursor Workflow Guidelines

-   RTL/i18n changes must be reviewed via Git with small, isolated
    commits.
-   CI enforces:
    -   lint rule blocking hard-coded strings
    -   RTL snapshots
    -   RTL visual tests
    -   accessibility scan

PR Template Questions: - "Did you validate RTL rendering?" - "Did you
update translations?" - "Were directional icons tested in RTL?"

------------------------------------------------------------------------

## React Example (Dynamic Direction)

``` jsx
function App({ lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  return <RootComponent />;
}
```

## CSS Example (Logical Properties)

``` css
.header { padding-inline: 20px; text-align: start; }
.icon { display: inline-flex; align-items: center; gap: 8px; }
```

------------------------------------------------------------------------

## Common Pitfalls

-   Using `left/right` instead of logical properties.
-   Third‑party UI components that don't support RTL.
-   Assets not mirrored.
-   Snapshots missing RTL variants.

------------------------------------------------------------------------

## Quick PR Checklist

-   [ ] `lang` and `dir` set properly
-   [ ] No hard‑coded strings
-   [ ] RTL snapshots updated
-   [ ] Visual tests passed
-   [ ] A11Y tests passed
-   [ ] Icons/assets verified for RTL
