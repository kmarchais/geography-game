import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {randomUUID,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createRankingServer} from '../../server/ranking.mjs'
const geography=JSON.parse(readFileSync('public/data/globe/regions.json','utf8'))
const catalog=JSON.parse(readFileSync('server/data/regional-catalog.json','utf8'))
async function setup(t) {
 const server=createRankingServer({databasePath:':memory:',countries:['AAA','BBB','CCC'].map(id=>({id,playable:true})),googleClientId:'test',verifyGoogle:async nonce=>({sub:'regional-player',given_name:'Player',nonce})})
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base=`http://127.0.0.1:${server.address().port}`
 const request=(path,body,cookie)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const start=async(mode,cookie)=>{const r=await request('/runs?rules=4&mode='+mode,{ignoreAnswered:true},cookie);assert.equal(r.status,201);return r.json()}
 const finish=async(run,cookie)=>{let result;for(let index=0;index<run.deck.length;index++){const r=await request(`/runs/${run.id}/answers`,{index,attempt:0,guess:run.deck[index],elapsedMs:index},cookie);assert.equal(r.status,200);result=await r.json()}assert.equal(result.complete,true);assert.equal(result.total,run.deck.length);assert.equal(result.score,run.deck.length)}
 return {request,start,finish}
}
test('compact regional server catalogue matches the exact client deck metadata and hash',()=>{
 assert.equal(catalog.dataset,createHash('sha256').update(JSON.stringify(geography)).digest('hex'))
 assert.deepEqual(catalog.countries,geography.map(({id,small,playable,regions})=>({id,small,playable,regions})))
})
test('regional scores use server decks, independent public rankings and one best per player',async t=>{
 const {request,start,finish}=await setup(t),playerId=randomUUID()
 for(const mode of ['americas','europe','africa','asia','oceania']){
  const run=await start(mode);assert.deepEqual(new Set(run.deck),new Set(geography.filter(c=>c.regions.includes(mode)).map(c=>c.id)))
  await finish(run)
  assert.equal((await request(`/runs/${run.id}/publish`,{claimToken:run.claimToken,playerId,name:'Same player'})).status,200)
  const board=await(await request('/leaderboard?rules=4&mode='+mode)).json();assert.equal(board.length,1);assert.equal(board[0].total,run.deck.length);assert.equal(board[0].score,run.deck.length)
 }
 assert.deepEqual(await(await request('/leaderboard?rules=4')).json(),[])
 assert.deepEqual(await(await request('/stats?rules=4')).json(),[])
 const another=await start('americas');await finish(another);await request(`/runs/${another.id}/publish`,{claimToken:another.claimToken,playerId,name:'Same player'})
 assert.equal((await(await request('/leaderboard?rules=4&mode=americas')).json()).length,1)
 const world=await start('world');await finish(world);await request(`/runs/${world.id}/publish`,{claimToken:world.claimToken,playerId,name:'Same player'})
 const worldBoard=await(await request('/leaderboard?rules=4')).json();assert.equal(worldBoard.length,1);assert.equal(worldBoard[0].total,3)
 assert.equal((await(await request('/leaderboard?rules=4&mode=americas')).json())[0].total,59)
 for(const mode of ['explore','bad','__proto__']) assert.equal((await request('/runs?rules=4&mode='+mode,{})).status,400)
 assert.equal((await request('/runs?rules=3&mode=europe',{})).status,400)
})
test('regional claims retain all personal runs, filter account history and keep world statistics unchanged',async t=>{
 const {request,start,finish}=await setup(t)
 const run=await start('oceania');await finish(run)
 const pending=await request('/auth/challenge'),nonce=(await pending.json()).nonce,challenge=pending.headers.get('set-cookie').split(';')[0]
 const login=await request('/auth/google',{credential:nonce},challenge);assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0]
 assert.equal((await request(`/runs/${run.id}/claim`,{claimToken:run.claimToken},cookie)).status,200)
 const next=await start('oceania',cookie);await finish(next,cookie)
 const scores=await(await request('/scores/me?rules=4&mode=oceania',undefined,cookie)).json();assert.equal(scores.length,2);assert.ok(scores.every(s=>s.total===29&&s.correct===29&&s.skipped===0))
 assert.deepEqual(await(await request('/scores/me?rules=4',undefined,cookie)).json(),[])
 assert.deepEqual(await(await request('/scores/me?rules=4&mode=africa',undefined,cookie)).json(),[])
 assert.deepEqual(await(await request('/stats/me?rules=4',undefined,cookie)).json(),[])
 assert.equal((await request('/scores/me?rules=4&mode=oceania')).status,401)
 const board=await(await request('/leaderboard?rules=4&mode=oceania')).json();assert.equal(board.length,1);assert.equal(board[0].id,run.id)
})
