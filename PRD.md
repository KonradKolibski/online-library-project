# PRD — Personal Online Library

## 1. Context

We are building an app for storing books — a personal online library where a user can catalog the books they own or are interested in. Think of it as a private bookshelf the user curates themselves.

We are at the **concept stage**. Nothing is built yet — no code, no infrastructure, no design files. This PRD defines the first version (v1) so we can start shaping the product.

The target audience is individual readers who want a tidy, visual place to keep track of their books, rate them, note what they thought, and find them again later.

## 2. Goal (v1)

The first version is a **responsive web app** (desktop and mobile in one codebase) that lets a single user manage their own book collection locally on their device. No accounts, no cloud sync yet — all data lives in the browser's local storage.

### In scope for v1

**Add a book.** The user can manually add a book entry with the following fields:

- Title *(required)*
- Author *(required)*
- Cover image — upload from device or paste a URL; if none is provided, the app shows a colored placeholder with the book's title rendered on it
- Tags — free-form, user-defined (e.g. `sci-fi`, `re-read`, `gift from mom`)
- Category — one per book, chosen from a predefined starter list (e.g. Fiction, Design, Science fiction, Astrology) that the user can fully customize: add, rename, or remove entries
- Reading progress / status — both: a status (To-read / Reading / Finished) and an optional percentage for books in progress
- Rating — 1 to 10 stars, optional
- Notes / review — free-text field

**Browse the library.** A main view showing the user's books as visual cards (cover + title + author + progress), echoing the reference design.

**Search and filter.** A search bar that matches against title and author, plus filter chips for tags and categories so the user can narrow the view quickly.

**Edit and delete a book.** Standard CRUD on existing entries.

**Local persistence.** All books, tags, categories, and settings are saved to the device's local storage. Closing and reopening the app preserves the library. No login, no server.

### Out of scope for v1

- Accounts, login, multi-device sync
- Sharing libraries with other users
- Barcode scanning
- Streaks / gamification
- Importing from Goodreads, Amazon, etc.

### Success criteria

- A user can add their first book in under 60 seconds.
- A user can find any book in their library in under 10 seconds via search or filter.
- The app is usable and looks good on both a phone (375px wide) and a desktop browser (1440px+).

## 3. References

The visual direction is set by the attached mockup the user provided (two-screen mobile concept: an onboarding screen and a "My books" / "For you" home screen).

Key design cues to carry into v1:

- **Soft, light background** with a subtle pastel gradient feel.
- **Purple as the primary accent color** for CTAs, active filter chips, and progress bars.
- **Card-based book layout** with prominent cover art, title, author, and a progress indicator.
- **Pill-shaped filter chips** for categories/tags (Design, Fiction, Science fiction, Astrology in the reference).
- **Rounded corners and generous whitespace** throughout — friendly, calm, reading-oriented feel.
- **Clean sans-serif typography** with clear hierarchy (large section headers like "My books", "For you").
- **Search bar at the top** of the home view, prominent and always reachable.

The reference is mobile-first, but for v1 we adapt the same visual language to a responsive layout that also works comfortably on desktop (e.g. grid of cards instead of horizontal scroll on wider screens).

## 4. Future steps

Items explicitly out of scope for v1 but planned for later versions:

- **Dashboard / Home screen** — Replace the placeholder Home view with a personalised landing dashboard that summarises the user's reading life at a glance. Pulls together signals from across the rest of the app into one calm, scannable surface — the user lands here and immediately knows where to pick up, what to read next, and how they're tracking against their goals. Likely contents:
  - *Currently reading* — a top carousel of in-progress books with progress bars and a one-tap "I read more" action that opens the same quick-progress slider available in BookDetail.
  - *Up next* — a compact preview of the "to-read" pile, prioritised by what was most recently added or pinned.
  - *Reading goal* — visual progress toward the yearly book goal (set in Profile settings), shown as a ring or pill (e.g. *7 of 24 books read this year*).
  - *Recent activity* — last finished book, last rating, last note — small "what you've been up to" strip.
  - *Streak surface* (once streaks ship) — current streak count and a primary "log today's reading" CTA, so the dashboard becomes the daily entry point that drives retention.
  - *Highlights from stats* — one or two compact figures pulled from the full Stats page (e.g. pages read this month, most-read genre) — teases the deeper view without duplicating it.
  - *Discover hook* (once Discover ships) — one or two suggested books based on the user's history, with a link through to the full Discover module.

  The home view stays visual and non-chart-heavy (charts live in Stats). Same pastel surfaces, soft cards, generous whitespace as the rest of the app.
- **Customizable dashboard widgets** — evolve the Home screen from a fixed layout into a fully personalizable dashboard the user shapes to their own reading habits. Every section (currently reading, weekly strip, reading goal, featured pick, favourite authors, stats highlights, and any future widgets) becomes a self-contained, rearrangeable widget. The user should have an easy, low-friction way to tailor the dashboard — ideally an "Edit dashboard" / customize mode toggled right from Home. Likely capabilities:
  - *Show / hide* any widget so the dashboard only carries what each user cares about.
  - *Reorder* widgets via drag-and-drop, with the layout persisting locally (and later syncing once accounts ship).
  - *Resize / span* — let some widgets go wide or compact within the responsive grid (e.g. a full-width currently-reading carousel vs. a compact stats tile).
  - *Add from a widget gallery* — a picker of available widgets the user can drop onto their dashboard, leaving room to grow the catalogue over time.
  - Sensible defaults so a brand-new user gets a good out-of-the-box layout and only customizes if they want to. The personalized layout is stored in app settings/local storage (schema-versioned like the rest of the data), keeping the same calm pastel design language in both view and edit modes.
- **User accounts** — register / login module, so a user's library follows them across devices and is backed up to a server.
- **Desktop-first polish** — v1 is already responsive, but a future pass will refine the desktop experience (keyboard shortcuts, denser layouts, multi-column views).
- **Barcode scanning** — let the user scan a book's ISBN barcode with their phone camera; the app looks up the book via an external metadata API (e.g. Google Books, Open Library) and adds it to the library automatically with cover, title, author pre-filled.
- **Reading streaks** — a Duolingo-style streak module that rewards the user for logging reading activity every day. Includes streak counters, daily goals, and visual feedback to encourage consistency.
- **User statistics** — a dedicated stats view surfacing reading data through clean, minimalistic data visualizations:
  - *Progress bars* for overall library breakdown (books read vs. in-progress vs. to-read, pages/percentage completed per book).
  - *Bar and line charts* for reading pace over time (books finished per month, pages read per week).
  - *Category and tag distribution* shown as a minimal bar chart or proportional chip cloud.
  - *Rating distribution* as a compact histogram (how many books per star tier).
  - *Personal milestones* — books read this year, average rating, most-read author, etc.
  - All visuals follow the same pastel purple design language as the rest of the app: thin lines, soft fills, no chartjunk.
- **Custom shelves / collections.** Users will be able to organize their library into named shelves — personal collections like "Favourites", "Reading list", "Lent out", "Coffee table books", or any label they invent. Each book can belong to one or more shelves. Shelves appear as a dedicated section in the sidebar/navigation, and clicking one filters the main view to only books on that shelf. Users can create, rename, and delete shelves freely. This is intentionally distinct from categories (which describe what a book *is*) and tags (which are loose keywords) — a shelf is a curated, user-managed grouping that reflects *how the user relates to the book*.
- *(Likely also worth considering later: import from Goodreads/Amazon, sharing a library publicly, recommendations.)*

## 5. Future-future ideas (loose notes — not committed)

These are rougher, more ambitious directions. They aren't decisions yet — just things to keep on the radar. Not all of them will necessarily make it into the product.

- **FOMO-driven engagement loop, Duolingo-style.** The app's emotional core could lean on the same pull mechanics Duolingo uses — daily nudges, streak anxiety, "don't break the chain" feedback. The whole UX would be tuned around bringing the user back every day.
- **Rich daily reading check-in.** Streaks for every day of reading. When the user marks a day as "read," they log:
  - Which book they read.
  - How they felt while reading it (happy, moved, motivated, etc.).
  - The page they stopped on.
  - How long they read for.
  All of this captured through icons and interactive elements rather than plain form fields.
- **Milestone summaries with delight.** When a user finishes a book or hits a milestone (7-day streak, 30-day streak, etc.), show a celebratory summary with simple charts: emotional arc across the read, average pages per day, average time per page, etc. Presented with vector illustrations, smooth animations, and micro-interactions — designed to trigger a dopamine/endorphin hit. No complicated charts; everything stays clean and stylized.
- **Haptic feedback** throughout the app, similar to Duolingo, to make every interaction feel tactile and satisfying.
- **Mascot.** Consider building a Duolingo-style mascot for the app — in our case maybe a **capybara**. Used across the app's surfaces (empty states, milestones, nudges, streak screens). Ideally a low-poly 3D look with subtle animations.
- **Optional quote capture in the daily check-in.** When the user logs a reading day (alongside mood, pages read, time, etc.), give them an optional field to save **quotes from the book** — the quote text plus the page number. Builds up a personal "commonplace book" inside the app over time.
- **Series-themed mascot variants + unlockable skins.** Later, once the capybara mascot exists, tie its appearance to popular series the user is actively reading. For example, while reading Harry Potter the default glasses-and-book capybara is swapped for a wizard-hat-and-wand capybara. These themed variants are auto-activated based on the book currently in progress. A natural extension: **unlock these skins permanently** as rewards — finish the whole Harry Potter series and you keep the wizard capybara as a selectable skin in settings. Once unlocked, the user can set it as their default, and every surface in the app that shows the mascot uses that skin instead of the standard one.
- **"Discover" module — bubble-tree mood search.** Replace the standard search experience with an animated bubble interface. The top level shows mood/intent bubbles like *"I want a tear-jerker," "I want to get motivated," "I want a laugh," "I want to be scared," "I want an epic journey."* Tapping one zooms into that bubble — the others fade away — and new sub-category bubbles fly in around it ("exercise," "success," "business," "life," "love," etc.). Based on the path the user clicks through, the app then surfaces book recommendations as **full-screen swipeable cards à la Tinder**: swipe right to add to "Want to read," swipe left to dismiss. Over time, the recommendation engine learns from the user's past mood logs — which books actually scared them, made them happy, motivated them — and personalizes the suggestions accordingly.

## Open questions

- Any constraint on tech stack (framework, styling approach) the user wants to lock in before we start the design/implementation phase?
