# Prediction System Rules

Predictions are dataset driven.

NOT machine learning.

Use scoring algorithm.

---

## Prediction Factors

Recent form:
Last 5 matches.

Head to head:
Win ratio.

Venue performance:
Team record at stadium.

Player strength:
Top players performance.

Optional:

Toss impact.

---

## Output

Win probability:

Example:

RCB 58%
CSK 42%

Also generate tip:

Example:

RCB has better recent form.
RCB strong at this venue.
CSK weak bowling recently.

Prediction:

RCB likely win.

---

## Code Rules

Prediction must be deterministic.

Same input → same output.

No random predictions.

---

## File

predictionEngine.ts

Must export:

getPrediction(matchData)

Output:

probability
team scores
reasoning