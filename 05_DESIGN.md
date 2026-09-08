# CampusPilot — Design System & UI Direction

## 1. Design Goal

The interface should feel like a modern productivity product, not a traditional college portal.

Design keywords:

**Calm · Smart · Focused · Premium · Student-friendly**

Avoid:
- Clutter.
- Excessive gradients.
- Too many colors.
- Fake futuristic effects.
- Tiny text.
- Overloaded dashboards.

## 2. Visual Identity

### Brand
**CampusPilot**

Tagline:
**Your college life, under control.**

Logo direction:
- Minimal compass/pilot mark combined with a graduation-cap or navigation motif.
- Simple enough to work as a favicon.

## 3. Color System

Suggested palette:

```text
Background:      #F7F8FC
Surface:         #FFFFFF
Primary:         #4F46E5
Primary Dark:    #3730A3
Text:            #111827
Muted Text:      #6B7280
Border:          #E5E7EB
Success:         #16A34A
Warning:         #D97706
Danger:          #DC2626
```

Keep primary color usage restrained.

## 4. Typography

Recommended:
- Inter
- Geist
- Manrope

Hierarchy:
- Page title: 28–36px
- Section title: 20–24px
- Card title: 16–18px
- Body: 14–16px
- Caption: 12–13px

## 5. Spacing

Use an 8px spacing system:

```text
8
16
24
32
40
48
64
```

Maintain generous whitespace.

## 6. Cards

Cards:
- White surface.
- Thin border.
- 12–16px radius.
- Small shadow only where useful.
- Consistent internal padding.

## 7. Status Components

### Attendance
Healthy:
- Positive icon + healthy label.

Watch:
- Warning icon + watch label.

Critical:
- Alert icon + critical label.

Never communicate status using color alone; include text/icon.

## 8. Dashboard Layout

Desktop:

```text
┌──────────────────────────────────────────────┐
│ Sidebar │ Header                             │
│         ├────────────────────────────────────┤
│         │ Greeting                           │
│         │                                    │
│         │ [Attendance] [Assignments] [Exams] │
│         │                                    │
│         │ Today's Priorities | AI Insight    │
│         │                                    │
│         │ Upcoming Assignments               │
└─────────┴────────────────────────────────────┘
```

## 9. AI Visual Language

AI should feel helpful, not magical.

Use:
- Spark/assistant icon.
- Clear explanation of what inputs were considered.
- "Generated from your exam date, available time and preparation level."

Avoid:
- Fake confidence scores.
- "100% guaranteed success."
- Anthropomorphic overpromises.

## 10. Study Plan Design

Use a vertical timeline:

```text
DAY 1
│
├── Learn Unit 1        90 min
├── Practice             45 min
└── Revision             30 min
│
DAY 2
│
├── Learn Unit 2        90 min
└── Questions            60 min
```

Allow completed tasks to become visually lighter while remaining readable.

## 11. Interaction

Buttons:
- Primary: filled.
- Secondary: outlined/soft.
- Destructive: clear danger styling.

Forms:
- Labels above inputs.
- Helpful placeholders.
- Inline validation.
- Submit button stays obvious.

## 12. Motion

Keep motion subtle:
- 150–250ms transitions.
- Card hover lift of 1–2px.
- Skeleton loading.
- AI generation progress animation.

Do not animate every element.

## 13. Design QA Checklist

Before demo:
- No overlapping elements.
- No broken mobile layout.
- No horizontal scrolling.
- All buttons have hover/focus states.
- All forms have labels.
- Empty states look intentional.
- Loading states exist.
- Error states exist.
- Long names and assignment titles do not break cards.

## 14. Demo Polish

For the final hackathon demo:
- Preload realistic sample data through the user's own account/demo seed.
- Keep the home dashboard visually clean.
- Keep AI generation under a clear loading state.
- Have one compelling Emergency Study Mode example ready.
- Avoid showing unfinished future pages.
