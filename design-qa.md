# Design QA

- Source visual truth: `site/design-reference.png` (selected first direction)
- Implementation screenshot: `/tmp/skeleton-site-home.png`
- Desktop viewport: 1440 × 1100, full-page capture
- Mobile evidence: `/tmp/skeleton-site-mobile.png`, 390 × 844 viewport
- Documentation evidence: `/tmp/skeleton-site-docs.png`, 1440 × 1100 viewport
- State: default landing page with current Full visualization, default documentation view, and mobile landing page
- Full-view comparison: `/tmp/skeleton-design-comparison.png`
- Focused hero comparison: `/tmp/skeleton-hero-comparison.png`

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: DM Sans and IBM Plex Mono preserve the selected direction's modern editorial hierarchy and restrained code treatment. Heading scale, wrapping, weights, and line lengths remain readable across desktop and mobile.
- Spacing and layout rhythm: the light editorial composition, wide hero workbench, section rules, three-mode row, asymmetric settings section, and centered closing action follow the selected direction. Mobile collapses cleanly without horizontal overflow.
- Colors and visual tokens: the site remains neutral off-white, graphite, and restrained orange. The retro palette appears only inside real extension captures, as required.
- Image quality and asset fidelity: all product images are fresh captures from the current extension. Full visualization correctly uses the colored capture. Browser assertions confirm every screenshot's rendered aspect ratio matches its natural ratio within 0.01; no image is stretched, squashed, or force-cropped.
- Copy and content: messaging centers the real coding workflow, persistent whole-page visualization, current modes, settings, privacy, and permissions without a before/after framing.

## Intentional Differences

- The generated concept's fabricated editor screenshot was replaced by a code-native panel containing a real excerpt from the newer portfolio's current `Hero.astro`. A private window-only VS Code capture was blocked by macOS screen-recording permissions; rendering the actual source avoids inventing or exposing content.
- The generated concept's rearranged landscape settings composition was replaced by the exact current portrait settings screenshot. This preserves product truth and the source image's native aspect ratio.
- The Full visualization thumbnail is colored rather than monochrome, per the selected-direction correction.

## Comparison History

- Initial browser pass found an unloaded off-screen settings image caused by lazy loading without intrinsic dimensions. Product screenshots were made eager, then all images loaded and passed natural-aspect-ratio checks.
- The next browser pass found a missing favicon request. The current extension icon was added to all three HTML entry points.
- A later content review found that the first captures used the older deployed portfolio while the source represented newer work. All three mode captures were regenerated from a temporary copy of `/portfolio/portfolio-clean`, the code panel was changed to the matching current `Hero.astro`, and the original portfolio repository remained untouched.
- Post-fix desktop, documentation, privacy, and mobile captures render without console errors or horizontal overflow.

## Primary Interactions Tested

- Landing, documentation, and privacy routes render through their dedicated HTML entry points.
- Header, documentation, privacy, support, license, and GitHub destinations are present with valid targets.
- Responsive layout was rendered at 390 px and verified without horizontal scrolling.
- Browser console was checked across all captured routes; no errors remain.

## Focused Evidence

The hero comparison was inspected separately because it contains the primary typography, source treatment, icon, current Full visualization, and main actions. Additional focused crops were unnecessary: all supporting screenshots remain readable in the full implementation capture and are repeated at larger size on the documentation page.

## Follow-up Polish

- P3: replace the code-native source panel with a newly captured current VS Code window only if the user later grants macOS screen-recording access or supplies a safe screenshot.

final result: passed
