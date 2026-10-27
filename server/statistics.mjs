// Global totals contain no player identity. Account totals are private to /stats/me.
export function createCountryStatistics(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS country_stats (
    scope TEXT NOT NULL, country TEXT NOT NULL, played INTEGER NOT NULL, found INTEGER NOT NULL,
    skipped INTEGER NOT NULL, PRIMARY KEY(scope,country)) WITHOUT ROWID`)
  const increment = (scope, country, found, skipped) => db.prepare(`INSERT INTO country_stats VALUES(?,?,1,?,?)
    ON CONFLICT(scope,country) DO UPDATE SET played=played+1,found=found+excluded.found,skipped=skipped+excluded.skipped`).run(scope, country, Number(found), Number(skipped))
  function record(player, country, found, skipped) {
    increment('global', country, found, skipped)
    if (player.startsWith('google:')) {increment(player, country, found, skipped)}
  }
  function claim(player, state) {
    if (state.version !== 3) {return}
    state.answers.forEach((answer, index) => increment(player, state.deck[index], answer.guess === state.deck[index], answer.guess === null))
  }
  return { record, claim, read: scope => db.prepare('SELECT country AS id,played,found,skipped FROM country_stats WHERE scope=? ORDER BY country').all(scope) }
}
