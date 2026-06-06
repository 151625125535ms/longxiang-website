# Codex Agent Configuration — Longxiang Website

## Project Overview

This is the official international website for Henan Longxiang Electrical Co., Ltd. (河南龙翔电气股份有限公司), a transformer and power equipment manufacturer.

- **Tech Stack**: Node.js/Express backend, vanilla HTML/CSS/JS frontend, JSON file storage
- **Frontend Files**: `js/*.js`, `css/styles.css`, `*.html`, `ar/*.html` (Arabic)
- **Backend Files**: `server/**/*.js`, `data/*.json`
- **Admin Panel**: `admin/` directory (separate SPA)
- **Branch Strategy**: `main` (frontend), `feature/admin-backend` (admin + backend)

## Frontend Design Guidelines

### Design Thinking (from frontend-design skill)

Before coding, understand context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, editorial/magazine, brutalist/raw, art deco/geometric, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility)
- **Differentiation**: What makes this UNFORGETTABLE?

### Typography
- Choose fonts that are beautiful, unique, and interesting
- Avoid generic fonts (Arial, Inter, Roboto, system fonts)
- Pair a distinctive display font with a refined body font

### Color & Theme
- Commit to a cohesive aesthetic with CSS variables for consistency
- Dominant colors with sharp accents outperform timid palettes
- Avoid cliched schemes (purple gradients on white)

### Motion & Animation
- Use CSS-only animations for HTML pages
- Focus on high-impact moments: staggered reveals with `animation-delay`
- Scroll-triggering and hover states that surprise
- Duration: 150-300ms for micro-interactions

### Spatial Composition
- Unexpected layouts, asymmetry, overlap, diagonal flow
- Grid-breaking elements, generous negative space OR controlled density

### Backgrounds & Visual Details
- Create atmosphere and depth, avoid defaulting to solid colors
- Use gradient meshes, noise textures, geometric patterns, layered transparencies

## UI/UX Pro Max Guidelines (from ui-ux-pro-max skill)

### Priority Rules

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation | MEDIUM |

### Accessibility (CRITICAL)
- Minimum 4.5:1 color contrast ratio for normal text
- Visible focus rings on interactive elements
- Descriptive alt text for meaningful images
- `aria-label` for icon-only buttons
- Tab order matches visual order
- Form labels with `for` attribute

### Touch & Interaction (CRITICAL)
- Minimum 44x44px touch targets
- Disable buttons during async operations
- Clear error messages near the problem
- `cursor-pointer` on clickable elements

### Performance (HIGH)
- Use WebP, srcset, lazy loading for images
- Check `prefers-reduced-motion`
- Reserve space for async content

### Layout & Responsive (HIGH)
- `viewport` meta tag: `width=device-width, initial-scale=1`
- Minimum 16px body text on mobile
- No horizontal scroll on mobile
- Define z-index scale (10, 20, 30, 50)

### Common Rules for Professional UI

| Rule | Do | Don't |
|------|----|----|
| Icons | Use SVG icons (Heroicons, Lucide) | Use emojis as UI icons |
| Hover | Use color/opacity transitions | Use scale transforms that shift layout |
| Cursor | Add `cursor-pointer` to clickable elements | Leave default cursor on interactive elements |
| Transitions | Use `transition-colors duration-200` | Instant changes or too slow (>500ms) |
| Light mode text | Use dark text (#0F172A) | Use light text (#94A3B8) for body |
| Borders | Use `border-gray-200` in light mode | Use `border-white/10` (invisible) |

### Pre-Delivery Checklist

- [ ] No emojis used as icons
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] `prefers-reduced-motion` respected

## Design System Search Tool

Use the Python CLI tool for design recommendations:

```bash
# Generate complete design system
python .claude/skills/ui-ux-pro-max/scripts/search.py "transformer manufacturer industrial" --design-system -p "Longxiang"

# Search specific domains
python .claude/skills/ui-ux-pro-max/scripts/search.py "industrial professional" --domain style
python .claude/skills/ui-ux-pro-max/scripts/search.py "elegant professional" --domain typography
python .claude/skills/ui-ux-pro-max/scripts/search.py "industrial saas" --domain color

# Stack guidelines
python .claude/skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind
```
