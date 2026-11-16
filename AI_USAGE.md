# AI Usage

## Approaching and Breaking Down an Unfamiliar Problem

Before writing any code I ran `/grill-me` — a structured interrogation across 8 design dimensions: service topology, schema, overlap enforcement, API contract, serializer design, seed strategy, frontend architecture, test harness. For each question I evaluated the options, asked follow-up questions when I disagreed with the recommendation, and pushed for the production-grade answer over the safer scoped one.

Then, I worked in the order: schema → tests (define done) → serializers → views → frontend. After each feature, I did a cleanup pass for redundant code, then commit.

---

## How I Used AI Tools Effectively While Maintaining Ownership

I made sure I was the Lead Architect and Authority, dictating all system schemas, architectural decisions, temporal logic, and final approvals. The AI agent on the other hand, was assiged the role of The Implementing Senior Contractor, executing code scaffolding, surgical edits, and test runs. It was strictly bound by the Inviolable Laws in the harness in `AGENTS.md`.

The harness in `AGENTS.md` was written before any implementation, encoding all architectural laws as binding constraints, not guidelines. This meant I didn't need to re-explain my requirements on every prompt and the agent was bound by the document it had read.

I used ChatGPT and multiple AI models through Antigravity CLI throughout the project, switching based on task complexity and quota limits.

---

## AI Tools Used and What I Used Them For

**Claude Opus 4.6 (Thinking)** — I used this in the beginning for the deep design reasoning through the `/grill-me` command. It was selected for its reasoning depth on architectural questions. I used it sparingly because of the quota limits.

**Claude Sonnet 4.6 (Thinking)** — I used this selectively for the complex implementation and debugging work as well as the final project audit. 

**Gemini 3.8 Flash (High)** — I used this to conversationally think through technical decisions and the pros and cons of the choices available to me, fast iteration on feedback, lighter bug fixing, documentation, and as a general default fallback model.

**ChatGPT (separate session)** — I used this minimally, also to conversationally think through decisions and the project approach.

---

## How I Verified the Implementation

**Backend tests.** I ran the full backend test suite with:

```bash
docker compose exec -T backend python manage.py test --verbosity=2
```

The 14 `BookingBusinessRuleTests` cover overlapping and duplicate bookings, adjacent time slots, cancellation, past bookings, duration limits, 15-minute alignment, repeated cancellation, and status filtering. The six `RoomApiTests` cover room ordering, search, capacity filtering, invalid capacity values, retrieving a room by ID, and 404 responses. The `BookingConcurrencyTests` use three concurrent requests and verify that exactly one succeeds with `201 Created` while the other two receive `409 Conflict`.

**Frontend build.** I ran the frontend build with:

```bash
cd frontend && npm run build
```

**Hands-on testing.** I ran the application and tested its user flows, also using Chrome DevTools.

**Concurrency verification.** The concurrency test checks the exact response counts:

```python
self.assertEqual(results.count(status.HTTP_201_CREATED), 1)
self.assertEqual(results.count(status.HTTP_409_CONFLICT), 2)
```

This assertion makes the test fail if concurrent requests don’t produce exactly one successful booking and two conflicts.

---

## A Few Representative Prompts

**After running the app myself and finding 4 UX issues:**

> *"look at these comments from me running the project myself and trying it out: 1. need a button to go back to seeing all meetings in all rooms without refreshing after clicking a room. 2. error that only says http 400 in frontend for booking start in the past is not user friendly enough. 3. new meeting added wont show until refresh, not user friendly. 4. consider the case where a person books in one timezone then later opens the application in another timezone later. the project must reflect the accurate situation."*

Here I made a few comments after running the app myself. I prefer to not be too granular if it's not necessary such as for the error 400 for booking start in the past. If I suggested an error message myself, it may not have been optimal.

---

**Detailed UX critique of the day schedule view:**

> *"the day schedule view feature is not very user-friendly. the size of the blocks could be larger. two consecutive meetings by different people should have different colors. on hover, it should show the time at that point in the blocks. the heading with the time should not display '8a' or '9a' and instead should display something more user-friendly. i also want the users to be able to drag to select a time slot of their required duration as is the case in google calendar."*

Here I thought the prompt could benefit from distinct instructions instead of holding back the granularity. I also thought the Google Calendar reference could point it in the right direction.

---

**Diagnosing the timezone displacement bug by describing the exact symptom:**

> *"if i change my timezone to los angeles, it is not taking me to where the meetings are scheduled but rather the same time start as in the previously selected timezone. what do you understand from this?"*

The phrasing "what do you understand from this?" was deliberate to allow me to confirm a hypothesis I had to prevent me directing a fix where our understanding of the situation differed.

---

**Ensuring code quality after each feature, not just at the end:**

> *"please go through the flow of this cancel feature and ensure there is no redundant code or any code that requires cleaning up and revise accordingly."*

After every significant feature, I did a cleanup pass before commit.

---

## A Suggestion I Accepted

### Topic: Handling Cancelled Bookings

I encountered the question of how cancelled meetings should be treated. The AI suggested "soft cancellation" via status = 'cancelled' in the database to preserve records in PostgreSQL while freeing the slot via the database exclusion condition. As for the frontend, I didn't like cancelled meetings being visible the active schedule in the frontend. I suggested a few options and asked for more. I try not to signal the option I prefer and ask open-ended questions in order to reduce the risk of sycophantic answers. After the comparative analysis, I understood the drawbacks of each and chose to hide the cancelled meetings by default under a toggle to keep it easily accessible but not at the forefront. I rejected the separate tab for cancelled bookings because moving away from the main list would make them harder to access when needed. I also rejected the option to not show in the frontend at all. My principle was to show the most important information by default while keeping the full information available on request.

---

## A Suggestion I Modified

### Topic: Timezone Dropdown UX and Offset Resolution

When adding timezone support, the AI initially presented an long unwieldy dropdown containing all 421 IANA timezone identifiers. When I rejected that, it gave me a list of a select top cities in the world, which I was not satisfied with because it lacked coverage of the entire world. It then attempted a regional city grouping that was confusing and geographically inaccurate (Cairo was classified under Eastern Europe). 421 timezones did not make sense to me, so I googled and found out there are 38 canonical UTC offset timezones in use and the 421 timezone identifiers is a computer history related relic. I accepted the grouping approach, but with the timezones I suggested and alias searching.

---


## A Suggestion I Rejected

### Topic: Overlap Enforcement Strategy (Application-Level Shortcut vs. PostgreSQL Exclusion Constraint)

During the `/grill-me` session, the AI recommended taking a shortcut: enforcing booking overlap checks solely in Django Python code and skipping database constraints so that the code would run without Docker on SQLite. I rejected this shortcut because I wanted to build a production-grade system. Real-world systems should enforce defense-in-depth: the application handles user-friendly HTTP 409 responses, and the database engine enforces a PostgreSQL `ExclusionConstraint` using `tstzrange` to prevent race conditions.

---

## An Example Where AI Provided an Incorrect or Incomplete Solution

**The 15-Minute Boundary / "11:03 AM" Form Snapping Bug**

The backend serializer validates that booking start and end times must be aligned to 15-minute marks (`:00`, `:15`, `:30`, `:45`). Any other minute returns an HTTP 400 error.

In the frontend booking modal, the AI set `step="900"` (15 minutes in seconds) on the datetime input, but it initialized the form's default start time with `new Date()` (the raw current system clock).

It was broken because HTML5 `<input type="datetime-local">` calculates its 15-minute step intervals starting from whatever initial value or `min` timestamp it is given. Because the initial time wasn't rounded, the browser anchored the 15-minute intervals to the current minute.

I identified it by tested opening the booking modal at an unaligned time (such as 11:03 PM) and saw that the time picker gave me intervals of `:03`, `:18`, `:33`, and `:48`. If a user selected any of those and clicked Book, the backend failed with an HTTP 400 error because the frontend was offering times that violated its own backend rules.

My prompt to the AI described what the user would notice, and did not suggest a direction to explore in case it is not the right direction. It was able to debug it and it started working as intended, with the start time automatically rounding up to the nearest quarter-hour, displaying only 00, 15, 30, 45 in the minute picker and defaulting the end time so that every modal opens with valid, compliant values.

---

## Explanation of the Major Technical Decisions and Implementation Details

### Half-open booking intervals

I use `[start, end)` intervals: the start is included and the end is excluded. Two bookings overlap if `S1 < E2 && E1 > S2`. Adjacent meetings share a boundary point, but they don’t overlap. The ORM query and PostgreSQL exclusion constraint use the same rule.

```python
start_time__lt=end_time,
end_time__gt=start_time,
```

### Concurrent booking protection

A check-then-insert can let two simultaneous requests book the same slot. I use `transaction.atomic()` and `select_for_update()` to lock the room, then check for overlaps again before inserting. The PostgreSQL exclusion constraint adds a second layer of protection.

### Booking serializer

The serializer accepts a room ID when creating a booking and returns nested room details when reading one. I used `to_representation()` so one serializer handles both shapes.

### UTC storage and timezone display

I store and send datetimes in UTC, then display them in the selected timezone. A booking made in Karachi should display correctly for someone viewing it in Los Angeles. This keeps the server-side comparisons consistent and puts timezone display logic in the frontend.
