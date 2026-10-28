const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const core=require('../dist/core.js');
const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/questions.json'),'utf8'));
assert.equal(bank.questions.length,210);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,210);
assert.equal(bank.questions.filter(q=>q.chapter<7).length,184);
assert.equal(bank.questions.filter(q=>q.chapter===7).length,26);
for(const q of bank.questions){
  assert.ok(q.question.trim()&&q.answer.trim(),q.id);
  for(const src of [...q.questionImages,...q.answerImages])assert.ok(fs.existsSync(path.join(__dirname,'../dist',src)),src);
  if(q.chapter<7)assert.ok(q.answerImages.length,q.id);
}
assert.equal(Object.keys(bank.contexts).length,3);
for(const ctx of [...Object.values(bank.contexts),bank.conventions]){
  assert.ok(ctx.text.trim()&&ctx.images.length);
  for(const src of ctx.images)assert.ok(fs.existsSync(path.join(__dirname,'../dist',src)),src);
}
for(let seed=1;seed<=50;seed++){
  let s=seed;const random=()=>((s=s*16807%2147483647)-1)/2147483646;
  const queue=core.makeQueue(bank.questions,'random',bank.questions[0].id,random);
  assert.equal(queue.length,210);assert.equal(new Set(queue).size,210);assert.notEqual(queue[0],bank.questions[0].id);
}
const state={'1-1':{status:'mastered',seen:true,favorite:true},'2-1':{status:'review',seen:true}};
assert.deepEqual(core.filterQuestions(bank.questions,{mode:'review'},state).map(q=>q.id),['2-1']);
assert.deepEqual(core.filterQuestions(bank.questions,{mode:'favorites'},state).map(q=>q.id),['1-1']);
assert.equal(core.filterQuestions(bank.questions,{scope:'unseen'},state).length,208);
assert.equal(core.filterQuestions(bank.questions,{scope:'unmastered'},state).length,209);
assert.equal(core.filterQuestions(bank.questions,{chapter:3,type:'选择题'},state).every(q=>q.chapter===3&&q.type==='选择题'),true);
assert.ok(core.filterQuestions(bank.questions,{scope:'important'},state).every(q=>q.important));
assert.deepEqual(core.makeQueue(bank.questions,'ordered'),bank.questions.map(q=>q.id));
assert.equal(core.filterQuestions(bank.questions,{search:'__does_not_exist__'},state).length,0);
assert.equal(core.makeQueue([],'random').length,0);
assert.deepEqual(core.makeQueue([{id:'only'}],'random','only'),['only']);
console.log('PASS: 210 pairs, 474 assets, 50 complete random rounds without repeats, chapter/type/scope/review/favorite filters, empty/single-question cases.');
