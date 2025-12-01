# UI Components Library

A comprehensive collection of reusable UI components built with React, TypeScript, and Tailwind CSS.

## Components

### Button
Modern button component with multiple variants and sizes.

**Variants:**
- `default` - Standard gray button
- `primary` - Blue to purple gradient
- `secondary` - Glass-morphism style
- `destructive` - Red gradient
- `outline` - Outlined button
- `ghost` - Transparent button
- `link` - Link-style button
- `success` - Green gradient
- `warning` - Yellow to orange gradient

**Sizes:** `sm`, `default`, `lg`, `xl`, `icon`, `icon-sm`, `icon-lg`

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="lg">Click me</Button>
```

### Input
Flexible input component with icons, labels, and validation states.

**Variants:**
- `default` - Standard input
- `error` - Error state with red styling
- `success` - Success state with green styling
- `ghost` - Minimal styling
- `glass` - Glass-morphism style

**Features:**
- Icon support (left/right positioning)
- Label and helper text
- Error message display
- Multiple sizes

```tsx
import { Input } from '@/components/ui'

<Input 
  label="Email"
  placeholder="Enter your email"
  icon={<EmailIcon />}
  error="Invalid email format"
/>
```

### PasswordInput
Specialized password input with show/hide toggle functionality.

**Features:**
- Show/hide password toggle button
- Same variants as Input component
- Accessible with proper ARIA labels
- Custom toggle button text
- All Input component features

```tsx
import { PasswordInput } from '@/components/ui'

<PasswordInput 
  label="Password"
  placeholder="Enter your password"
  variant="glass"
  size="lg"
  showPasswordText="Show password"
  hidePasswordText="Hide password"
/>
```

### Card
Versatile card component for content containers.

**Variants:**
- `default` - Standard card
- `elevated` - Enhanced shadow
- `glass` - Glass-morphism effect
- `gradient` - Subtle gradient background
- `outline` - Outlined style

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Badge
Small status indicators and labels.

**Variants:**
- `default`, `secondary`, `destructive`, `outline`
- `success`, `warning`, `info`, `gradient`

```tsx
import { Badge } from '@/components/ui'

<Badge variant="success">Active</Badge>
```

### Loading
Loading indicators and skeleton components.

**Components:**
- `Loading` - Spinning loader
- `PulseLoading` - Animated dots
- `Skeleton` - Placeholder content

```tsx
import { Loading, Skeleton } from '@/components/ui'

<Loading size="lg" text="Loading..." />
<Skeleton className="h-4 w-full" />
```

### Modal
Accessible modal dialog component.

**Features:**
- Keyboard navigation (ESC to close)
- Backdrop click to close
- Multiple sizes
- Header and footer sections

```tsx
import { Modal } from '@/components/ui'

<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="lg"
>
  Modal content
</Modal>
```

### Tooltip
Hover tooltip component.

**Positions:** `top`, `bottom`, `left`, `right`

```tsx
import { Tooltip } from '@/components/ui'

<Tooltip content="Helpful information" position="top">
  <Button>Hover me</Button>
</Tooltip>
```

## Design System

### Colors
- **Primary:** Blue to purple gradients
- **Secondary:** Glass-morphism effects
- **Success:** Green tones
- **Warning:** Yellow to orange
- **Destructive:** Red tones

### Animations
- Smooth transitions (200ms duration)
- Hover scale effects
- Focus ring indicators
- Loading animations

### Accessibility
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly

## Usage

Import components individually or use the barrel export:

```tsx
// Individual imports
import { Button } from '@/components/ui/Button'

// Barrel import
import { Button, Input, Card } from '@/components/ui'
```

## Customization

All components use `class-variance-authority` for variant management and can be customized via:

1. **Variant props** - Use built-in variants
2. **className prop** - Override with custom classes
3. **CSS variables** - Modify design tokens
4. **Tailwind config** - Extend the design system
