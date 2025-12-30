# Dual Theme System & UI Enhancement Guidelines

## Overview

Pana ERP v3.0 implements a comprehensive dual theme system (light/dark mode) with smooth transitions, theme persistence, and full component support. This document outlines the architecture, implementation patterns, and best practices.

---

## 1. Theme Architecture

### 1.1 Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **ThemeProvider** | `lib/theme-context.tsx` | React Context for theme state management |
| **Theme CSS Variables** | `app/globals.css` | OKLCH color definitions for both themes |
| **Theme Toggle** | `components/smart/theme-toggle.tsx` | UI component for switching themes |
| **Initial Script** | `app/layout.tsx` | Prevents FOUC on page load |

### 1.2 Theme Flow

```
┌──────────────────┐
│  User Toggles    │
│     Theme        │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  ThemeProvider                       │
│  - Updates state                     │
│  - Saves to localStorage             │
│  - Applies .dark/.light class        │
│  - Adds .transitioning class         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  CSS Custom Properties               │
│  - Reads theme class                 │
│  - Applies color variables           │
│  - Smooth 200ms transitions          │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  All Components                      │
│  - Use theme-aware colors            │
│  - Automatically adapt               │
└──────────────────────────────────────┘
```

---

## 2. Color System

### 2.1 OKLCH Color Space

We use OKLCH (Oklab Lightness Chroma Hue) for perceptually uniform colors:

```css
/* Format: oklch(lightness chroma hue) */
--color-primary: oklch(0.55 0.18 265);
```

**Benefits:**
- Perceptually uniform brightness
- Better color interpolation
- Consistent contrast ratios
- Easier to create accessible color palettes

### 2.2 Color Token Structure

```css
:root {
  /* Core Palette */
  --color-background: oklch(0.99 0.005 240);
  --color-foreground: oklch(0.15 0.015 240);
  
  /* Surface Colors */
  --color-card: oklch(1 0 0);
  --color-popover: oklch(1 0 0);
  
  /* Interactive Colors */
  --color-primary: oklch(0.45 0.2 265);
  --color-secondary: oklch(0.96 0.01 240);
  --color-accent: oklch(0.96 0.01 240);
  --color-destructive: oklch(0.58 0.2 25);
  
  /* Borders & Inputs */
  --color-border: oklch(0.92 0.01 240);
  --color-input: oklch(0.92 0.01 240);
  --color-ring: oklch(0.45 0.2 265);
}

.dark {
  /* Dark Mode - Lighter background for visibility */
  --color-background: oklch(0.15 0.015 240);
  --color-foreground: oklch(0.95 0.005 240);
  
  /* Elevated surfaces */
  --color-card: oklch(0.19 0.02 240);
  --color-popover: oklch(0.21 0.02 240);
  
  /* Vibrant primary for active states */
  --color-primary: oklch(0.55 0.18 265);
  
  /* Better contrast */
  --color-secondary: oklch(0.23 0.02 240);
  --color-border: oklch(0.3 0.02 240);
}
```

### 2.3 Dark Mode Guidelines

**Lightness Values:**
- Background: `0.15` (not too dark, better visibility)
- Cards: `0.19` (elevated from background)
- Popovers: `0.21` (highest elevation)
- Primary: `0.55` (vibrant indigo for active states)
- Secondary: `0.23` (subtle contrast)
- Borders: `0.30` (visible separation)

**Key Principles:**
1. **Never go below 0.15 lightness** - too dark, poor visibility
2. **Use 0.04-0.05 steps** between elevation levels
3. **Primary should be vibrant** (0.55+ lightness) for active states
4. **Maintain 4.5:1 contrast ratio** for text

---

## 3. Theme-Aware Component Patterns

### 3.1 Hardcoded Colors (❌ NEVER DO)

```tsx
// ❌ BAD - Hardcoded white background
<div className="bg-white hover:bg-gray-100">

// ❌ BAD - Hardcoded dark text
<span className="text-gray-900">

// ❌ BAD - Hardcoded border
<div className="border-gray-200">
```

### 3.2 Theme-Aware Colors (✅ ALWAYS DO)

```tsx
// ✅ GOOD - Uses theme variables
<div className="bg-card hover:bg-card/80">

// ✅ GOOD - Uses semantic colors
<span className="text-foreground">

// ✅ GOOD - Uses theme-aware borders
<div className="border-border">
```

### 3.3 Common Patterns

| Use Case | Light Mode | Dark Mode | Tailwind Class |
|----------|------------|-----------|----------------|
| **Page Background** | White | Dark Gray | `bg-background` |
| **Card Background** | White | Elevated Gray | `bg-card` |
| **Popover/Dropdown** | White | Elevated Gray | `bg-popover` |
| **Primary Text** | Dark Gray | Light Gray | `text-foreground` |
| **Secondary Text** | Medium Gray | Medium Gray | `text-muted-foreground` |
| **Borders** | Light Gray | Medium Gray | `border-border` |
| **Input Background** | Light Gray | Dark Gray | `bg-secondary` |
| **Hover State** | Lighter | Lighter | `hover:bg-card/80` |
| **Active/Selected** | Primary Color | Primary Color | `bg-primary` |

---

## 4. Transition System

### 4.1 Smooth Theme Switching

```css
/* Only transition during theme changes */
html.transitioning,
html.transitioning * {
  transition: background-color 0.2s ease, 
              border-color 0.2s ease, 
              color 0.2s ease !important;
}
```

**Implementation:**
```typescript
// lib/theme-context.tsx
const applyTheme = (resolved: "light" | "dark") => {
  const root = document.documentElement;
  
  // Add transitioning class
  root.classList.add("transitioning");
  
  // Apply theme
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  
  // Remove after transition completes
  setTimeout(() => {
    root.classList.remove("transitioning");
  }, 200);
};
```

**Why This Works:**
- Prevents stuttering by only transitioning theme-related properties
- Avoids performance issues from transitioning all properties
- Smooth 200ms duration feels natural
- Removes transition class after completion to avoid interfering with other animations

---

## 5. Component-Specific Guidelines

### 5.1 Form Inputs

```tsx
// ✅ GOOD - Theme-aware input
<Input className="bg-secondary/30 hover:bg-secondary/50 focus:bg-card" />

// Pattern breakdown:
// - bg-secondary/30: Subtle background in both themes
// - hover:bg-secondary/50: Slightly darker on hover
// - focus:bg-card: Full card background when focused
```

### 5.2 Dropdowns & Popovers

```tsx
// ✅ GOOD - Theme-aware dropdown
<DropdownMenuContent className="bg-popover/90 backdrop-blur-xl border-0">
  {/* Content */}
</DropdownMenuContent>

// Pattern breakdown:
// - bg-popover/90: Semi-transparent for glassmorphism
// - backdrop-blur-xl: Blur effect for depth
// - border-0: Remove default border (use shadow instead)
```

### 5.3 List Items

```tsx
// ✅ GOOD - Theme-aware list item
<div className="bg-card hover:bg-card/80 transition-all">
  {/* Content */}
</div>

// Pattern breakdown:
// - bg-card: Card background (white in light, elevated in dark)
// - hover:bg-card/80: Slightly transparent on hover
// - transition-all: Smooth hover animation
```

### 5.4 Active/Selected States

```tsx
// ✅ GOOD - Vibrant active state
<div className={cn(
  "transition-colors",
  isActive 
    ? "bg-primary text-primary-foreground" 
    : "text-muted-foreground hover:bg-secondary"
)}>
  {/* Content */}
</div>

// Pattern breakdown:
// - bg-primary: Vibrant indigo (visible in both themes)
// - text-primary-foreground: High contrast text
// - Inactive state uses muted colors
```

---

## 6. SearchableSelect Enhancement

### 6.1 Features

The `SearchableSelect` component provides:
- **Search functionality** for filtering options
- **Scroll support** for large lists (500+ items)
- **Keyboard navigation** (arrow keys, enter, escape)
- **Theme-aware styling** (works in both light/dark)

### 6.2 Usage in FrappeSelect

```tsx
// components/smart/frappe-select.tsx
export function FrappeSelect({ doctype, value, onChange, ... }: FrappeSelectProps) {
  const { data: options } = useFrappeOptions(doctype, { limit: 500 });
  
  return (
    <SearchableSelect
      options={options || []}
      value={value}
      onValueChange={onChange}
      placeholder="Select..."
      searchPlaceholder={`Search ${doctype.toLowerCase()}...`}
      emptyText={`No ${doctype.toLowerCase()} found`}
    />
  );
}
```

### 6.3 Benefits

- **Better UX** for large option lists (Item Groups, UOMs, etc.)
- **Faster selection** with search
- **Consistent behavior** across all form fields
- **Accessible** with keyboard support

---

## 7. Implementation Checklist

### 7.1 New Component Checklist

When creating a new component:

- [ ] Use `bg-card` instead of `bg-white`
- [ ] Use `bg-popover` for dropdowns/dialogs
- [ ] Use `text-foreground` instead of `text-black`
- [ ] Use `text-muted-foreground` for secondary text
- [ ] Use `border-border` instead of `border-gray-*`
- [ ] Use `bg-secondary` for input backgrounds
- [ ] Test in both light and dark modes
- [ ] Verify contrast ratios (4.5:1 minimum)
- [ ] Check hover/active states in both themes

### 7.2 Migration Checklist

When migrating existing components:

- [ ] Find all `bg-white` → Replace with `bg-card`
- [ ] Find all `bg-gray-*` → Replace with semantic tokens
- [ ] Find all `text-gray-*` → Replace with `text-foreground` or `text-muted-foreground`
- [ ] Find all `border-gray-*` → Replace with `border-border`
- [ ] Find all hardcoded colors → Replace with theme variables
- [ ] Test all interactive states (hover, focus, active)
- [ ] Verify in both themes
- [ ] Check for any remaining hardcoded values

---

## 8. Best Practices

### 8.1 Color Selection

1. **Always use semantic tokens** (`bg-card`, `text-foreground`, etc.)
2. **Never use arbitrary colors** (`bg-[#fff]`, `text-[#000]`)
3. **Use opacity for variations** (`bg-card/80`, `bg-primary/10`)
4. **Maintain consistent elevation** (background → card → popover)

### 8.2 Accessibility

1. **Maintain 4.5:1 contrast** for normal text
2. **Maintain 3:1 contrast** for large text (18px+)
3. **Test with color blindness simulators**
4. **Ensure focus states are visible** in both themes

### 8.3 Performance

1. **Use CSS custom properties** for theme colors
2. **Apply transitions only during theme changes**
3. **Avoid transitioning all properties**
4. **Use `will-change` sparingly**

---

## 9. Testing

### 9.1 Manual Testing

For each component:

1. **Light Mode:**
   - Check all states (default, hover, focus, active)
   - Verify text contrast
   - Check border visibility

2. **Dark Mode:**
   - Check all states (default, hover, focus, active)
   - Verify text contrast
   - Check border visibility
   - Verify active states are visible (not too dark)

3. **Theme Switching:**
   - Toggle between themes
   - Verify smooth transition (no flashing)
   - Check for any remaining hardcoded colors

### 9.2 Automated Testing

```typescript
// Example: Test theme switching
describe('Theme System', () => {
  it('should switch themes smoothly', () => {
    // Toggle to dark mode
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('html').should('have.class', 'dark');
    
    // Verify colors changed
    cy.get('[data-testid="card"]')
      .should('have.css', 'background-color')
      .and('not.equal', 'rgb(255, 255, 255)');
  });
});
```

---

## 10. Common Pitfalls

### 10.1 Avoid These Mistakes

❌ **Using hardcoded colors in gradients:**
```tsx
// BAD
<div className="bg-gradient-to-br from-indigo-50 to-purple-50">
```

✅ **Use theme-aware gradients:**
```tsx
// GOOD
<div className="bg-gradient-to-br from-primary/5 to-primary/10">
```

❌ **Forgetting hover states:**
```tsx
// BAD - Same color in both themes
<button className="hover:bg-white">
```

✅ **Theme-aware hover:**
```tsx
// GOOD - Adapts to theme
<button className="hover:bg-secondary">
```

❌ **Hardcoded shadows:**
```tsx
// BAD
<div className="shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
```

✅ **Use Tailwind shadow utilities:**
```tsx
// GOOD - Automatically adjusts
<div className="shadow-lg">
```

---

## 11. Future Enhancements

### 11.1 Planned Features

- [ ] **System preference detection** (auto-switch based on OS)
- [ ] **Custom theme builder** (user-defined color schemes)
- [ ] **High contrast mode** (WCAG AAA compliance)
- [ ] **Theme presets** (Solarized, Nord, Dracula, etc.)
- [ ] **Per-module themes** (different themes for different modules)

### 11.2 Experimental Features

- [ ] **Animated theme transitions** (color morphing)
- [ ] **Theme scheduling** (auto-switch at sunset/sunrise)
- [ ] **Accessibility profiles** (dyslexia-friendly, low vision, etc.)

---

**End of Dual Theme System Guidelines**
