(()=>{
  'use strict';
  const bank=window.QUESTION_BANK,core=window.PracticeCore;
  const $=id=>document.getElementById(id),byId=new Map(bank.questions.map(q=>[q.id,q]));
  const KEY='dsa-a-practice-v1';
  let records={},filters={mode:'random',chapter:0,type:'',scope:'all',search:''},queue=[],position=0,revealed=false,timer,storageFailed=false;
  const names={random:'随机练习',ordered:'顺序练习',review:'待复习',favorites:'我的收藏'};
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,2200);}
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved.records&&typeof saved.records==='object'&&!Array.isArray(saved.records))records=saved.records;}catch{storageFailed=true;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,records}));}catch{if(!storageFailed)toast('浏览器存储不可用，本次记录将仅临时保存');storageFailed=true;}}
  const current=()=>byId.get(queue[position]);
  const record=id=>records[id]||(records[id]={});
  function stats(){
    const valid=bank.questions.map(q=>records[q.id]||{});
    const seen=valid.filter(r=>r.seen).length,mastered=valid.filter(r=>r.status==='mastered').length;
    $('seen-stat').replaceChildren(String(seen),Object.assign(document.createElement('small'),{textContent:'/ 210'}));
    $('mastered-stat').replaceChildren(String(mastered),Object.assign(document.createElement('small'),{textContent:'道题目'}));
    $('review-count').textContent=valid.filter(r=>r.status==='review').length;
    $('favorite-count').textContent=valid.filter(r=>r.favorite).length;
    const percent=Math.round(mastered/210*100);$('percent-stat').textContent=percent+'%';$('mastery-bar').style.width=percent+'%';
  }
  function chapters(){
    const list=[{id:0,name:'全部章节',count:210},...bank.chapters];
    $('chapters').replaceChildren(...list.map(c=>{
      const b=document.createElement('button');b.className=c.id===filters.chapter?'active':'';b.setAttribute('aria-pressed',String(c.id===filters.chapter));b.dataset.chapter=c.id;
      const no=document.createElement('span');no.className='chapter-no';no.textContent=c.id===0?'∷':c.id===7?'EX':String(c.id).padStart(2,'0');
      const title=document.createElement('span');title.textContent=c.name;
      const count=document.createElement('span');count.className='count';count.textContent=c.count;
      b.append(no,title,count);b.onclick=()=>{filters.chapter=c.id;chapters();start();};return b;
    }));
  }
  function start(avoid){
    const pool=core.filterQuestions(bank.questions,filters,records);
    queue=core.makeQueue(pool,filters.mode,avoid);position=0;
    $('pool-count').textContent=`${queue.length} 道可练习`;
    $('mode-label').textContent=$('practice-title').textContent=names[filters.mode];
    $('session-name').textContent=filters.mode==='ordered'?'原题顺序 · 按题号练习':'随机顺序 · 本轮不重复';
    document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===filters.mode);b.setAttribute('aria-current',b.dataset.mode===filters.mode?'page':'false');});
    render();
  }
  function renderImages(container,images,text,isAnswer=false){
    container.replaceChildren();
    if(images.length){images.forEach((src,i)=>{
      const img=document.createElement('img');img.src=src;img.alt=`${current()?.id||'题库'} ${isAnswer?'参考答案':'原题题面'}${images.length>1?' 第'+(i+1)+'部分':''}`;
      img.decoding='async';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','放大'+img.alt);
      const open=()=>{$('large-image').src=src;$('image-dialog').showModal();};img.onclick=open;img.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();open();}};
      container.append(img);
    });}else{const p=document.createElement('p');p.className='text-answer';p.textContent=text;container.append(p);}
  }
  function syncRecord(){
    const q=current();if(!q)return;const r=records[q.id]||{};
    $('favorite').textContent=r.favorite?'★':'☆';$('favorite').setAttribute('aria-pressed',String(!!r.favorite));$('favorite').setAttribute('aria-label',r.favorite?'取消收藏当前题目':'收藏当前题目');
    $('question-state').textContent=r.status==='mastered'?'✓ 这道题已标记为掌握':r.status==='review'?'↺ 这道题还需复习':'先独立思考，再揭晓答案';
    $('mark-mastered').setAttribute('aria-pressed',String(r.status==='mastered'));$('mark-review').setAttribute('aria-pressed',String(r.status==='review'));
  }
  function render(){
    const q=current();revealed=false;$('answer-panel').hidden=true;$('answer-content').replaceChildren();$('reveal').setAttribute('aria-expanded','false');$('reveal').innerHTML='<span>◉</span> 查看答案';
    $('question-card').hidden=!q;$('empty-state').hidden=!!q;
    $('session-progress').textContent=q?`本轮 ${position+1} / ${queue.length}`:'0 道题';
    if(!q){$('empty-message').textContent=filters.mode==='review'?'查看答案后，点击“还需复习”，题目就会出现在这里。':filters.mode==='favorites'?'点击题目右上角的星标，即可加入收藏。':'试试调整章节、题型或搜索条件。';return;}
    $('question-tags').replaceChildren(...[q.chapter===7?'模拟卷':`第 ${q.chapter} 章 · ${q.chapterName}`,q.type,...q.important?['★ 重点题']:[]].map(t=>{const tag=document.createElement('span');tag.textContent=t;if(t.startsWith('★'))tag.className='important';return tag;}));
    $('question-id').textContent=q.source==='模拟卷'?`模拟卷 · ${q.type} ${q.number}`:`QUESTION ${q.id}`;
    $('source-link').textContent=`原书第 ${q.printedPage} 页 ↗`;$('source-link').href=`source.pdf#page=${q.sourcePage}`;
    renderImages($('question-content'),q.questionImages,q.question);
    const ctx=q.type==='算法设计与分析'?bank.contexts[String(q.chapter)]:null;
    $('question-context').hidden=!ctx;$('question-context').open=false;$('context-content').replaceChildren();
    if(ctx)renderImages($('context-content'),ctx.images,ctx.text);
    $('draft').value=records[q.id]?.draft||'';$('previous').disabled=position===0;
    $('next').textContent=position===queue.length-1?'完成本轮 · 再来一轮 ↻':'下一题 →';
    $('question-position').textContent=`${position+1} / ${queue.length}`;syncRecord();
  }
  function reveal(){
    const q=current();if(!q)return;revealed=!revealed;
    $('answer-panel').hidden=!revealed;$('reveal').setAttribute('aria-expanded',String(revealed));$('reveal').innerHTML=revealed?'<span>◉</span> 收起答案':'<span>◉</span> 查看答案';
    if(revealed){renderImages($('answer-content'),q.answerImages,q.answer,true);record(q.id).seen=true;persist();stats();}else $('answer-content').replaceChildren();
  }
  function move(delta){
    if(!current())return;
    if(position+delta<0)return;
    if(position+delta>=queue.length){toast('本轮练习完成，已开始新一轮');start(current().id);}else{position+=delta;render();}
    if($('question-card').getBoundingClientRect().top<0)$('question-card').scrollIntoView({behavior:'smooth',block:'start'});
  }
  bank.types.forEach(t=>{const o=document.createElement('option');o.value=o.textContent=t;$('type-filter').append(o);});
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{filters.mode=b.dataset.mode;start();});
  $('type-filter').onchange=e=>{filters.type=e.target.value;start();};$('scope-filter').onchange=e=>{filters.scope=e.target.value;start();};
  let searchTimer;$('search').oninput=e=>{const value=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{filters.search=value;start();},160);};
  $('reshuffle').onclick=()=>{start(current()?.id);toast(filters.mode==='ordered'?'已回到本轮第一题':'已重新随机排列题目');};
  $('reveal').onclick=reveal;$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);
  $('favorite').onclick=()=>{const q=current();if(!q)return;const r=record(q.id);r.favorite=!r.favorite;persist();syncRecord();stats();toast(r.favorite?'已加入收藏':'已取消收藏');};
  $('draft').oninput=e=>{if(current()){record(current().id).draft=e.target.value;persist();}};
  ['review','mastered'].forEach(status=>$('mark-'+status).onclick=()=>{if(!current())return;record(current().id).status=status;persist();stats();syncRecord();toast(status==='mastered'?'已标记为掌握':'已加入待复习');});
  $('reset-filters').onclick=()=>{filters={mode:'random',chapter:0,type:'',scope:'all',search:''};$('type-filter').value='';$('scope-filter').value='all';$('search').value='';clearTimeout(searchTimer);chapters();start();};
  $('close-image').onclick=()=>$('image-dialog').close();$('image-dialog').onclick=e=>{if(e.target===$('image-dialog'))$('image-dialog').close();};
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||$('image-dialog').open||['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement?.tagName))return;
    if(e.code==='Space'){e.preventDefault();reveal();}if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
  });
  chapters();stats();start();renderImages($('conventions-content'),bank.conventions.images,bank.conventions.text);if(storageFailed)toast('浏览器存储不可用，练习记录仅临时保存');
})();
