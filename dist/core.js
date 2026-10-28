(function(root){
  'use strict';
  function shuffle(items,random=Math.random){
    const out=[...items];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function filterQuestions(questions,filters,records){
    const search=(filters.search||'').trim().toLocaleLowerCase().normalize('NFKC');
    return questions.filter(q=>{
      const r=records[q.id]||{};
      if(filters.chapter && q.chapter!==Number(filters.chapter))return false;
      if(filters.type && q.type!==filters.type)return false;
      if(filters.mode==='review' && r.status!=='review')return false;
      if(filters.mode==='favorites' && !r.favorite)return false;
      if(filters.scope==='important' && !q.important)return false;
      if(filters.scope==='unmastered' && r.status==='mastered')return false;
      if(filters.scope==='unseen' && r.seen)return false;
      // Deliberately search the question, never hidden answer text.
      return !search || `${q.id} ${q.chapterName} ${q.type} ${q.question}`.toLocaleLowerCase().normalize('NFKC').includes(search);
    });
  }
  function makeQueue(questions,mode,previousId,random=Math.random){
    const ids=questions.map(q=>q.id);
    if(mode==='ordered')return ids;
    const queue=shuffle(ids,random);
    if(queue.length>1 && queue[0]===previousId)[queue[0],queue[1]]=[queue[1],queue[0]];
    return queue;
  }
  const api={shuffle,filterQuestions,makeQueue};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.PracticeCore=api;
})(typeof window!=='undefined'?window:globalThis);
