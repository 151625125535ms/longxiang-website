# Frontend UI/UX System Audit Spec

Date: 2026-06-14
Owner: Codex
Review role: Claude only reviews; Claude does not implement, edit files, run commands, or deploy.
Review status: Claude review incorporated on 2026-06-14. This file is now the source of truth for implementation phases.

## Task Summary

Perform a system-level front-end UI/UX audit for the Longxiang website and produce an actionable beautification plan. Scope covers visual consistency, typography, spacing, image presentation, information architecture, interaction logic, responsive behavior, and English/Arabic page parity.

This is a large task because it affects the whole public website experience and requires design-system decisions before implementation.

## Audit Inputs

Skills used:
- `frontend-design`: production-grade visual direction and non-generic front-end quality review.
- `ui-ux-pro-max`: accessibility, responsive, typography, interaction, performance, and design-system review.

UI-UX design-system baseline generated for:
`B2B electrical equipment export website industrial professional responsive`

Recommended baseline:
- Pattern: Feature-rich showcase plus trust.
- Style: Trust & Authority.
- Palette direction: professional navy / slate / blue CTA / light industrial background.
- Typography direction: clean B2B sans-serif with strong hierarchy.
- Avoid: playful style, hidden credentials, AI-purple gradients, decorative effects that weaken industrial credibility.

Screenshots captured locally:
- `D:\tmp\lx-audit-index-desktop.png`
- `D:\tmp\lx-audit-index-mobile.png`
- `D:\tmp\lx-audit-products-desktop.png`
- `D:\tmp\lx-audit-products-mobile.png`
- `D:\tmp\lx-audit-product-detail-desktop.png`
- `D:\tmp\lx-audit-product-detail-mobile.png`
- `D:\tmp\lx-audit-contact-desktop.png`
- `D:\tmp\lx-audit-contact-mobile.png`
- `D:\tmp\lx-audit-ar-index-mobile.png`
- `D:\tmp\lx-audit-ar-product-detail-mobile.png`
- `D:\tmp\lx-audit-solutions-desktop.png`
- `D:\tmp\lx-audit-education-mobile.png`

## Current Design Strengths

1. The site already has an appropriate industrial base palette: navy, steel, blue, gold, red, and neutral backgrounds.
2. Navigation, product listing, product detail, inquiry form, footer quote form, language switch, and cookie controls are already functional.
3. Product image sync and front-end static path handling have recently been hardened.
4. English and Arabic versions share a common structure, reducing the risk of one-off page drift.
5. Product detail title typography has already been improved and deployed through commit `39fb334`.

## Claude Review Incorporation Notes

Claude reviewed this audit based on 12 screenshots and the `ui-ux-pro-max` design-system analysis. The conclusion was that the priority order is correct and the implementation direction is compatible with the existing codebase, but several missing constraints and phase-specific risks must be incorporated before implementation.

The following corrections are now binding for implementation:

1. Phase 1 must add `html.js-enabled` from a synchronous inline script in each front-end document head.
2. Phase 1 must add `prefers-reduced-motion` handling for both CSS motion and the JavaScript stat counter animation.
3. Phase 1 must solve the floating inquiry / cookie banner z-index conflict, not defer it to Phase 2.
4. Phase 1 must test the cookie custom-settings modal separately from the banner/bottom-sheet behavior.
5. Phase 1 should remove the three old one-off fade-in visibility patches after the global `js-enabled` strategy is in place.
6. Phase 2 may replace component/UI-level viewport font scaling, but should keep hero-level viewport scaling where it is intentional.
7. Phase 3 is higher-risk because homepage content is partly asynchronous; stat counters and scroll animations must still bind after section changes.
8. Phase 4 product image `object-fit: contain` on white backgrounds requires user confirmation because some product images are factory/photo backgrounds rather than isolated cutouts.
9. Phase 4 must not move or remove `normalizeImagePath()` calls or static fallback markers such as `data-products-source="static-fallback"`.
10. Phase 1 validation must include Arabic pages, not only English pages.
11. Phase 2 should consider Arabic above-fold font preload because `Noto Kufi Arabic` fallback to Tahoma can cause visible layout shift.
12. Desktop cookie banner behavior is also a Phase 1 problem because it can cover the product detail inquiry form.
13. Contact-page mobile quote entry and desktop blank space are Phase 5 issues.
14. Products mobile category filtering is a Phase 4 issue.

## High Priority Findings

### P0. Homepage Below-Fold Content Can Appear Blank in Full-Page Capture / Non-Animated States

Evidence:
- Full-page homepage screenshots show large empty bands after the featured product grid before footer.
- CSS uses `.fade-in { opacity: 0; transform: translateY(40px); }` and relies on `IntersectionObserver` to add `.visible`.
- Some dynamic sections are protected with forced visibility, but not all homepage sections are.

Risk:
- Users with reduced motion, delayed JS, screenshot tools, SEO renderers, or edge-case observer timing may see invisible content.
- The page looks unfinished when the observer does not trigger before capture.

Implementation recommendation:
- Add a global no-JS/failsafe strategy:
  - Add `html.js-enabled .fade-in { opacity: 0; transform: translateY(24px); }`
  - Default `.fade-in` should be visible.
  - `js-enabled` must be added by synchronous inline script in each front-end page head:
    `<script>document.documentElement.classList.add('js-enabled');</script>`
  - The inline script must run before deferred front-end scripts and early enough to avoid content visible -> hidden -> visible flicker.
- Add `@media (prefers-reduced-motion: reduce)` forcing all fade/slide elements visible and disabling transform transitions.
- Add JavaScript `prefers-reduced-motion` handling in `initStatCounters()` so stat numbers render their final values immediately.
- After the global `js-enabled` strategy is working, remove the old one-off visibility patches:
  - `.products-showcase-redesign .product-card-v2.fade-in`
  - `#education-content .fade-in`, `#education-content .fade-in-left`, `#education-content .fade-in-right`, `#education-content .fade-in-scale`
  - `[dir="rtl"] .products-catalog-grid .product-card-v2.fade-in`

Acceptance:
- Full-page screenshot of `index.html` at 1440 and 390 widths must show trust, why-choose, stats, CTA, and footer content without blank bands.
- With `prefers-reduced-motion: reduce`, no content remains hidden.
- With `prefers-reduced-motion: reduce`, stat counters display final numbers without animated counting.
- Arabic `ar/index.html` and `ar/product-detail.html` mobile screenshots must show visible content without animation-related blank bands.

### P0. Cookie Consent Banner Blocks Mobile Product Browsing

Evidence:
- Mobile homepage, products page, and product detail screenshots show the cookie banner sitting over key content.
- On product detail mobile it covers the product image area; on products mobile it covers filters and first rows.

Risk:
- First-time visitors cannot inspect products comfortably before choosing cookie options.
- The banner competes with quote/product CTAs.

Implementation recommendation:
- Mobile layout should become a bottom sheet with safe-area padding:
  - `bottom: 0; left: 0; right: 0; border-radius: 12px 12px 0 0;`
  - max-height around `42dvh`; include `42vh` fallback for older iOS:
    `max-height: 42vh; max-height: 42dvh;`
  - include safe-area padding: `padding-bottom: env(safe-area-inset-bottom)`.
  - content scrolls inside only if necessary.
  - primary/secondary actions in a stable 2-column grid, customize full-width secondary row.
- Add `padding-bottom` to fixed quote button or temporarily raise quote button while banner is visible.
- Keep desktop banner as compact bottom bar.
- Desktop banner is also in Phase 1 scope: it must stay as a compact bottom bar and must not cover the product detail inquiry form.
- Define Phase 1 z-index order explicitly:
  - cookie banner below modal and below floating inquiry where needed.
  - cookie custom-settings modal above both banner and floating inquiry.
  - floating inquiry remains clickable while banner is visible, unless intentionally hidden in a tested mobile state.

Acceptance:
- At 390px width, product image, first product cards, and primary page heading remain visible above the banner.
- Cookie action buttons remain at least 44px tall.
- Desktop 1440px product detail screenshot must show the inquiry form usable while the cookie banner is visible.
- Clicking Customize must open the cookie modal above the bottom banner and floating inquiry button.
- Arabic mobile cookie banner/bottom sheet must preserve RTL layout and button readability.

### P1. Homepage Visual Story Is Not Complete Enough for a B2B Export Site

Evidence:
- Hero is strong but after product cards the page loses narrative density.
- Trust/capability sections are present in HTML, but the current captured experience makes them visually unreliable.
- Product cards dominate the page before stronger proof, certifications, factory capability, and export support are established.

Implementation recommendation:
- Rebuild homepage sequence into a tighter B2B trust funnel:
  1. Hero: product categories plus quote CTA.
  2. Proof strip: founded year, NEEQ, factory, patents, export support.
  3. Product families: Transformer / EV Charger / Switchgear as compact category cards.
  4. Featured products: 6 to 8 cards, uniform image stage.
  5. Manufacturing and testing capability: factory image + quality checkpoints.
  6. Project selection support: country, voltage, capacity, application, quote inputs.
  7. Certifications / reports teaser.
  8. Final quote CTA.
- Avoid large empty bands. Section vertical rhythm should use desktop `72-96px` and mobile `48-64px`.

Acceptance:
- Desktop homepage has no section larger than 160px vertical blank space unless intentionally used as a hero breathing area.
- Mobile homepage shows proof/capability before the footer.

### P1. Typography System Is Inconsistent and Sometimes Too Aggressive

Evidence:
- CSS has many independent `clamp(...vw...)` rules and multiple page-specific heading scales.
- Current design instructions prohibit font-size scaling directly with viewport width for fixed UI elements; some rules still use `vw`.
- Mobile product cards use very small labels around `0.58rem-0.68rem` in narrow cases.

Implementation recommendation:
- Define a fixed breakpoint type scale:
  - Desktop: display 48, h1 40, h2 32, h3 24, title 20, body 16, small 14, label 12.
  - Tablet: display 40, h1 34, h2 28, h3 22, title 19, body 16.
  - Mobile: display 30, h1 28, h2 24, h3 20, title 17, body 16, small 14.
- Use rem values per breakpoint, not viewport-driven continuous scaling for component titles and cards.
- Keep `letter-spacing: 0` for body and normal headings; reserve uppercase tracking only for short labels.
- Product card names should not go below `0.82rem` on mobile; use line clamp plus tooltip/expanded detail if necessary.

Acceptance:
- No primary body text below 16px on mobile.
- Product card titles are readable without zooming at 390px and 360px.
- Arabic headings use slightly more line-height than English.

### P1. Product Cards Need Stronger Image and Content Rhythm

Evidence:
- Product grid mixes different image proportions and visual weights.
- Some product names are long and wrap tightly.
- Buttons repeat heavily across cards, creating visual noise.
- On mobile products pages, the desktop category sidebar disappears and users have limited category filtering affordance.

Implementation recommendation:
- Standardize product card structure:
  - Image stage with fixed aspect ratio `4 / 3` or `1.15 / 1`, white background, `object-fit: contain`.
  - Product title min-height for 2-3 lines.
  - Short description max 2 lines desktop, hidden or 1 line mobile.
  - One primary action visible; secondary quote action can be icon/button row or moved to hover/quick action on desktop.
- On mobile product list, use 2-column compact cards only when title remains readable. If title density fails, switch to one-column list-card for product directory pages.
- Add a mobile category filter affordance, such as a horizontal chip bar or top select/dropdown, so users can filter by product family on 390px screens.
- Keep `normalizeImagePath()` calls and `data-products-source="static-fallback"` markers intact when changing product-list or product-detail DOM.
- Product image `object-fit: contain` with white background requires user confirmation before implementation because some current assets are factory/background photos rather than isolated product cutouts.
- Products with no cover image must still reserve the same image-stage aspect ratio, using a neutral placeholder, so row heights remain consistent.

Acceptance:
- Product grid cards have equal heights within each row.
- No product image touches card edges.
- No button text wraps or overflows.
- Mobile 390px products page can filter by category without relying on the hidden desktop sidebar.
- Static fallback and normalized image path behavior remain unchanged.

### P1. Forms Are Functional but Too Long and Flat on Mobile

Evidence:
- Product detail mobile inquiry form is long and appears as a single unsegmented stack.
- Contact/footer quote form repeats similar fields without visible progress or helper hierarchy.
- Contact mobile currently lacks an early quote/message entry in the first two screens.
- Contact desktop has a large blank gap between the HQ information area and Buyer FAQ.

Implementation recommendation:
- Segment inquiry forms:
  - Contact info: name, email, company, phone.
  - Project requirements: product type, quantity, voltage/capacity.
  - Message: textarea and submit.
- Use fieldset-like visual grouping or section captions.
- Keep mobile input height at least 44px.
- Add inline error placement and first-invalid-field focus.
- For product detail, keep inquiry form sticky on desktop but non-sticky and collapsed after product specs on mobile, with a visible "Request quote for this product" anchor.

Acceptance:
- Mobile form is scannable in three groups.
- Submit button remains reachable without excessive cognitive load.
- Contact mobile at 390px shows a clear message/quote entry within the first two screens.
- Contact desktop removes the large blank band between contact information and FAQ.

### P1. RTL Pages Need Dedicated Spacing and Footer Cleanup

Evidence:
- Arabic product detail mobile is readable, but form/footer density differs from English.
- Footer links and quote form create a tall, uneven ending.

Implementation recommendation:
- Add RTL-specific footer spacing and column ordering rules.
- Ensure Arabic line-height:
  - body: `1.75`
  - headings: `1.35-1.5`
  - form labels: `1.45`
- Keep Arabic product titles max width narrower than English for better line breaks.
- Verify all directional icons, breadcrumbs, and nav chevrons mirror correctly.

Acceptance:
- Arabic mobile footer has consistent spacing and no squeezed columns.
- Arabic product detail form labels do not collide with inputs.

## Medium Priority Findings

### P2. Hero System Is Too Fragmented

Implementation recommendation:
- Standardize hero variants:
  - Homepage hero.
  - Page hero.
  - Product detail/list hero.
  - Education hero.
- Keep a shared token set for overlay strength, hero height, breadcrumb spacing, and heading scale.
- Use real product/factory imagery, not decorative gradients.

### P2. Color Roles Need Semantic Tokens

Implementation recommendation:
- Keep current brand colors but map them to semantic roles:
  - `--color-surface`
  - `--color-surface-muted`
  - `--color-text-primary`
  - `--color-text-secondary`
  - `--color-action-primary`
  - `--color-action-danger`
  - `--color-border-subtle`
- Reduce red/blue/gold competition. Use one primary CTA color per screen.

### P2. Motion Needs Reduced-Motion and Failsafe Rules

Implementation recommendation:
- Add global reduced-motion block for animations, transforms, parallax, hero zoom, counters.
- Keep motion durations `150-300ms` for interactions and `400-700ms` only for one-time entrance effects.
- Avoid hiding content until animation has run for critical sections.
- CSS reduced-motion alone is insufficient for JavaScript-driven counters; `initStatCounters()` must also detect reduced motion and write final values directly.

### P2. Navigation and Floating CTA Need Layering Rules

Implementation recommendation:
- Define z-index scale:
  - base 0
  - sticky nav 1000
  - cookie banner 1100
  - floating quote 1130
  - cookie modal 1140 or higher
- Ensure quote button and cookie banner do not overlap on mobile.
- Mobile menu should trap focus while open and close on Escape.

### P2. Image Resource Presentation Needs Quality Rules

Implementation recommendation:
- Hero images: use full-width real factory/product imagery with stable crop positions per page.
- Product images: preserve product cutouts with `object-fit: contain`, consistent padding, and a neutral stage.
- Add explicit width/height or aspect-ratio for all dynamic images to avoid layout shift.
- Prefer extracted product catalog images over screenshots.

## Suggested Implementation Phases

### Phase 1: Reliability and Blocking UX

Files likely involved:
- `css/styles.css`
- `js/main.js`
- all public HTML entry files under root and `ar/` for the inline `js-enabled` marker.

Work:
1. Add `<script>document.documentElement.classList.add('js-enabled');</script>` in each public page head before deferred scripts.
2. Add animation visibility fallback: content visible by default, `js-enabled` enables fade/slide initial states.
3. Add CSS `prefers-reduced-motion` support and JS reduced-motion support in `initStatCounters()`.
4. Redesign cookie banner:
   - desktop: compact bottom bar, not a large overlay covering inquiry forms.
   - mobile: bottom sheet with `42vh` fallback, `42dvh`, safe-area padding, scrollable content if needed.
5. Fix floating quote and cookie layering in Phase 1.
6. Test the cookie custom-settings modal separately and ensure it appears above banner and floating inquiry.
7. Remove old one-off forced-visible fade patches after the global strategy is in place.

Validation:
- Full-page screenshots for `index.html`, `products.html`, `product-detail.html`.
- Reduced motion browser emulation.
- Mobile 390px and 360px checks.
- Arabic mobile screenshots for `ar/index.html` and `ar/product-detail.html`.
- Desktop 1440px product detail screenshot with cookie banner visible and inquiry form usable.
- Cookie Customize modal opens above banner and floating inquiry.
- Stat counters show final numbers when reduced motion is enabled.

### Phase 2: Typography and Layout Tokens

Files likely involved:
- `css/styles.css`

Work:
1. Add fixed breakpoint type scale tokens.
2. Replace component/UI-level viewport-driven font sizing where it affects UI stability.
3. Normalize section spacing tokens.
4. Add RTL line-height and title-width adjustments.
5. Keep intentional hero-level viewport scaling unless a page-specific screenshot proves it causes layout problems.
6. Evaluate Arabic above-fold font preload for `Noto Kufi Arabic` to reduce FOUT/layout shift.

Validation:
- English and Arabic screenshots: index, products, product detail, contact.
- Check no button/card text overflow.
- Screenshot all major English and Arabic pages if global tokens such as `--type-h2` are changed.

### Phase 3: Homepage Trust Funnel

Files likely involved:
- `index.html`
- `ar/index.html`
- `css/styles.css`
- `js/main.js` if dynamic content needs section visibility handling.

Work:
1. Reorder/refine homepage sections into a stronger B2B export buyer funnel.
2. Make proof, manufacturing capability, and quote path visible.
3. Remove large blank rhythm and inconsistent empty bands.
4. Preserve async homepage product loading behavior and ensure new sections are still covered by `initScrollAnimations()`.

Validation:
- Desktop 1440, tablet 768, mobile 390 screenshots.
- No blank sections in full-page capture.
- Scrolling to the stats area still triggers counter behavior in normal-motion mode.
- Product cards still render after `fetchJson()` and static fallback markers still work.

### Phase 4: Product Cards and Product Detail Polish

Files likely involved:
- `css/styles.css`
- `js/main.js`
- `js/products-list.js`
- `js/product-detail.js`

Work:
1. Standardize product image stage and card heights.
2. Refine product actions and button density.
3. Segment inquiry forms.
4. Improve mobile product detail order and anchor flow.
5. Add mobile product category filtering through horizontal chips or a top select/dropdown.
6. Before applying `object-fit: contain` plus white backgrounds globally, ask the user to confirm treatment for factory/photo-style product images.
7. Preserve `normalizeImagePath()` and static product fallback markers.

Validation:
- Product list and product detail screenshots in English and Arabic.
- Long-title stress test with transformer names.
- Mobile 390px products page supports category filtering.
- Products without cover images still reserve the same image stage size.

### Phase 5: Contact, Footer, and RTL Refinement

Files likely involved:
- `css/styles.css`
- `contact.html`
- `ar/contact.html`
- footer rendering in `js/main.js`.

Work:
1. Improve footer density and quote form hierarchy.
2. Align contact page map/form/info cards.
3. Add RTL footer and form spacing adjustments.
4. Add a Contact mobile quote/message entry within the first two screens, or move/collapse the form closer to the top.
5. Remove the Contact desktop blank band between the HQ information area and Buyer FAQ.

Validation:
- Contact desktop/mobile.
- Arabic footer mobile.
- Contact mobile 390px first two screens include a visible quote/message action.
- Contact desktop no longer has the large blank gap before FAQ.

## Explicit Non-Goals Unless Approved

- Do not change database schema.
- Do not change public API response shape.
- Do not remove education content or CMS invariants.
- Do not deploy until user confirms the reviewed implementation plan.
- Do not ask Claude to implement. Claude only reviews this audit and proposed phases.

## Claude Review Request

Please review this audit only. Check:
1. Whether the priority order is correct.
2. Whether any high-risk UI/UX issue is missing.
3. Whether the implementation phases are scoped safely.
4. Whether English/Arabic coverage is sufficient.
5. Whether any proposed CSS/JS approach may conflict with existing site behavior.
