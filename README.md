# WORDLE — the 12-letter challenge

A complete, dependency-free static game: 12 letters, 5 attempts, any A–Z combination. Two-pass Wordle feedback handles repeated letters; keyboard colours keep their strongest result. Both physical and on-screen keyboards work. Sequential flips, typing pops, incomplete-row shakes and victory bounces respect reduced-motion preferences. The completed grid stays visible with no restart, hint or loss answer reveal.

## Run locally

Open `index.html` in your browser for a quick look. For reliable localStorage behaviour, serve the folder over HTTP instead (requires Python 3):

```sh
cd /Users/rsn/Documents/GitHub/gordle
python3 -m http.server 8000
```

Visit **http://localhost:8000**. Stop the server with Ctrl+C. No install or build is needed. Use the same browser and URL to resume your progress.

## Change the secret

Edit **line 2 of `config.js`**:

```js
const SECRET_WORD = "ABCDEFGHIJKL";
```

Replace only the quoted value with exactly 12 uppercase A–Z letters. Spaces, punctuation, lowercase and other lengths are rejected during initialization. Leave `MAX_ATTEMPTS = 5` for this challenge.

An answer-derived save namespace automatically gives a changed answer a fresh game. You can also change `GAME_VERSION` on line 5 to start a new test/challenge with the same answer. Old saves remain stored separately. Restore the previous configuration to resume its previous save. Choose the final secret/version **before** sharing the link; changing them afterwards starts a different challenge for returning players.

## Free hosting and sharing: GitHub Pages

1. Sign into a free GitHub account and create a **public** repository (or use this repository if it is already public).
2. Upload `index.html`, `style.css`, `config.js`, and `script.js` into its root. README and tests may be included. Commit the files to `main`.
3. Open the repository’s **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for deployment to complete. Settings → Pages will show the actual public URL, typically `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
6. Open that URL, verify the final configuration in a separate test browser, then copy the link into your message to your friend. Each browser has its own progress.

No domain purchase, backend, API, database, build service or subscription is required. GitHub Free supports Pages from public repositories. The source, including the answer, is public. GitHub applies hosting quotas (including site size and bandwidth limits); this tiny private-use challenge should be far below them. Consult the current official [Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), and [hosting limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). No public deployment has been performed as part of this local delivery.

## Progress and limitations

Every edit saves the unfinished guess. Submissions save guesses, feedback, attempts used, win/loss and finished status before reveal animations run. Reloading mid-animation restores the committed row. Derived fields are recomputed when loading to keep the state consistent.

- localStorage is local to a browser, profile and site origin. Clearing data, incognito, switching browsers/devices or changing the URL origin can allow a new game. This is not tamper-proof or globally enforced one-time play.
- If storage is blocked or full, the game continues and displays a persistence warning. Keep that page open.
- The answer is accessible in `config.js` and source inspection. Its save namespace is not encryption. It is never logged or placed in HTML/data attributes, and is never revealed by the normal loss interface.
- Hosting provides a public link, not authenticated private access. Anyone with the link can play.
- No analytics, third-party fonts, network requests or cookies are added by the game. The hosting provider may keep normal access logs.
- Scoring is isolated in `scoreGuess`; a future server could replace client-side evaluation, but secure answer hiding and cross-device attempt enforcement require backend work.

## Verification

With Node.js installed, run the optional development tests (Node is not needed to play or host):

```sh
node --check script.js
node --check config.js
node --test tests/game.test.cjs
```

**Actually performed:** both syntax checks and 12 passing automated tests using a small DOM/storage test double. Coverage includes two-pass repeated-letter scoring, exact 12-letter cap, invalid characters, incomplete submission without consuming attempts, Backspace, nonsense guesses, wins on each attempt 1–5, five-guess loss, sixth-attempt lockout, unfinished/completed save restoration, on-screen button handlers, physical key handlers, green priority, input lock during reveal, mid-reveal restoration, changed-answer saves, invalid config and unavailable storage. The loss test checks the message and retained incorrect grid without an answer reveal.

**Still needs manual browser verification:** the browser access host was unavailable, so these are not claimed as browser-tested. In current Chrome, Safari, Firefox and Edge:

1. Test at 320, 375, 390, 768 and 1280px widths. Confirm all 12 square tiles fit without horizontal scrolling and letters remain legible. Check landscape and browser zoom.
2. Type and tap keys, submit incomplete rows, backspace, and press Enter. Confirm flips and input lock throughout the reveal.
3. Win and lose using a temporary version. Reload mid-guess, mid-flip and after each result; close/reopen the tab. Verify the completed result remains and there is no restart or sixth attempt.
4. Check help dialog opening, Escape/close, keyboard focus, screen-reader row descriptions, and reduced-motion OS settings.
5. Test the final hosted link on an actual phone before sharing. Use a separate browser/profile for testing so your friend’s progress remains independent.

For repeated-letter manual testing, temporarily configure `AABBBBBBBBBB`; `BAAAAAAAAAAA` must have one green, two yellows and nine greys. Restore your chosen answer and version before sharing.
