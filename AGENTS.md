# Project working preferences

- The user performs manual testing. Do not run browser automation, DOM inspection, screenshots, tests, lint, type checks, builds, or other verification unless the user explicitly requests it. Read source as needed to implement changes and report that changes are ready for manual testing.
- Make every interface change responsive across mobile phones, laptops, and desktop screens. Account for narrow widths, touch interaction, text wrapping, and scrolling.
- Support both light and dark themes and the global admin-selected font in all updated screens. Preserve icon and source-code fonts where appropriate.
- The user explicitly confirmed `#2cecf7` as the exact brand color. Use it for brand headings, highlights, primary buttons, selected states, icons, and glows in both themes; do not substitute darker teal or royal blue. Use near-black text on cyan buttons, dark body text on light surfaces, and near-black/navy surfaces in dark mode. System and DevKitty colors share the `--devengine-*` variables in `styles/globals.css`.
