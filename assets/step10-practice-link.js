(() => {
  'use strict';
  const config=window.FPT_V2_CONFIG||{};
  const base=String(config.workerBaseUrl||'').replace(/\/$/,'');
  const portal=document.getElementById('portal-screen');
  const actions=document.querySelector('.phase5-topbar-actions');
  if(!portal||!actions||!base)return;
  let link=document.getElementById('practice-launch');
  if(!link){
    link=document.createElement('a');
    link.id='practice-launch';
    link.className='phase5-practice-link';
    link.href='#';
    link.hidden=true;
    link.textContent='11+ Practice';
    actions.insertBefore(link,actions.firstChild);
  }
  let checking=false,lastVisible=false;

  async function check(){
    if(checking||portal.hidden){link.hidden=true;return;}
    checking=true;
    try{
      const r=await fetch(`${base}/api/v1/student/quiz/eligibility`,{method:'GET',credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
      const b=await r.json().catch(()=>null);
      link.hidden=!(r.ok&&b?.ok&&b?.eligible===true);
    }catch{link.hidden=true;}
    finally{checking=false;}
  }
  link.addEventListener('click',async event=>{
    event.preventDefault();
    link.setAttribute('aria-busy','true');
    try{
      const r=await fetch(`${base}/api/v1/student/quiz/launch`,{
        method:'POST',credentials:'include',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json'},body:'{}'
      });
      const b=await r.json().catch(()=>null);
      if(r.ok&&b?.launchUrl){window.location.assign(b.launchUrl);return;}
      if(r.status===401){link.hidden=true;return;}
      alert('11+ Practice is temporarily unavailable. Please try again.');
    }catch{alert('11+ Practice is temporarily unavailable. Please try again.');}
    finally{link.removeAttribute('aria-busy');}
  });
  new MutationObserver(()=>{
    const visible=!portal.hidden;
    if(visible&&!lastVisible)check();
    if(!visible)link.hidden=true;
    lastVisible=visible;
  }).observe(portal,{attributes:true,attributeFilter:['hidden']});
  if(!portal.hidden)check();
})();
