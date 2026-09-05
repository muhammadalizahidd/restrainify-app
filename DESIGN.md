# DESIGN.md

## Restrainify V1 Design System & UI/UX Rules

This document is the visual design source of truth for the Restrainify mobile application.

It defines the design language, layout rules, component behavior, iconography, spacing, typography, color usage, and UI/UX standards that every implementation must follow.

The goal is simple:

> **Restrainify must look like a professionally designed consumer product — modern, calm, minimal, trustworthy, and deliberate. It must never look like an AI-generated interface, a generic template, or a collection of disconnected cards.**

---

# 1. Design Sources of Truth

The UI must be derived from two sources:

1. **Color system:** `restrainify.com`
2. **Mobile layout direction:** the approved Restrainify dashboard reference image supplied with the project

These sources have different responsibilities.

## 1.1 Website owns the color language

The website is the authoritative source for:

- Brand primary color
- Brand secondary color
- Dark text / brand ink
- Background colors
- Surface colors
- Muted text
- Border colors
- Success color
- Warning/error color
- Button treatment
- Brand gradients, if the website intentionally uses them

### Mandatory rule

Before implementing visual styling, the coding agent MUST inspect the current website styles/design tokens and extract the exact production color values.

**Do not guess or approximate website colors from screenshots.**

If the website palette changes, the mobile application should remain aligned with the current approved brand palette unless the mobile design has an explicitly documented exception.

The app SHOULD define these values once as semantic design tokens rather than scattering hex values throughout components.

Example semantic tokens:

```text
brandPrimary
brandSecondary
brandInk
backgroundPrimary
backgroundSecondary
surfacePrimary
surfaceElevated
textPrimary
textSecondary
textMuted
borderSubtle
success
successSurface
danger
dangerSurface
warning
```

The names above describe intent. The actual values must come from the approved Restrainify website.

---

# 2. Visual Direction

Restrainify should feel:

- Calm
- Premium
- Protective
- Trustworthy
- Focused
- Modern
- Human-designed
- Clean
- Mature

It should NOT feel:

- Futuristic for the sake of looking futuristic
- Cyberpunk
- Gaming-oriented
- Overly clinical
- Childish
- Cartoonish
- AI-generated
- Template-driven
- Overdecorated
- Excessively rounded
- Full of gradients
- Full of glowing effects

The product deals with self-control and private behavioral data. The design should create confidence, not stimulation.

---

# 3. Core Design Philosophy

## 3.1 Minimal, not empty

Minimalism means removing unnecessary visual noise while keeping information clear.

Do not remove useful context merely to create whitespace.

## 3.2 Information hierarchy before decoration

The user should immediately understand:

1. Am I protected?
2. How am I doing today?
3. What is my recovery progress?
4. Is anything wrong?
5. What can I do right now?

The visual hierarchy must support these questions.

## 3.3 Status must be immediately readable

Protection state is one of the most important pieces of information in the application.

Healthy states, degraded states, and action-required states must be visually distinguishable without requiring the user to read paragraphs.

## 3.4 Calm surfaces

Most screens should use:

- Neutral backgrounds
- White or lightly differentiated surfaces
- Subtle borders
- Very restrained shadows
- Brand colors as accents

Brand color should guide attention, not flood the screen.

---

# 4. Anti-AI-Generated UI Rules

The interface must intentionally avoid common AI-generated design patterns.

Do NOT create:

- Random gradient cards
- Neon glows
- Excessive glassmorphism
- Floating decorative blobs
- Giant gradient headings
- Random pill-shaped containers everywhere
- Excessively rounded 24–40 px cards
- Decorative sparkles
- Emoji as functional icons
- Artificial 3D icons
- Generated pseudo-illustrations
- Random icon styles mixed together
- Every card using a different accent color
- Huge empty hero sections inside an app
- Unnecessary descriptive subtitles below every control
- Excessive nested cards
- Generic SaaS dashboard layouts copied directly to mobile
- Repeated “AI-style” purple/blue gradients unless they are part of the approved website brand

The UI should look like a designer deliberately chose every element.

---

# 5. Iconography

## 5.1 Icon library

Use a professional, consistent vector icon library.

### Preferred

**Phosphor Icons for React Native**

Use:

```text
phosphor-react-native
```

Recommended weights:

- `regular` for navigation and secondary controls
- `bold` or `fill` only for selected/high-emphasis states where appropriate

### Acceptable fallback

Material Symbols / Material Icons may be used where Phosphor lacks a required platform-specific symbol.

Do not casually mix multiple icon libraries on the same screen.

---

# 6. Icon Rules

Icons must:

- Be vector-based.
- Come from the approved icon library.
- Use consistent stroke weight.
- Use consistent optical size.
- Clearly represent their function.
- Match the typography and overall interface.

Do not use AI-generated icons for common interface actions.

Do not use image files for standard UI icons such as:

- Settings
- Profile
- Home
- Calendar
- Clock
- Shield
- Lock
- Globe
- Eye
- Gift
- Journal
- Analytics
- Warning
- Chevron
- Checkmark

Use the icon library.

## 6.1 Recommended semantic mapping

Suggested icons include:

| Purpose | Preferred icon concept |
|---|---|
| Home | House |
| Progress | ChartBar / ChartLine |
| Journal | Notebook |
| Tools | SquaresFour / Toolbox |
| Settings | Gear |
| Profile | UserCircle |
| Streak | Flame or TrendUp |
| Daily reward | Gift |
| Protection | ShieldCheck |
| Website protection | Globe |
| Visual protection | Eye |
| Anti-bypass | Lock |
| Screen time | Clock |
| Usage reduction | TrendDown |
| Burst | ShieldWarning / WarningCircle |
| Calendar | CalendarBlank |
| Success | CheckCircle |
| Degraded state | Warning |
| Error | XCircle |

The final icon should be chosen based on clarity rather than novelty.

---

# 7. Typography

Use a modern sans-serif typeface consistent with the website.

If the website already defines the brand font, use the same family where licensing and mobile distribution allow it.

If no approved cross-platform brand font is available, use a high-quality neutral system-compatible sans-serif.

Typography must feel clean and professional.

## 7.1 Hierarchy

Recommended hierarchy:

### Screen title
- Strong weight
- High contrast
- Used sparingly

### Section title
- Semibold
- Clear separation from content

### Metric value
- Bold or semibold
- Large enough to scan quickly

### Body
- Regular
- Comfortable line height

### Supporting / muted text
- Smaller
- Reduced contrast
- Never so faint that readability suffers

Avoid using more than three or four font weights across the app.

---

# 8. Layout Direction

The approved dashboard reference establishes the overall structure.

The final UI does not need to reproduce every pixel, but the hierarchy and grouping should remain recognizable.

The home dashboard should follow this order:

1. Header / brand area
2. Current streak + daily reward
3. Today's Overview
4. Protection Status
5. Screen Time
6. Burst emergency intervention
7. Persistent bottom navigation

---

# 9. Header

The top area should contain:

### Left
- Restrainify brand mark
- Restrainify wordmark
- Optional short brand tagline when space allows

### Right
- Profile/account action

The header should remain clean.

Avoid:

- Large hero imagery
- Decorative graphics
- Promotional banners
- Multiple top-right actions

The dashboard is an operational screen, not a landing page.

---

# 10. Current Streak & Daily Reward Card

The first major dashboard surface combines two highly relevant daily actions.

## 10.1 Current Streak

Display:

- Label: `Current Streak`
- Current day count
- Unit: `Days`
- Progress indicator where appropriate
- Short supportive text

The streak count must be visually dominant.

## 10.2 Daily Reward

Display:

- `Daily Reward`
- Gift icon
- Clear claim action
- Claimed state after successful claim

Do not over-gamify the card.

The reward system is a support mechanism, not the primary identity of the application.

---

# 11. Today's Overview

The overview section should provide compact at-a-glance metrics.

Recommended metrics:

- Protection percentage / protection state
- Total screen time
- Change versus previous day
- Urges logged

The reference layout uses a horizontal four-metric grid.

On narrower devices, the layout may adapt while preserving scanability.

Each metric should use:

1. Icon
2. Primary value
3. Short label

Avoid explanatory paragraphs inside these tiles.

---

# 12. Protection Status

Protection Status is one of the highest-priority dashboard components.

The section should clearly show the health of relevant systems, such as:

- Web Protection
- Visual Protection
- Anti-Bypass
- Other currently implemented protection capability

## 12.1 Important product truth rule

**Only show protections that actually exist in the current product requirements and implementation.**

The supplied visual reference contains an `Uninstall Blocker` item, but the engineering/product requirements do not permit the UI to falsely imply absolute uninstall prevention on a normal adult consumer Android installation.

Therefore the final UI must use terminology that truthfully represents implemented behavior.

Examples:

- `Anti-Bypass`
- `Protection Friction`
- `Protection Health`
- `Strict Mode`

Do not claim `Uninstall Blocker` or equivalent absolute protection unless the actual platform capability and approved requirements support that claim.

## 12.2 Protection state styling

Healthy:
- Success accent
- Check or active state
- Clear text such as `Active`

Degraded:
- Warning treatment
- Clear description
- User action where needed

Disabled:
- Neutral or muted state

Error:
- Danger treatment
- Clear recovery action

Never display `All systems active` if one or more required systems are degraded.

---

# 13. Real-Time Protection Banner

A compact status banner may appear within the Protection Status section.

Example hierarchy:

- Shield/check icon
- `Real-time protection is running`
- Short supporting sentence
- Chevron if the banner opens protection details

Use the success accent carefully.

The component should reassure, not visually dominate the entire dashboard.

---

# 14. Screen Time Card

The home dashboard should include a compact screen-time summary.

Display:

- Section title
- Selected timeframe
- Total screen time
- Change from comparison period
- Simple usage chart

## 14.1 Chart design

Charts must be minimal.

Use:

- Clean bars or lines
- Subtle grid lines
- Limited labels
- Brand primary color for meaningful data
- Muted colors for secondary periods

Avoid:

- 3D charts
- Gradients inside bars
- Excessive animation
- Decorative chart effects
- Too many axes
- Too many labels

Charts must prioritize comprehension.

---

# 15. Burst Intervention

Burst is an urgent intervention and should be highly visible without turning the whole interface red.

Recommended structure:

- Light danger-tinted container
- Warning/shield icon
- Heading: `Need help right now?`
- One short supporting sentence
- Strong `BURST` action

Danger/red should be reserved primarily for:

- Burst
- Critical warnings
- Destructive actions
- Protection failures

Do not use red casually for ordinary navigation or neutral information.

---

# 16. Bottom Navigation

Use persistent bottom navigation for the primary product areas.

Recommended V1 tabs:

1. Home
2. Progress
3. Journal
4. Tools
5. Settings

Each item should contain:

- Library icon
- Short text label

The active tab uses the brand primary accent.

Inactive tabs use a muted neutral color.

Do not rely on icon color alone; selected state may also use weight, indicator, or label treatment.

Avoid:

- Floating center buttons unless there is a product requirement
- Oversized navigation icons
- Animated blobs
- Glass navigation bars unless the brand system explicitly calls for them

---

# 17. Surfaces and Cards

Cards are allowed, but card usage must be intentional.

Use cards to group related information, not every individual UI element.

Recommended card characteristics:

- Neutral or white surface
- Subtle border
- Restrained radius
- Very subtle elevation when needed
- Consistent internal padding

Avoid strong drop shadows.

Avoid stacking multiple cards inside cards unless the hierarchy genuinely requires it.

---

# 18. Border Radius

Use a consistent radius scale.

Suggested conceptual scale:

```text
radiusSmall
radiusMedium
radiusLarge
radiusPill
```

Typical uses:

- Small: controls / small fields
- Medium: most cards
- Large: major dashboard surfaces
- Pill: tags, compact selectors, status chips only

Do not convert every component into a pill.

---

# 19. Spacing

Use a consistent spacing system based on a small scale.

Recommended conceptual tokens:

```text
space2
space4
space8
space12
space16
space20
space24
space32
```

Spacing must establish hierarchy.

Rules:

- Related elements stay closer together.
- Separate sections receive greater spacing.
- Card padding remains consistent.
- Screen margins remain consistent.
- Text should never visually collide with icons or borders.

Do not manually choose random spacing values per screen.

---

# 20. Buttons

## Primary button

Use for the main action on a screen.

Characteristics:

- Brand primary background
- High-contrast label
- Clear touch target
- Moderate corner radius

## Secondary button

Use for lower-priority actions.

Characteristics:

- Neutral or subtle brand surface
- Brand or primary text

## Danger button

Reserve for:

- Burst
- Destructive actions
- Critical intervention

Avoid having multiple primary buttons compete on the same screen.

---

# 21. Status Colors

Semantic colors must have consistent meaning.

## Brand Primary
Navigation, selected controls, links, important non-dangerous actions.

## Success
Healthy protection, positive progress, completed states.

## Danger
Burst, destructive operations, serious protection failures.

## Warning
Degraded state, action required, expiring or incomplete setup.

## Neutral
Inactive controls, secondary information, disabled states.

Do not change semantic meaning between screens.

---

# 22. Color Restraint

Even when the brand palette contains multiple colors:

- Most surfaces remain neutral.
- Accent colors are used purposefully.
- Text should primarily use the approved dark brand/neutral ink.
- Success green should indicate actual success.
- Danger red should indicate urgency or risk.

Do not turn every metric into a different bright color.

---

# 23. Empty States

Empty states should be useful and restrained.

Each empty state should contain:

1. Clear icon
2. Short statement
3. Optional one-line explanation
4. Action only when one is useful

Do not use giant AI-generated illustrations.

---

# 24. Loading

Prefer:

- Skeletons for structured content
- Small progress indicators for actions
- Inline status for synchronization

Avoid blocking the entire app for background operations that do not prevent local usage.

---

# 25. Error and Degraded States

Errors should explain:

- What is wrong
- What functionality is affected
- What the user can do

Example:

```text
Visual Protection needs attention
Screen access permission is disabled.

[Fix Protection]
```

Do not display cryptic technical errors to end users.

---

# 26. Motion

Animation should communicate state changes, not decorate the interface.

Appropriate uses:

- Card expansion
- Navigation transitions
- Progress change
- Reward claim confirmation
- Protection-state transitions
- Burst activation

Motion should be:

- Fast
- Subtle
- Interruptible
- Consistent

Avoid:

- Constant looping animations
- Excessive bouncing
- Particle effects
- Decorative floating objects

---

# 27. Charts and Data Visualization

Data visualization must remain product-like rather than analytics-dashboard-heavy.

Guidelines:

- Show only useful metrics.
- Default to understandable time ranges.
- Use straightforward charts.
- Include clear labels.
- Use semantic colors consistently.
- Avoid overwhelming the user with raw data.

The user should understand the trend in a few seconds.

---

# 28. Forms and Settings

Settings screens should use grouped sections rather than giant cards.

Each setting should include:

- Clear title
- Optional concise explanation
- Control aligned consistently

Use native-feeling:

- Switches
- Selectors
- Sliders only where genuinely required
- Time/date pickers
- Navigation rows

Do not invent custom controls unnecessarily.

---

# 29. Accessibility

Every screen must remain usable beyond pure visual aesthetics.

Requirements include:

- Adequate contrast
- Readable text
- Proper accessibility labels
- Sufficient touch target sizes
- Logical screen-reader order
- Color not being the only state indicator
- Support for reasonable font scaling

Icons that trigger actions must have accessible labels.

---

# 30. Responsive Mobile Layout

The supplied reference establishes hierarchy, not a single fixed pixel layout.

The implementation must adapt to:

- Small Android phones
- Typical Android phones
- Large phones
- Different font scales
- System navigation differences

Avoid absolute positioning for normal layout.

No important action should be clipped because a device is shorter or narrower than the reference image.

---

# 31. Design Tokens

The application should centralize visual values.

At minimum, maintain tokens for:

```text
colors
typography
spacing
radii
icon sizes
component heights
borders
elevation
```

Components should consume semantic tokens instead of hardcoded visual constants.

This makes the mobile app easier to keep synchronized with the website brand.

---

# 32. Component Consistency

Build reusable primitives for recurring patterns.

Examples:

- `AppScreen`
- `SectionHeader`
- `SurfaceCard`
- `MetricTile`
- `StatusItem`
- `ProtectionStatusCard`
- `PrimaryButton`
- `SecondaryButton`
- `DangerButton`
- `SettingRow`
- `EmptyState`
- `InlineAlert`
- `BottomNavigation`

Reuse should preserve visual consistency without creating overly generic abstractions.

---

# 33. Dashboard Priority Hierarchy

When space is limited, preserve this priority:

### Highest
1. Protection health
2. Burst access
3. Current recovery state

### High
4. Daily overview
5. Screen time

### Medium
6. Daily reward
7. Historical insight previews

### Low
8. Decorative information

Never sacrifice protection truth or Burst accessibility for decorative content.

---

# 34. Content Style

Microcopy should be:

- Short
- Calm
- Direct
- Respectful
- Action-oriented

Avoid:

- Robotic language
- Overly motivational clichés
- Fear-based copy
- Shame
- Long paragraphs
- Constant exclamation marks

Good:

```text
Visual Protection needs attention
Enable screen access to restore filtering.
```

Bad:

```text
Oops! It looks like your amazing AI protection system has encountered a little problem!
```

---

# 35. Design Review Checklist

Before a screen is considered complete, verify:

### Brand
- Does it use the exact approved website palette?
- Does it feel like the same Restrainify brand?

### Hierarchy
- Is the primary information obvious?
- Are important actions visually dominant?

### Consistency
- Are spacing, radius, typography, icons, and surfaces consistent?

### Authenticity
- Does the screen look professionally designed rather than AI-generated?
- Are there unnecessary gradients, cards, pills, or decorations?

### Icons
- Are icons from the approved library?
- Are icon size and stroke weights consistent?

### UX
- Are loading, error, empty, disabled, degraded, and success states handled?
- Is system status truthful?

### Accessibility
- Is contrast sufficient?
- Are controls accessible?
- Is color supplemented by text/icon state?

### Responsiveness
- Does the UI work across supported device sizes?

---

# 36. Final Design Rule

When choosing between two visual options:

> Choose the option that is simpler, clearer, more consistent with `restrainify.com`, and more likely to look intentionally designed by an experienced product designer.

Do not add visual complexity merely to make the interface look more “designed.”

The product should feel polished because of:

- Precise spacing
- Strong hierarchy
- Excellent typography
- Consistent iconography
- Restrained color
- Truthful state representation
- Thoughtful interaction design

—not because of visual effects.
