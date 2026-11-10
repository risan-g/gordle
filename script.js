/* Pure scoring stays separate from the interface for easy verification. */
function scoreGuess(guess, answer) {
  const feedback = Array(12).fill('absent');
  const remaining = {};
  for (let i = 0; i < 12; i++) {
    if (guess[i] === answer[i]) feedback[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 12; i++) {
    if (feedback[i] !== 'correct' && remaining[guess[i]] > 0) {
      feedback[i] = 'present';
      remaining[guess[i]]--;
    }
  }
  return feedback;
}

(() => {
  const board = document.querySelector('#board');
  const keyboard = document.querySelector('#keyboard');
  const announcement = document.querySelector('#announcement');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false;
  let toastTimer;
  const notify = message => {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  };
  if (typeof SECRET_WORD !== 'string' || !/^[A-Z]{12}$/.test(SECRET_WORD) || MAX_ATTEMPTS !== 5 || typeof GAME_VERSION !== 'string') {
    document.querySelector('#guidance').textContent = 'Challenge unavailable. Please check the game configuration.';
    document.querySelector('#attempt').textContent = 'CONFIGURATION ERROR';
    return;
  }
  // Answer-derived suffix automatically separates saves when the one-line answer changes.
  // This is only a namespace, not encryption or protection from source inspection.
  let fingerprint = 2166136261;
  for (const letter of SECRET_WORD) fingerprint = Math.imul(fingerprint ^ letter.charCodeAt(0), 16777619) >>> 0;
  const storageKey = `long-wordle:${GAME_VERSION}:${fingerprint.toString(16)}`;
  let state = { guesses: [], feedback: [], current: '', attemptsUsed: 0, won: false, lost: false, finished: false };
  const storageWarning = () => { document.querySelector('#storage-warning').hidden = false; };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.guesses) && saved.guesses.length <= MAX_ATTEMPTS && saved.guesses.every(g => typeof g === 'string' && /^[A-Z]{12}$/.test(g)) && typeof saved.current === 'string' && /^[A-Z]{0,12}$/.test(saved.current)) {
      // Recompute derived fields; malformed or stale feedback must never change the rules.
      const firstWin = saved.guesses.indexOf(SECRET_WORD);
      state.guesses = firstWin < 0 ? saved.guesses : saved.guesses.slice(0, firstWin + 1);
      state.feedback = state.guesses.map(g => scoreGuess(g, SECRET_WORD));
      state.attemptsUsed = state.guesses.length;
      state.won = firstWin >= 0;
      state.lost = !state.won && state.attemptsUsed === MAX_ATTEMPTS;
      state.finished = state.won || state.lost;
      state.current = state.finished ? '' : saved.current;
    }
  } catch { storageWarning(); }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { storageWarning(); }
  }
  const rows = [];
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', `Attempt ${r + 1}, empty`);
    for (let c = 0; c < 12; c++) {
      const tile = document.createElement('span');
      tile.className = 'tile';
      tile.setAttribute('aria-hidden', 'true');
      row.append(tile);
    }
    rows.push(row);
    board.append(row);
  }
  const keys = {};
  for (const letters of ['QWERTYUIOP', 'ASDFGHJKL', 'ENTER ZXCVBNM BACKSPACE']) {
    const row = document.createElement('div');
    row.className = 'key-row';
    const values = letters.includes(' ') ? ['ENTER', ...'ZXCVBNM', 'BACKSPACE'] : [...letters];
    for (const value of values) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = `key${value.length > 1 ? ' wide' : ''}`;
      key.textContent = value === 'BACKSPACE' ? '⌫' : value;
      key.setAttribute('aria-label', value === 'BACKSPACE' ? 'Backspace' : value === 'ENTER' ? 'Enter guess' : value);
      key.addEventListener('click', () => input(value));
      keys[value] = key;
      row.append(key);
    }
    keyboard.append(row);
  }
  function describeRow(index) {
    const guess = state.guesses[index];
    rows[index].setAttribute('aria-label', guess ? `Attempt ${index + 1}: ${[...guess].map((letter, i) => `${letter}, ${state.feedback[index][i] === 'correct' ? 'right spot' : state.feedback[index][i] === 'present' ? 'wrong spot' : 'not available'}`).join('; ')}` : `Attempt ${index + 1}: ${state.current || 'empty'}`);
  }
  function paintCurrent() {
    if (state.finished) return;
    const row = rows[state.attemptsUsed];
    [...row.children].forEach((tile, i) => {
      tile.textContent = state.current[i] || '';
      tile.className = `tile${state.current[i] ? ' filled' : ''}`;
    });
    describeRow(state.attemptsUsed);
  }
  function paintKeys() {
    const rank = { absent: 1, present: 2, correct: 3 };
    const best = {};
    state.guesses.forEach((guess, r) => [...guess].forEach((letter, c) => {
      const colour = state.feedback[r][c];
      if (!best[letter] || rank[colour] > rank[best[letter]]) best[letter] = colour;
    }));
    for (const [letter, colour] of Object.entries(best)) {
      keys[letter].className = `key ${colour}`;
      keys[letter].setAttribute('aria-label', `${letter}: ${colour === 'correct' ? 'right spot' : colour === 'present' ? 'wrong spot' : 'not available'}`);
    }
  }
  function paintStatus() {
    document.querySelector('#attempt').textContent = state.finished ? `COMPLETE · ${state.attemptsUsed} OF 5` : `ATTEMPT ${state.attemptsUsed + 1} OF 5`;
    if (!state.finished) return;
    document.querySelector('#result').hidden = false;
    document.querySelector('#result-title').textContent = state.won ? 'IMPRESSIVE! YOU GOT IT!' : 'GAME OVER';
    document.querySelector('#result-detail').textContent = state.won ? `You solved it in ${state.attemptsUsed} ${state.attemptsUsed === 1 ? 'attempt' : 'attempts'}. Beautifully done.` : "You've used all 5 attempts.";
    document.querySelector('#guidance').hidden = true;
    Object.values(keys).forEach(key => { key.disabled = true; });
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function submit() {
    if (state.current.length !== 12) {
      notify('Not enough letters');
      const row = rows[state.attemptsUsed];
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
      return;
    }
    busy = true;
    keyboard.setAttribute('aria-busy', 'true');
    const index = state.attemptsUsed;
    const guess = state.current;
    const feedback = scoreGuess(guess, SECRET_WORD);
    state.guesses.push(guess);
    state.feedback.push(feedback);
    state.current = '';
    state.attemptsUsed++;
    state.won = guess === SECRET_WORD;
    state.lost = !state.won && state.attemptsUsed === MAX_ATTEMPTS;
    state.finished = state.won || state.lost;
    // Commit before animation so a mid-flip refresh restores a complete submission.
    save();
    await Promise.all([...rows[index].children].map(async (tile, i) => {
      if (!reducedMotion.matches) {
        await delay(i * 55);
        tile.className = 'tile filled flip';
        await delay(280);
      }
      tile.className = `tile ${feedback[i]}${reducedMotion.matches ? '' : ' unflip'}`;
      if (!reducedMotion.matches) await delay(280);
      tile.className = `tile ${feedback[i]}`;
    }));
    describeRow(index);
    paintKeys();
    paintStatus();
    announcement.textContent = rows[index].getAttribute('aria-label');
    if (state.won && !reducedMotion.matches) {
      [...rows[index].children].forEach((tile, i) => {
        tile.style.animationDelay = `${i * 35}ms`;
        tile.classList.add('bounce');
      });
    }
    busy = false;
    keyboard.removeAttribute('aria-busy');
    paintCurrent();
  }
  function input(key) {
    if (busy || state.finished || document.querySelector('#instructions').open) return;
    if (key === 'ENTER') { void submit(); return; }
    if (key === 'BACKSPACE') state.current = state.current.slice(0, -1);
    else if (/^[A-Z]$/.test(key) && state.current.length < 12) state.current += key;
    else return;
    paintCurrent();
    if (key !== 'BACKSPACE') rows[state.attemptsUsed].children[state.current.length - 1].classList.add('pop');
    save();
  }
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || document.querySelector('#instructions').open) return;
    // Keep help controls accessible; game keys still submit on physical Enter.
    if (event.key === 'Enter' && ['help', 'close-help'].includes(event.target.id)) return;
    if (/^[a-zA-Z]$/.test(event.key) || ['Enter', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      input(event.key.toUpperCase());
    }
  });
  document.querySelector('#help').addEventListener('click', () => document.querySelector('#instructions').showModal());
  document.querySelector('#close-help').addEventListener('click', () => document.querySelector('#instructions').close());
  state.guesses.forEach((guess, r) => {
    [...rows[r].children].forEach((tile, c) => { tile.textContent = guess[c]; tile.className = `tile ${state.feedback[r][c]}`; });
    describeRow(r);
  });
  paintCurrent();
  paintKeys();
  paintStatus();
  save();
})();
