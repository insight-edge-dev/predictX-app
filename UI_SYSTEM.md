# UI Design System

## Design Reference

UI style inspired by 433 sports app.

Characteristics:

Dark sports theme
Card based layout
Bold typography
Neon accent color
Rounded cards
Gradient match cards
Compact spacing
Professional sports feel

---

## Color System

Background:
#0B0B0B

Card background:
#151515

Primary accent:
#E6FF00

Secondary:
#A0A0A0

Text:
#FFFFFF

Lose color:
#FF4D4D

Win color:
#00D084

Draw:
#FFB800

---

## Spacing System

4px micro spacing
8px small spacing
12px component spacing
16px card padding
24px section spacing

Never random spacing.

---

## Border Radius

Cards:
16px

Buttons:
12px

Small elements:
8px

---

## Typography

Title:
Bold
18-22px

Match teams:
Bold
16px

Secondary text:
Regular
12-14px

Scores:
Bold
20px

---

## Match Card Structure

Layout:

Horizontal card.

Left:
Team logo
Team name

Center:
Score or time

Right:
Team logo
Team name

Card style:

Rounded 16
Padding 16
Gradient background
Vertical spacing 12

Reusable component required.

File:

MatchCard.tsx

---

## Required Components

Must create:

MatchCard
ProbabilityBar
DateSelector
TeamRow
ScreenContainer
SectionHeader
BottomTabs

Never duplicate UI.

---

## Layout Rules

Always:

Use consistent padding.

Never inline styles.

Always NativeWind classes.

Always reusable components.

---

## UX Rules

Fast scrolling lists.

FlashList required.

Loading skeleton required.

Error state required.

Empty state required.

---

## Animation Rules

Subtle animations only.

Card press scale.

Tab transitions.

No heavy animations.