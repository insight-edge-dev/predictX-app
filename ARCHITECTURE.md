# Architecture Rules

## Folder Structure

src/

app/
(matches)
(match-details)
(tips)
(profile)

components/
MatchCard.tsx
ProbabilityBar.tsx
TeamRow.tsx

services/
rapidApi.ts
predictionEngine.ts
supabase.ts

hooks/
useMatches.ts
usePrediction.ts

store/
useUserStore.ts

types/
match.ts
team.ts
prediction.ts

theme/
colors.ts
spacing.ts

utils/
date.ts
format.ts

---

## Coding Rules

Never call API inside components.

Always:

Component → Hook → Service → API

Example:

MatchScreen
useMatches
rapidApi.getMatches()

---

## Component Rules

Components:

UI only.

No business logic.

No API calls.

---

## Service Rules

Services:

API calls
Data formatting
Error handling

---

## Hook Rules

Hooks:

State logic
Fetching
Caching

---

## Prediction Engine

Prediction must be separate.

File:

predictionEngine.ts

No UI inside.

Pure logic only.

---

## State Management

React Query:
Server data.

Zustand:
User state.

Do not mix.

---

## Types

All API responses must have types.

No any types allowed.