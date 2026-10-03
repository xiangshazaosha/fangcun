const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
class Element{constructor(){this.textContent='';this.disabled=false;this.dataset={};this.attrs={};this.events={};this.classes=new Set();this.classList={toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)};this.child=null;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.events[k]=f;}removeEventListener(k,f){if(this.events[k]===f)delete this.events[k];}querySelector(){return this.child;}click(){if(!this.disabled)this.events.click?.();}}
function fixture(){const slots={};for(const n of ['status','topic','prompt','feedback-title','feedback','next','reset'])slots[n]=new Element();const choices=Array.from({length:3},()=>{const e=new Element();e.child=new Element();return e;});const root={dataset:{},querySelector:s=>slots[s.match(/"([^"]+)"/)[1]],querySelectorAll:()=>choices};return {root,slots,choices};}
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../.agents/skills/fangcun/assets/modules/judgement-game.js'),'utf8'),sandbox);
const create=sandbox.window.FangcunJudgementGame.create;
const qs=[0,1,2].map(i=>({id:'q'+i,topic:'topic'+i,prompt:'prompt'+i,options:['a','b','c'],answer:i,explanation:'reason'+i}));
const f=fixture(),g=create({root:f.root,questions:qs,roundCount:3,randomize:false});
assert.equal(f.slots.next.disabled,true);g.next();assert.equal(g.getState().index,0);
g.choose(1);assert.equal(g.getState().score,0);g.choose(0);assert.equal(g.getState().score,0);assert.equal(g.getState().answers.length,1);
assert(f.choices[0].classes.has('correct'));assert(f.choices[1].classes.has('incorrect'));assert(f.choices.every(c=>c.disabled));assert.equal(f.slots.feedback.textContent,'reason0');
g.next();g.choose(1);g.next();g.choose(2);g.next();assert.equal(g.getState().finished,true);assert.equal(g.getState().score,2);assert.equal(g.getState().answers.length,3);
g.next();g.choose(0);assert.equal(g.getState().score,2);g.reset();assert.equal(g.getState().finished,false);assert.equal(g.getState().score,0);assert.equal(g.getState().answers.length,0);
g.choose(-1);g.choose(9);assert.equal(g.getState().selected,null);g.destroy();assert(f.choices.every(c=>!c.events.click));
const r=fixture(),shuffled=create({root:r.root,questions:qs,randomize:true});const before=shuffled.getState().order.join('|');shuffled.reset();assert.notEqual(shuffled.getState().order.join('|'),before);
assert.throws(()=>create({root:fixture().root,questions:[{...qs[0],answer:8}]}));assert.throws(()=>create({root:fixture().root,questions:[]}));
console.log('PASS: answer gating, one-attempt scoring, feedback, finish/replay, random order, invalid inputs, listener cleanup');
