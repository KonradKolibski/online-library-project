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

- **User accounts** — register / login module, so a user's library follows them across devices and is backed up to a server.
- **Desktop-first polish** — v1 is already responsive, but a future pass will refine the desktop experience (keyboard shortcuts, denser layouts, multi-column views).
- **Barcode scanning** — let the user scan a book's ISBN barcode with their phone camera; the app looks up the book via an external metadata API (e.g. Google Books, Open Library) and adds it to the library automatically with cover, title, author pre-filled.
- **Reading streaks** — a Duolingo-style streak module that rewards the user for logging reading activity every day. Includes streak counters, daily goals, and visual feedback to encourage consistency.
- *(Likely also worth considering later: import from Goodreads/Amazon, sharing a library publicly, recommendations, multiple bookshelves/collections per user.)*

## Open questions

- Any constraint on tech stack (framework, styling approach) the user wants to lock in before we start the design/implementation phase?
