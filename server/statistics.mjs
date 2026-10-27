// Global totals contain no player identity. Account totals are private to /stats/me.
export function createCountryStatistics(db, transaction) {
  db.exec(`CREATE TABLE IF NOT EXISTS country_stats (
    scope TEXT NOT NULL, country TEXT NOT NULL, played INTEGER NOT NULL, found INTEGER NOT NULL,
    skipped INTEGER NOT NULL, PRIMARY KEY(scope,country)) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS country_attempt_stats (
    scope TEXT NOT NULL, country TEXT NOT NULL, green INTEGER NOT NULL, yellow INTEGER NOT NULL,
    orange INTEGER NOT NULL, red INTEGER NOT NULL, skipped INTEGER NOT NULL, PRIMARY KEY(scope,country)) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS atlas_migrations (id TEXT PRIMARY KEY)`)
  const increment = (scope, country, found, skipped) => db.prepare(`INSERT INTO country_stats VALUES(?,?,1,?,?)
    ON CONFLICT(scope,country) DO UPDATE SET played=played+1,found=found+excluded.found,skipped=skipped+excluded.skipped`).run(scope, country, Number(found), Number(skipped))
  const incrementAttempts = (scope, country, found, skipped, attempt) => db.prepare(`INSERT INTO country_attempt_stats VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(scope,country) DO UPDATE SET green=green+excluded.green,yellow=yellow+excluded.yellow,
    orange=orange+excluded.orange,red=red+excluded.red,skipped=skipped+excluded.skipped`).run(scope, country, Number(found && attempt === 1), Number(found && attempt === 2), Number(found && attempt === 3), Number(!found), Number(skipped))
  // Reconstruct only known attempts. Legacy found counters cannot tell first from third.
  transaction(() => {
    if (db.prepare('SELECT id FROM atlas_migrations WHERE id=?').get('attempt-counters-v4')) {return}
    for (const run of db.prepare("SELECT player,state FROM runs WHERE json_extract(state,'$.version') IN (3,4)").all()) {
      const state = JSON.parse(run.state)
      state.answers.forEach((answer, index) => {
        if (!answer.guesses?.length) {return}
        const found = answer.guess === state.deck[index], skipped = answer.guess === null
        incrementAttempts('global', state.deck[index], found, skipped, answer.guesses.length)
        if (run.player.startsWith('google:')) {incrementAttempts(run.player, state.deck[index], found, skipped, answer.guesses.length)}
      })
    }
    db.prepare('INSERT INTO atlas_migrations VALUES(?)').run('attempt-counters-v4')
  })
  function record(player, country, found, skipped, attempt) {
    increment('global', country, found, skipped)
    incrementAttempts('global', country, found, skipped, attempt)
    if (player.startsWith('google:')) {increment(player, country, found, skipped); incrementAttempts(player, country, found, skipped, attempt)}
  }
  function claim(player, state) {
    if (![3, 4].includes(state.version)) {return}
    state.answers.forEach((answer, index) => {
      const found = answer.guess === state.deck[index], skipped = answer.guess === null
      increment(player, state.deck[index], found, skipped)
      incrementAttempts(player, state.deck[index], found, skipped, answer.guesses.length)
    })
  }
  return { record, claim, read: (scope, version = 3) => version === 4
    ? db.prepare('SELECT country AS id,green+yellow+orange+red AS played,green+yellow+orange AS found,skipped,green,yellow,orange,red FROM country_attempt_stats WHERE scope=? ORDER BY country').all(scope)
    : db.prepare('SELECT country AS id,played,found,skipped FROM country_stats WHERE scope=? ORDER BY country').all(scope) }
}
