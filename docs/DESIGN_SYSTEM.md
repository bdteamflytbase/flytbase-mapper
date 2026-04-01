# Akara Design System

**"Give shape to your world."**

---

## 1. Design Philosophy

Three principles:

1. **Map-first** -- the canvas owns the viewport. UI floats above terrain.
2. **Quiet confidence** -- restrained, precise, warm. Premium feels earned through restraint.
3. **One moment of delight** -- each workflow has exactly ONE wow moment. Not more.

---

## 2. Color System

### Light Theme (Primary)

```css
:root {
  /* Backgrounds */
  --ak-bg:             #F5F2EC;     /* Page background (warm cream) */
  --ak-bg-page:        #EDEBE4;     /* Secondary background */
  --ak-bg-warm:        #E3E0D6;     /* Hover / active backgrounds */
  --ak-surface:        #FDFCF8;     /* Cards, inputs, modals */
  --ak-surface-hover:  #F3F1EA;     /* Card hover state */

  /* Brand */
  --ak-primary:        #4A6741;     /* Sage green -- CTAs, active states */
  --ak-primary-hover:  #3D5736;     /* Hover */
  --ak-primary-subtle: rgba(74, 103, 65, 0.09);  /* Tinted backgrounds */
  --ak-accent:         #C4A34A;     /* Golden amber -- data highlights */

  /* Text */
  --ak-text:           #2C3227;     /* Primary -- headings, body */
  --ak-text-2:         #6B7265;     /* Secondary -- labels */
  --ak-text-3:         #A3A296;     /* Muted -- hints, timestamps */

  /* Borders */
  --ak-border:         rgba(100, 95, 75, 0.10);
  --ak-border-hover:   rgba(100, 95, 75, 0.16);
  --ak-border-active:  rgba(74, 103, 65, 0.30);

  /* Status */
  --ak-success:        #4A6741;
  --ak-warning:        #C4A34A;
  --ak-danger:         #C2634E;
}
```

### Color Rules

- **Never use pure black** (#000) or pure white (#fff) for backgrounds.
- **Primary sage green** on: CTAs, active nav, progress bars, focus rings. Nowhere else.
- **Golden amber** is reserved for: data highlights, survey data, warnings. Max 2 uses per screen.
- **Terracotta** (#C2634E) only for errors, destructive actions, log out.
- **Status colors** only appear with status meaning. Never decorative.

---

## 3. Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display / Headings | DM Serif Display | 400 | 24-48px |
| Body / UI | Plus Jakarta Sans | 300-700 | 11-16px |
| Data / Mono | JetBrains Mono | 400-500 | 9-13px |

### Rules

- Page titles: DM Serif Display, 24-26px, weight 400, letter-spacing -0.03em
- Section labels: Plus Jakarta Sans, 10-11px, weight 600-700, letter-spacing 0.04-0.1em, uppercase
- Body text: Plus Jakarta Sans, 13-14px, weight 400-500
- Data values: JetBrains Mono, 11-13px, weight 400-500
- Never use DM Serif for small text or UI controls

---

## 4. Layout Structure

### Shell

```
┌─────────────────────────────────────────────────────────┐
│ TOPBAR (48px)                                           │
│ Logo | Divider | Sidebar Toggle | ─────── | ? | ⚙ | DG │
├────────────┬────────────────────────────────────────────┤
│ SIDEBAR    │ MAIN CONTENT                              │
│ (240px)    │                                           │
│ Collapsible│ Scrollable area                           │
│            │                                           │
│ EXPLORER   │                                           │
│ ─────────  │                                           │
│ Sites      │                                           │
│ Analytics  │                                           │
│            │                                           │
│ ─────────  │                                           │
│ Help       │                                           │
└────────────┴────────────────────────────────────────────┘
```

### Topbar (48px)

- Background: `rgba(253, 252, 248, 0.82)` with `backdrop-filter: blur(16px)`
- Contains: Logo lockup, divider, sidebar toggle, spacer, help icon, settings dropdown, avatar dropdown
- No navigation links in topbar -- navigation lives in sidebar only
- Border bottom: `1px solid var(--ak-border)`

### Sidebar (240px, collapsible)

- Background: `rgba(247, 246, 240, 0.65)` with blur
- Collapses to 0px width with 200ms ease transition
- Toggle button in topbar (PanelLeftClose / PanelLeftOpen icons)
- Sections: EXPLORER header, nav items, Help & Resources footer
- No stats cards or summary blocks
- Active nav item: `var(--ak-primary-subtle)` bg, `var(--ak-primary)` text, weight 600

### Right Panel (280px, project views only)

- Same glass treatment as sidebar
- Only visible on `/projects/:id` routes
- Sections: INSPECTOR header, Layers, Tools, Properties

### Main Content

- Flex: 1, overflow-y: auto
- Padding: 36px 40px
- Transitions smoothly when sidebar collapses/expands

---

## 5. Components

### Topbar Dropdowns

All dropdowns share:
- Position: absolute, top: `calc(100% + 8px)`, right: 0
- Width: 220px
- Background: `var(--ak-surface)`
- Border: `1px solid var(--ak-border)`
- Border-radius: 12px
- Shadow: `0 8px 32px rgba(60, 55, 40, 0.12)`
- Padding: 8px
- Entry animation: 150ms fade + translateY(-4px)
- Close on outside click

#### Avatar Dropdown

Contents (top to bottom):
1. User info block: avatar (36px), name, email
2. Divider
3. Account Settings (icon: User) -- profile, email, password
4. Change Display Name (icon: Settings) -- shows current name
5. Divider
6. Log Out (icon: LogOut) -- terracotta color (#C2634E)

#### Settings Dropdown

Contents:
1. APPEARANCE section label
2. Theme selector: 3 buttons (Light/Sun, Dark/Moon, System/Monitor)
   - Active: `1.5px solid var(--ak-primary)`, primary-subtle bg
   - Inactive: `1px solid var(--ak-border)`
3. Divider
4. GENERAL section label
5. Notifications, Language options

### Site Cards

- Background: `var(--ak-surface)` with `0.85` opacity
- Border-radius: 14px
- Border: `1px solid var(--ak-border)`
- Thumbnail area: 180px height
- Hover: shadow-lg, translateY(-2px)
- Active badge: primary bg, white text, 10px font, border-radius 6px
- Arrow button: bottom-right, 30px, rounded, glass background
- Info section: 16px 20px padding, site name + project count

### Stat Cards (REMOVED)

- No stat strip on the Sites dashboard
- Summary stats live in sidebar only (if needed)

### Project Rows

- Background: `var(--ak-surface)` with `0.85` opacity
- Border-radius: 12px, padding: 14px 16px
- 48px thumbnail, title + meta, status badge
- Hover: shadow-md, translateY(-1px)
- Status badges:
  - Processing: primary-subtle bg, primary text
  - Mapped: success-bg, success text
  - New: muted bg, text-3

### Buttons

| Type | Background | Text | Border | Shadow |
|------|-----------|------|--------|--------|
| Primary | `var(--ak-primary)` | white | none | `0 1px 3px rgba(74,103,65,0.2)` |
| Secondary | `var(--ak-surface)` | text-2 | `var(--ak-border)` | none |
| Ghost | transparent | text-2 | none | none |
| Danger | transparent | `var(--ak-danger)` | none | none |

All buttons: border-radius 8px, padding 8px 16px, font-size 13px, 150ms transition.

---

## 6. Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--ak-shadow-xs` | `0 1px 2px rgba(60,55,40,0.05)` | Cards at rest |
| `--ak-shadow-sm` | `0 1px 3px rgba(60,55,40,0.06), 0 1px 2px rgba(60,55,40,0.04)` | Elevated elements |
| `--ak-shadow-md` | `0 4px 12px rgba(60,55,40,0.07)` | Hover states |
| `--ak-shadow-lg` | `0 8px 24px rgba(60,55,40,0.09)` | Dropdowns, modals |

All shadows use warm brown tints, never blue-gray.

---

## 7. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--ak-radius-sm` | 8px | Buttons, inputs, small cards |
| `--ak-radius` | 10px | Standard cards, panels |
| `--ak-radius-lg` | 14px | Site cards, modals, dropdowns |

---

## 8. Motion

- Default transition: `150ms ease`
- Sidebar collapse: `200ms ease` (width + min-width)
- Dropdown entry: `150ms ease` (opacity + translateY)
- Card hover: `200ms` (shadow + transform)
- Stagger animations: 50ms delay between siblings

### Animations

```css
@keyframes ak-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ak-scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
@keyframes ak-dropdown-in { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
```

---

## 9. Background Effects

### Gradient Wash

```css
body::after {
  background: linear-gradient(315deg,
    rgba(100, 145, 115, 0.12) 0%,
    rgba(210, 190, 150, 0.08) 50%,
    rgba(200, 160, 80, 0.05) 100%
  );
}
```

### Floating Blobs

- Bottom-left: 500px sage green blob, `rgba(74,103,65,0.06)`, blur 140px
- Top-right: 400px amber blob, `rgba(196,163,74,0.05)`, blur 140px

### Film Grain

- SVG fractalNoise texture, opacity 0.12, mix-blend-mode: multiply
- Adds subtle paper texture to the warm cream background

---

## 10. Accessibility

- All interactive elements have visible focus states
- Minimum touch target: 28px
- Color contrast: text-on-cream meets WCAG AA (4.5:1 minimum)
- `prefers-reduced-motion`: all animations reduced to 0.01ms
- Keyboard navigation supported on all dropdowns (close on Escape)

---

## 11. Logo

The Akara mark is a terrain cross-section forming the letter A:
- Ridge lines represent geological strata (4 layers, sage green gradient)
- Dashed crossbar is a survey reference line (golden amber)
- Summit marker is a geodetic control point (sage green circle)

### Lockup

Logo mark (30px) + "Akara" (15px, weight 700) + "by FlytBase" (9px, text-3)

### Avatar

28px rounded square, gradient: `linear-gradient(135deg, #4A6741, #C4A34A)`, white initials.

---

## 12. File Structure

```
apps/web/src/
  index.css              — CSS tokens, global styles, animations
  components/
    layout/
      Layout.tsx          — App shell (topbar + sidebar + content + inspector)
  pages/
    HomePage.tsx          — Landing/splash (separate from app)
    DashboardPage.tsx     — Sites grid
    SitePage.tsx          — Project list within a site
    ProjectPage.tsx       — Map viewer + processing
```

---

*Akara Design System v1.1 -- April 2026*
*Earthy/Sage Light Theme*
