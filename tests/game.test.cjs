// Dependency-free behavioural tests with a small DOM test double.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('script.js', 'utf8');
class Element {
  constructor() { this.children=[]; this.listeners={}; this.attrs={}; this.style={}; this.className=''; this.textContent=''; this.hidden=false; this.open=false; this.disabled=false; this.classList={add:(v)=>{this.className+=' '+v;},remove:(v)=>{this.className=this.className.split(' ').filter(x=>x!==v).join(' ');}}; }
  append(el){this.children.push(el);}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,v){this.listeners[k]=v;}
  showModal(){this.open=true;}
  close(){this.open=false;}
}
function boot({answer='ABCDEFGHIJKL',store=new Map(),motion=false,brokenStorage=false}={}) {
  const els={}; const handlers={}; const timers=[];
  const document={querySelector:s=>els[s] ||= new Element(),createElement:()=>new Element(),addEventListener:(k,v)=>handlers[k]=v};
  const context=vm.createContext({document,SECRET_WORD:answer,MAX_ATTEMPTS:5,GAME_VERSION:'test',matchMedia:()=>({matches:!motion}),HTMLButtonElement:Element,localStorage:{getItem:k=>{if(brokenStorage)throw Error();return store.get(k)||null;},setItem:(k,v)=>{if(brokenStorage)throw Error();store.set(k,v);}},setTimeout:(fn,ms)=>{if(ms===2200)return 1;if(motion){timers.push(fn);return 1;}queueMicrotask(fn);return 1;},clearTimeout:()=>{}});
  vm.runInContext(source,context);
  const key=k=>handlers.keydown({key:k,preventDefault(){},target:{}});
  const type=s=>[...s].forEach(key);
  const click=k=>{const button=els['#keyboard'].children.flatMap(r=>r.children).find(e=>e.attrs['aria-label']===k);button.listeners.click();};
  const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  return {els,store,key,type,click,settle,context,timers,state:()=>JSON.parse([...store.values()][0])};
}
test('two-pass duplicate scoring and exact matches',()=>{
 const g=boot();
 assert.equal(vm.runInContext("scoreGuess('AAAAAAAAAAAA','AABBBBBBBBBB').filter(x=>x==='correct').length",g.context),2);
 assert.equal(vm.runInContext("scoreGuess('BAAAAAAAAAAA','AABBBBBBBBBB').filter(x=>x==='present').length",g.context),2);
 assert.equal(vm.runInContext("scoreGuess('BAAAAAAAAAAA','AABBBBBBBBBB').filter(x=>x==='absent').length",g.context),9);
});
test('physical input, incomplete notification, delete, cap and nonsense accepted',async()=>{
 const g=boot();g.type('ABC123!');g.key('Enter');assert.equal(g.els['#toast'].textContent,'Not enough letters');assert.equal(g.state().attemptsUsed,0);
 g.key('Backspace');assert.equal(g.state().current,'AB');g.type('ZZZZZZZZZZZZZZZ');assert.equal(g.state().current.length,12);
 g.key('Enter');await g.settle();assert.equal(g.state().attemptsUsed,1);assert.equal(g.state().finished,false);
});
for(let attempt=1;attempt<=5;attempt++)test(`win on attempt ${attempt}; restore and lock`,async()=>{
 let g=boot();for(let i=1;i<attempt;i++){g.type('ZZZZZZZZZZZZ');g.key('Enter');await g.settle();}
 g.type('ABCDEFGHIJKL');g.key('Enter');await g.settle();assert.equal(g.state().won,true);assert.equal(g.state().attemptsUsed,attempt);
 g=boot({store:g.store});assert.equal(g.els['#result-title'].textContent,'IMPRESSIVE! YOU GOT IT!');g.type('ZZZ');g.key('Enter');assert.equal(g.state().attemptsUsed,attempt);assert.equal(g.state().current,'');
});
test('loss after five, sixth blocked, no answer reveal, restored loss',async()=>{
 let g=boot();for(let i=0;i<5;i++){g.type('ZZZZZZZZZZZZ');g.key('Enter');await g.settle();}
 assert.equal(g.state().lost,true);g.type('ABCDEFGHIJKL');g.key('Enter');assert.equal(g.state().attemptsUsed,5);
 g=boot({store:g.store});assert.equal(g.els['#result-title'].textContent,'GAME OVER');assert.equal(g.els['#result-detail'].textContent,"You've used all 5 attempts.");
 assert.ok(Object.values(g.els).every(e=>!e.textContent.includes('ABCDEFGHIJKL')));assert.equal(g.els['#board'].children[4].children[0].textContent,'Z');
});
test('unfinished progress and submitted feedback restored',async()=>{
 let g=boot();g.type('ZZZZZZZZZZZZ');g.key('Enter');await g.settle();g.type('ABCD');g=boot({store:g.store});assert.equal(g.state().current,'ABCD');assert.equal(g.state().attemptsUsed,1);assert.equal(g.els['#board'].children[1].children[3].textContent,'D');
});
test('on-screen keys and green priority',async()=>{
 const g=boot();g.click('A');g.click('Backspace');assert.equal(g.state().current,'');g.click('A');g.type('ZZZZZZZZZZZZZZ');g.click('Enter guess');await g.settle();g.type('BAZZZZZZZZZZ');g.key('Enter');await g.settle();
 const a=g.els['#keyboard'].children.flatMap(r=>r.children).find(e=>e.textContent==='A');assert.ok(a.className.includes('correct'));
});
test('animation blocks input and refresh during reveal retains submission',()=>{
 const g=boot({motion:true});g.type('ZZZZZZZZZZZZ');g.key('Enter');g.type('ABC');assert.equal(g.state().current,'');assert.equal(g.state().attemptsUsed,1);const reload=boot({store:g.store});assert.equal(reload.state().attemptsUsed,1);
});
test('changed answer separates saves; invalid config and storage failure handled',()=>{
 const g=boot();g.type('ABC');const next=boot({answer:'BBBBBBBBBBBB',store:g.store});assert.equal(next.els['#board'].children[0].children[0].textContent,'');assert.equal(g.store.size,2);
 assert.equal(boot({answer:'BAD'}).els['#attempt'].textContent,'CONFIGURATION ERROR');assert.equal(boot({brokenStorage:true}).els['#storage-warning'].hidden,false);
});
