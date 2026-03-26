# Toggo Design System

> A comprehensive design system for building consistent, accessible, and beautiful user experiences in the Toggo travel planning app.

---

## Table of Contents

- [Philosophy](#philosophy)
- [Design Principles](#design-principles)
- [Getting Started](#getting-started)
- [Design Tokens](#design-tokens)
  - [Colors](#colors)
  - [Typography](#typography)
  - [Spacing](#spacing)
  - [Layout](#layout)
  - [Corner Radius](#corner-radius)
  - [Elevation](#elevation)
- [Primitives](#primitives)
- [Components](#components)
- [Patterns](#patterns)
- [Accessibility](#accessibility)
- [Contributing](#contributing)
- [Resources](#resources)

---

## Philosophy

The Toggo Design System is built on three core pillars:

### 🎯 Consistency
A unified visual language across all touchpoints ensures users feel confident and familiar with the app, regardless of which feature they're using.

### ⚡ Efficiency
Reusable, well-documented components accelerate development and reduce cognitive load for engineers, allowing teams to focus on solving user problems rather than reinventing UI patterns.

### 🌍 Inclusive Design
Build with broad usability in mind. While not every feature needs WCAG AAA compliance, following basic accessibility principles makes the app better for everyone—from users with visual impairments to those using the app in bright sunlight.

---

## Design Principles

### 1. **Clarity Over Cleverness**
- Prioritize clear communication over stylistic flourishes
- Every element should have a clear purpose
- Use familiar patterns unless innovation significantly improves the experience

### 2. **Progressive Disclosure**
- Show what's necessary, hide what's not
- Guide users through complex tasks with bite-sized steps
- Avoid overwhelming users with options upfront

### 3. **Delightful Details**
- Smooth, intentional animations that provide feedback
- Thoughtful micro-interactions that feel responsive
- Visual polish that rewards attention without demanding it

### 4. **Mobile-First, Context-Aware**
- Design for thumbs and small screens first
- Adapt layouts for different contexts (commute vs planning session)
- Respect system preferences (dark mode, accessibility settings)

### 5. **Content is King**
- Typography and spacing create rhythm and hierarchy
- Images and media enhance understanding, not just decoration
- White space is a design element, not wasted space

---

## Getting Started

### Installation

The design system is already integrated into the Toggo frontend. All components and tokens are exported from a single entry point:

```tsx
import { Box, Text, Button, theme } from '@/design-system';
```

### Basic Usage

```tsx
import { Box, Text, Button } from '@/design-system';

function WelcomeCard() {
  return (
    <Box padding="md" backgroundColor="surfaceCard" borderRadius="md">
      <Text variant="lgHeading" color="textPrimary">
        Welcome to Toggo
      </Text>
      <Text variant="smParagraph" color="textSecondary" marginTop="xs">
        Start planning your next adventure
      </Text>
      <Button
        variant="Primary"
        label="Create Trip"
        onPress={() => {}}
        marginTop="md"
      />
    </Box>
  );
}
```

---

## Design Tokens

Design tokens are the atomic values that define the visual language. They ensure consistency and make global updates trivial.

### Colors

#### Color Philosophy
- **Semantic naming**: Colors are named by their purpose (`textPrimary`, `surfaceCard`) rather than their value (`gray800`)
- **Dark mode ready**: Token names remain constant; values adapt to theme
- **Accessibility first**: All color combinations meet WCAG AA contrast requirements

#### Brand Colors
```ts
brandPrimary: "#FF7E00"    // Vibrant orange - primary actions, highlights
brandSecondary: "#34C759"  // Fresh green - success, confirmation
brandAccent: "#FFB347"     // Warm peach - subtle highlights, hover states
```

**Usage Guidelines:**
- `brandPrimary`: Primary CTAs, important actions, navigation highlights
- `brandSecondary`: Success states, confirmations, positive feedback
- `brandAccent`: Hover states, subtle emphasis, decorative elements

#### Text Colors
```ts
textPrimary: "#FFFFFF"     // Primary content (white for dark mode)
textSecondary: "#000000"   // Secondary content, body text
textQuaternary: "#858585"  // Tertiary/muted content, captions
textInverse: "#FFFFFF"     // Text on dark backgrounds
textDisabled: "#999999"    // Disabled/inactive text
textLink: "#007AFF"        // Hyperlinks, interactive text
```

**Hierarchy:**
1. **Primary**: Page titles, section headers, critical information
2. **Secondary**: Body copy, descriptions, most readable content
3. **Quaternary**: Metadata, timestamps, helper text
4. **Disabled**: Inactive buttons, unavailable options

#### Surface Colors
```ts
surfaceBackground: "#F5F5F7"  // App background, lowest layer
surfaceCard: "#FFFFFF"        // Cards, panels, content containers
surfaceElevated: "#FAFAFA"    // Raised elements, dropdowns
surfaceOverlay: "rgba(0,0,0,0.4)"  // Modals, sheets, overlays
```

**Elevation Hierarchy:**
```
surfaceBackground (z: 0)
  └─ surfaceCard (z: 1)
      └─ surfaceElevated (z: 2)
          └─ surfaceOverlay (z: 100)
```

#### Feedback Colors
```ts
success: "#34C759"   // Successful actions, confirmations
error: "#FF3B30"     // Errors, destructive actions, warnings
warning: "#FF9500"   // Warnings, caution, important notices
info: "#007AFF"      // Informational messages, tips
```

**When to Use:**
- **Success**: Trip created, member added, payment confirmed
- **Error**: Failed upload, invalid input, network error
- **Warning**: Low storage, unsaved changes, potential issues
- **Info**: Tips, feature announcements, helpful hints

### Typography

#### Type System
Built on the **Figtree** font family for exceptional readability on mobile screens, with **Zain ExtraBold** for brand moments.

#### Type Scale
```ts
xxxl: 36px  // Hero headlines
xxl:  32px  // Page titles
xl:   24px  // Section headers
lg:   18px  // Subsection headers
md:   16px  // Body text (default)
sm:   14px  // Small body, labels
xs:   12px  // Captions, metadata
xxs:  10px  // Micro copy
```

**Base Unit**: 16px (1rem) — ensures scalability and accessibility

#### Typography Variants

##### Display (Impact)
```ts
xxxlDisplay  // 36px, Black weight    - Marketing, splash screens
xxlDisplay   // 32px, Black weight    - Hero sections
xlDisplay    // 24px, ExtraBold       - Feature highlights
lgDisplay    // 18px, ExtraBold       - Emphasized headers
smDisplay    // 14px, ExtraBold       - Small emphasis
```
**Use Case**: Landing pages, empty states, promotional content

##### Heading (Structure)
```ts
xxlHeading   // 32px, Bold  - Page titles
xlHeading    // 24px, Bold  - Section titles
lgHeading    // 18px, Bold  - Subsection titles
mdHeading    // 16px, SemiBold - Card titles
smHeading    // 14px, SemiBold - Component headers
xsHeading    // 12px, SemiBold - Micro headers
```
**Use Case**: Information hierarchy, content organization

##### Label (UI)
```ts
lgLabel      // 18px, Medium - Large buttons
mdLabel      // 16px, Medium - Form labels, default buttons
smLabel      // 14px, Medium - Small buttons, chips
xsLabel      // 12px, Medium - Tiny buttons, badges
```
**Use Case**: Interactive elements, form fields, navigation

##### Paragraph (Content)
```ts
lgParagraph  // 18px, Regular - Introductions, leads
mdParagraph  // 16px, Regular - Body text (default)
smParagraph  // 14px, Regular - Compact body text
xsParagraph  // 12px, Regular - Captions, footnotes
xxsParagraph // 10px, Regular - Legal, micro-copy
```
**Use Case**: Long-form content, descriptions, explanations

#### Typography Guidelines

**Line Height:**
- **Display sizes (≥24px)**: 1.2 × font size (tight, impactful)
- **Body sizes (<24px)**: 1.4 × font size (comfortable reading)

**Letter Spacing:**
- **Display sizes**: -0.5px (optical tightening)
- **Body sizes**: 0px (default tracking)

**Hierarchy Best Practices:**
```tsx
// ✅ Good: Clear hierarchy
<Text variant="xlHeading">Trip Details</Text>
<Text variant="mdParagraph">Paris, France</Text>
<Text variant="xsLabel">Mar 22 - Mar 29</Text>

// ❌ Bad: Conflicting weights
<Text variant="lgDisplay">Trip Details</Text>
<Text variant="xlHeading">Paris, France</Text>
```

### Spacing

#### Spacing Scale
Based on an **8px grid system** for consistent, harmonious layouts:

```ts
xxs:  4px   // Tight grouping (icon + text)
xs:   8px   // Compact spacing (form fields)
sm:   16px  // Related elements (card content)
md:   24px  // Section spacing (between groups)
lg:   32px  // Major sections (between cards)
xl:   48px  // Page sections (distinct areas)
xxl:  64px  // Hero spacing (dramatic separation)
```

#### Spacing Guidelines

**Relationship Principle:**
- **Related items**: Use smaller spacing (xs, sm)
- **Separate groups**: Use medium spacing (md, lg)
- **Distinct sections**: Use large spacing (xl, xxl)

**Examples:**
```tsx
// Button icon + label: xxs (4px)
<Icon /> <Text>Submit</Text>

// Form fields: sm (16px)
<TextField label="Name" marginBottom="sm" />
<TextField label="Email" marginBottom="sm" />

// Card sections: md (24px)
<CardHeader marginBottom="md" />
<CardContent marginBottom="md" />

// Between cards: lg (32px)
<Card marginBottom="lg" />
<Card marginBottom="lg" />
```

### Layout

#### Grid System
```ts
base: 8px  // All spacing derives from 8px multiples
```

#### Screen Margins
```ts
horizontalPadding: 24px  // Standard screen edges
compactPadding: 16px     // Tight layouts, modals
```

#### Section Spacing
```ts
sm: 24px  // Small sections (list items)
md: 32px  // Medium sections (cards)
lg: 48px  // Large sections (page areas)
```

#### Content Width
```ts
maxReadableWidth: 680px  // Optimal line length for readability
```

**Why 680px?** Research shows 60-75 characters per line is optimal for reading comprehension. This prevents eye strain on wide screens.

### Corner Radius

```ts
none: 0px    // Sharp edges (dividers, progress bars)
xs:   4px    // Subtle rounding (chips, badges)
sm:   8px    // Standard rounding (buttons, inputs)
md:   12px   // Card rounding (cards, modals)
lg:   16px   // Prominent rounding (images, features)
xl:   24px   // Dramatic rounding (hero cards)
full: 999px  // Circular (avatars, pills)
```

**Consistency Rule:** Use the same radius throughout a component. Don't mix `sm` and `md` in the same card.

### Elevation

Elevation creates depth through shadows. Use sparingly—not every element needs a shadow.

```ts
none:   0    // Flat (backgrounds)
sm:     1    // Subtle lift (hover states)
md:     2    // Standard cards
lg:     3    // Modals, dropdowns
xl:     4    // Important overlays
```

**Elevation Mapping:**
- `none`: Backgrounds, flat UI
- `sm`: Buttons on hover, active states
- `md`: Cards, panels (default)
- `lg`: Bottom sheets, popover menus
- `xl`: Modals, critical overlays

---

## Primitives

Primitives are the building blocks—low-level components that compose into higher-level UI.

### Box
The foundational layout component. Every container starts here.

```tsx
import { Box } from '@/design-system';

<Box
  padding="md"
  backgroundColor="surfaceCard"
  borderRadius="md"
  elevation="md"
>
  {/* Content */}
</Box>
```

**When to use:**
- Container layouts
- Spacing wrappers
- Custom components
- Flex/grid containers

### Text
Semantic text component with built-in variants and accessibility.

```tsx
import { Text } from '@/design-system';

<Text variant="mdHeading" color="textPrimary">
  Welcome to Toggo
</Text>
```

**Accessibility:**
- Respects system font size preferences
- High contrast mode compatible
- Screen reader optimized

### AnimatedBox
Box with built-in animation support via Reanimated.

```tsx
import { AnimatedBox } from '@/design-system';

<AnimatedBox
  entering={FadeIn}
  exiting={FadeOut}
  padding="md"
>
  {/* Animated content */}
</AnimatedBox>
```

---

## Components

### Buttons

#### Primary Actions
```tsx
<Button
  variant="Primary"
  label="Create Trip"
  onPress={handleCreate}
  layout="textOnly"
/>
```

**When to use:** Main CTAs, form submissions, primary actions

#### Secondary Actions
```tsx
<Button
  variant="Secondary"
  label="Cancel"
  onPress={handleCancel}
  layout="textOnly"
/>
```

**When to use:** Alternative actions, cancel buttons, less emphasis

#### Button Layouts
- `textOnly`: Label only (default)
- `leadingIcon`: Icon on left + label
- `leadingAndTrailingIcon`: Icons on both sides + label
- `iconOnly`: Icon only (for compact spaces)

**Best Practices:**
- Use `Primary` for the single most important action
- Limit to one Primary button per screen section
- Secondary buttons can have multiple instances
- Icon-only buttons require `accessibilityLabel`

### Navigation

#### BackButton
```tsx
import { BackButton } from '@/design-system';

<BackButton />
```

Auto-navigates to previous screen. Customizable with `onPress` override.

### Status Components

#### Empty State
```tsx
import { EmptyState } from '@/design-system';

<EmptyState
  title="No trips yet"
  description="Create your first trip to get started"
  illustration="trips"
/>
```

#### Error State
```tsx
import { ErrorState } from '@/design-system';

<ErrorState
  title="Something went wrong"
  description="Unable to load trips"
  onRetry={refetch}
/>
```

**When to use:**
- Empty: No data, first-time experience
- Error: Failed requests, broken states

### Forms

#### TextField
```tsx
import { TextField } from '@/design-system';

<TextField
  label="Trip Name"
  placeholder="e.g., Europe 2026"
  value={tripName}
  onChangeText={setTripName}
  error={errors.tripName}
/>
```

**Validation States:**
- Default: No validation
- Error: `error` prop with message
- Success: Custom success styling

### Pickers

#### DateRangePicker
```tsx
import { DateRangePicker } from '@/design-system';

<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onRangeChange={handleRangeChange}
/>
```

#### TimePicker
```tsx
import { TimePicker } from '@/design-system';

<TimePicker
  value={time}
  onChange={setTime}
/>
```

### Images

#### Avatar
```tsx
import { Avatar } from '@/design-system';

<Avatar
  profilePhoto={profileImageUrl}
  variant="md"
  seed={userId} // For deterministic background colors
/>
```

**Variants:** `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`

**Props:**
- `profilePhoto`: Optional image URL
- `variant`: Size variant (CoreSizeKey)
- `seed`: String for deterministic color generation (e.g., user ID)

**Note:** Avatar auto-generates colored backgrounds when no photo is provided.

#### ImagePicker
```tsx
import { ImagePicker } from '@/design-system';

<ImagePicker
  value={imageUri}
  onChange={(uri) => setImageUri(uri)}
  variant="circular"
  size={88}
/>
```

**Variants:**
- `circular`: Circular image picker (for avatars)
- `rectangular`: Rectangular image picker

**Props:**
- `value`: Current image URI
- `onChange`: Callback when image changes
- `variant`: `circular` or `rectangular`
- `size`: Size for circular variant (default: 88)
- `width`/`height`: Dimensions for rectangular variant

### Brand

#### Logo
```tsx
import { Logo } from '@/design-system';

<Logo />
```

Simple text-based "toggo" logo with brand styling. No props.

#### Illustration
```tsx
import { Illustration } from '@/design-system';

<Illustration />
```

Emoji-based illustration (✈️🌇🏖️). No props.

### Feedback

#### Toast
```tsx
import { useToast } from '@/design-system';

const toast = useToast();

toast.show({
  message: 'Trip created successfully',
  duration: 3000,
  showClose: true,
  action: {
    label: 'Undo',
    onPress: handleUndo,
  },
});
```

**Props:**
- `message`: Toast content (required)
- `duration`: Auto-dismiss time in ms (optional)
- `showClose`: Show close button (optional)
- `action`: Optional action button with label and onPress

### Skeletons

```tsx
import { SkeletonRect, SkeletonCircle } from '@/design-system';

<SkeletonCircle size={48} />
<SkeletonRect width="100%" height={20} marginTop="sm" />
```

**When to use:** Loading states, perceived performance

---

## Patterns

### Card Pattern
```tsx
<Box
  backgroundColor="surfaceCard"
  borderRadius="md"
  padding="md"
  elevation="md"
>
  <Text variant="mdHeading" marginBottom="xs">
    Card Title
  </Text>
  <Text variant="smParagraph" color="textSecondary">
    Card description goes here
  </Text>
</Box>
```

### List Pattern
```tsx
<Box gap="md">
  {items.map(item => (
    <Box
      key={item.id}
      backgroundColor="surfaceCard"
      padding="sm"
      borderRadius="sm"
    >
      <Text variant="mdLabel">{item.title}</Text>
    </Box>
  ))}
</Box>
```

### Form Pattern
```tsx
<Box gap="md" padding="md">
  <TextField
    label="Trip Name"
    value={tripName}
    onChangeText={setTripName}
  />
  <DateRangePicker
    startDate={startDate}
    endDate={endDate}
    onRangeChange={handleDates}
  />
  <Button
    variant="Primary"
    label="Create Trip"
    onPress={handleSubmit}
  />
</Box>
```

### Screen Layout Pattern
```tsx
import { Screen } from '@/design-system';

<Screen>
  <Box padding="md" gap="lg">
    {/* Screen content */}
  </Box>
</Screen>
```

**Screen** provides:
- Safe area insets
- Keyboard avoidance
- Consistent background

---

## Accessibility

While not every feature requires strict WCAG compliance, following basic accessibility principles improves the experience for all users.

### Color Contrast (Recommended)
Aim for **WCAG AA** standards where practical (4.5:1 for normal text, 3:1 for large text).

**Testing:** Use the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Note:** Brand colors and visual design may sometimes take precedence. Focus contrast efforts on critical paths (auth, payment, navigation).

### Touch Targets (Best Practice)
**Recommended minimum:** 44×44 points (iOS HIG guideline)

```tsx
// ✅ Recommended: 44px for primary actions
<Button layout="iconOnly" icon={<Icon />} />

// ⚠️ Acceptable for non-critical UI: Smaller targets
<Pressable style={{ width: 32, height: 32 }}>
  <Icon />
</Pressable>
```

**When to prioritize:** Primary CTAs, navigation, form inputs
**Less critical:** Decorative elements, secondary actions

### Screen Readers (Optional but Helpful)
Consider adding accessible labels for better screen reader support:

```tsx
// ✅ Enhanced: Screen reader friendly
<Button
  label="Submit"
  accessibilityLabel="Submit trip details"
  onPress={handleSubmit}
/>

// ✓ Acceptable: Basic implementation
<Pressable onPress={handleSubmit}>
  <Icon name="checkmark" />
  <Text>Submit</Text>
</Pressable>
```

### Reduced Motion (Nice to Have)
Respect `prefers-reduced-motion` for critical animations:

```tsx
import { useReducedMotion } from 'react-native-reanimated';

const reducedMotion = useReducedMotion();

// Optional: Disable non-essential animations
const animation = reducedMotion
  ? undefined
  : FadeIn.duration(300);
```

**Priority areas:** Page transitions, loading states, modals

---

## Contributing

### Adding a New Component

1. **Create the component file:**
   ```
   frontend/design-system/components/[category]/[component-name].tsx
   ```

2. **Use design tokens:**
   ```tsx
   import { theme } from '../../tokens/theme';

   const styles = {
     container: {
       padding: theme.spacing.md,
       backgroundColor: theme.colors.surfaceCard,
     },
   };
   ```

3. **Export from index:**
   ```ts
   // design-system/index.ts
   export { YourComponent } from './components/[category]/[component-name]';
   ```

4. **Document in DESIGN.md:**
   Add usage examples and guidelines

### Modifying Design Tokens

**⚠️ Warning:** Token changes affect the entire app. Proceed carefully.

1. **Update token file:**
   ```ts
   // design-system/tokens/color.ts
   export const ColorPalette = {
     // ...existing colors
     newColor: "#ABCDEF",
   };
   ```

2. **Update TypeScript types (auto-generated)**

3. **Test across app:**
   - Run visual regression tests
   - Check dark mode compatibility
   - Verify accessibility

4. **Document rationale:**
   Update DESIGN.md with why the change was made

### Design Token Naming Convention

**Semantic, not descriptive:**
```ts
// ✅ Good: Semantic
textPrimary: "#FFFFFF"
surfaceCard: "#FFFFFF"

// ❌ Bad: Descriptive
gray100: "#FFFFFF"
lightGray: "#FFFFFF"
```

**Why?** Semantic names allow values to change (e.g., dark mode) while names stay consistent.

---

## Resources

### Design Tools
- **Figma:** [Design files and prototypes]
- **Storybook:** [Component playground] (if applicable)

### Dependencies
- `@shopify/restyle` - Type-safe styling system
- `react-native-reanimated` - Smooth animations
- `expo-image-picker` - Image selection

### Further Reading
- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [Material Design Guidelines](https://m3.material.io/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Internal References
- [CLAUDE.md](/CLAUDE.md) - Engineering principles
- [Backend API Docs](/backend/docs/swagger.yaml) - API reference

---

## Changelog

### Version 1.0 (Current)
- Initial design system documentation
- Core primitives: Box, Text, AnimatedBox
- 20+ production components
- Comprehensive token system
- Accessibility guidelines

---

**Questions or suggestions?** Open an issue or reach out to the design team.

---

*Last updated: March 2026*
