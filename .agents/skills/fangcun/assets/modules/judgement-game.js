/* Content-led judgement game: local practice, not model evaluation. */
(function(global){
  'use strict';
  function create({root,questions,roundCount=3,randomize=true}){
    if(!root||!Array.isArray(questions)||!questions.length)throw new Error('Game requires root and questions');
    questions.forEach(q=>{if(!q.id||!q.prompt||q.options?.length!==3||!Number.isInteger(q.answer)||q.answer<0||q.answer>2||!q.explanation)throw new Error('Invalid question: '+q.id);});
    const find=n=>{const e=root.querySelector(`[data-game="${n}"]`);if(!e)throw new Error('Missing game element: '+n);return e;};
    const el={status:find('status'),topic:find('topic'),prompt:find('prompt'),feedbackTitle:find('feedback-title'),feedback:find('feedback'),next:find('next'),reset:find('reset')};
    const choices=[...root.querySelectorAll('[data-choice]')];if(choices.length!==3)throw new Error('Exactly three choices required');
    let order=[],index=0,selected=null,score=0,finished=false,answers=[],lastOrder='';const handlers=[];
    function on(e,t,f){e.addEventListener(t,f);handlers.push([e,t,f]);}
    function draw(){const q=order[index];root.dataset.gameState=finished?'finished':selected===null?'question':'answered';
      el.status.textContent=finished?`练习完成 · ${score} / ${order.length} 题判断正确`:`第 ${index+1} / ${order.length} 关 · 已判对 ${score} 题`;
      el.topic.textContent=finished?'你的判断结果':q.topic;
      el.prompt.textContent=finished?(score===order.length?'你没有把“看起来完成”当作“真的完成”。':'还有值得再检查的边界。再玩一轮，把判断练熟。'):q.prompt;
      choices.forEach((b,i)=>{b.querySelector('[data-choice-text]').textContent=finished?['检查来源','保存关键状态','核对执行证据'][i]:q.options[i];b.disabled=finished||selected!==null;b.classList.toggle('chosen',!finished&&selected===i);b.classList.toggle('correct',!finished&&selected!==null&&i===q.answer);b.classList.toggle('incorrect',!finished&&selected===i&&i!==q.answer);b.setAttribute('aria-pressed',String(!finished&&selected===i));});
      el.next.disabled=finished||selected===null;el.next.textContent=index===order.length-1?'查看结果 →':'下一关 →';
      if(finished){el.feedbackTitle.textContent=score===order.length?'挑战完成':'知道错在哪里，才是收获';const missed=answers.filter(a=>!a.correct).map(a=>a.topic);el.feedback.textContent=missed.length?`本轮需要复习：${[...new Set(missed)].join('、')}。分数只记录这次练习，不代表真实 Agent 的能力。`:'关键结果要有来源、可恢复状态或执行证据。这是课堂练习，不是模型能力评测。';}
      else if(selected===null){el.feedbackTitle.textContent='你会先做哪件事？';el.feedback.textContent='选择最可靠的下一步。提交后看原因，再进入下一关。';}
      else{el.feedbackTitle.textContent=selected===q.answer?'判断正确':'这一项还不能证明完成';el.feedback.textContent=q.explanation;}
    }
    function choose(i){if(finished||selected!==null||!Number.isInteger(i)||i<0||i>2)return;selected=i;const q=order[index],correct=i===q.answer;if(correct)score++;answers.push({id:q.id,topic:q.topic,selected:i,correct});draw();}
    function next(){if(finished||selected===null)return;if(index===order.length-1)finished=true;else{index++;selected=null;}draw();}
    function reset(){let pool=[...questions];if(randomize)for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      const count=Math.min(Math.max(1,Math.trunc(roundCount)),pool.length);order=pool.slice(0,count);if(randomize&&pool.length>1&&order.map(q=>q.id).join('|')===lastOrder){pool.push(pool.shift());order=pool.slice(0,count);}
      lastOrder=order.map(q=>q.id).join('|');index=0;selected=null;score=0;finished=false;answers=[];draw();}
    choices.forEach((b,i)=>on(b,'click',()=>choose(i)));on(el.next,'click',next);on(el.reset,'click',reset);reset();
    return {choose,next,reset,getState:()=>({index,selected,score,finished,answers:answers.map(a=>({...a})),questionId:order[index].id,correctAnswer:order[index].answer,order:order.map(q=>q.id)}),destroy:()=>handlers.forEach(([e,t,f])=>e.removeEventListener(t,f))};
  }
  global.FangcunJudgementGame={create};
})(window);
