(() => {
  "use strict";
  const DB_NAME="reelgram-private-video-library", DB_VERSION=1, STORE="videos";
  const $=s=>document.querySelector(s);
  const picker=$("#videoPicker"), dialog=$("#uploadDialog"), feed=$("#reelFeed");
  let db, videos=[], selectedFiles=[], view="home", toastTimer, shuffledIds=[];

  const openDB=()=>new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id"});};
    r.onsuccess=()=>{db=r.result;resolve();}; r.onerror=()=>reject(r.error);
  });
  const store=mode=>db.transaction(STORE,mode).objectStore(STORE);
  const getAll=()=>new Promise((resolve,reject)=>{const r=store("readonly").getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
  const put=item=>new Promise((resolve,reject)=>{const r=store("readwrite").put(item);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
  const remove=id=>new Promise((resolve,reject)=>{const r=store("readwrite").delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sizeText=n=>n>=1073741824?(n/1073741824).toFixed(1)+" GB":(n/1048576).toFixed(1)+" MB";
  function notify(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2500);}
  function shuffle(array){for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[array[i],array[j]]=[array[j],array[i]];}return array;}
  function newShuffle(){shuffledIds=shuffle(videos.map(v=>v.id));}
  function openPicker(){picker.click();}
  function selectFiles(files){
    selectedFiles=Array.from(files||[]).filter(f=>f.type.startsWith("video/"));
    if(!selectedFiles.length){notify("Select video files to continue.");return;}
    $("#uploadSummary").textContent=`${selectedFiles.length} video(s) · ${sizeText(selectedFiles.reduce((n,f)=>n+f.size,0))}. Original files are stored without compression in this browser.`;
    $("#captionInput").value="";
    if(dialog.showModal)dialog.showModal();else if(confirm(`Add ${selectedFiles.length} videos?`))saveVideos();
  }
  async function saveVideos(){
    if(!selectedFiles.length)return;
    const files=selectedFiles.slice(),caption=$("#captionInput").value.trim(),btn=$("#saveVideos");
    btn.disabled=true;btn.textContent="Saving…";let count=0;
    try{
      for(const file of files){
        await put({id:(window.crypto && typeof window.crypto.randomUUID==="function")?window.crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`,name:file.name,caption,blob:file,type:file.type||"video/mp4",size:file.size,createdAt:Date.now()+count});
        count++;
      }
      selectedFiles=[];picker.value="";if(dialog.open)dialog.close();
      await reload();newShuffle();view="feed";render();notify(`${count} videos added in original file quality.`);
    }catch(e){
      console.error("Could not save video(s):",e);
      notify(e && (e.name==="QuotaExceededError" || e.name==="UnknownError")
        ? "Browser storage is full. Try fewer or smaller videos."
        : "Could not save videos. Refresh the page and try again.");
      try { await reload(); newShuffle(); render(); } catch(renderError) { console.error(renderError); }
    }
    finally{btn.disabled=false;btn.textContent="Add reels";}
  }
  async function reload(){videos=await getAll();}
  function orderedVideos(){
    const byId=new Map(videos.map(v=>[v.id,v]));
    const list=shuffledIds.map(id=>byId.get(id)).filter(Boolean);
    videos.forEach(v=>{if(!shuffledIds.includes(v.id))list.push(v);});
    return list;
  }
  function makeCard(v,index){
    const url=URL.createObjectURL(v.blob),caption=v.caption||v.name.replace(/\.[^/.]+$/,"");
    const card=document.createElement("article");card.className="reel-card";card.dataset.id=v.id;
    card.innerHTML=`<div class="video-wrap paused">
      <video class="reel-video" src="${url}" playsinline loop preload="metadata" aria-label="${esc(v.name)}"></video>
      <button class="video-control" tabindex="-1" aria-hidden="true"><span>▶</span></button>
      <div class="reel-top"><span class="user-avatar">Y</span><span>your_reel</span></div>
      <div class="reel-actions">
        <button class="reel-action" data-action="sound" aria-label="Toggle sound"><span class="glyph">♬</span><small>Sound</small></button>
        <button class="reel-action" data-action="caption" aria-label="Show caption"><span class="glyph">☰</span><small>Caption</small></button>
      </div>
      <div class="reel-caption"><strong>your_reel</strong><p>${esc(caption)}</p><div class="audio-line">♫ <span>${esc(v.name.replace(/\.[^/.]+$/,""))}</span></div></div>
    </div>
    <div class="reel-footer"><span class="file-name">${esc(v.name)} · ${sizeText(v.size)}</span><div class="footer-actions"><span>Reel</span></div></div>`;
    const video=card.querySelector("video");
    video.addEventListener("click",()=>togglePlay(card));
    video.addEventListener("play",()=>card.querySelector(".video-wrap").classList.remove("paused"));
    video.addEventListener("pause",()=>card.querySelector(".video-wrap").classList.add("paused"));
    return card;
  }
  function render(){
    const ordered=orderedVideos();
    $("#pageTitle").textContent=view==="profile"?"Profile":view==="home"?"Home":"Reels";
    $("#homePanel").hidden=view!=="home";
    $("#feedView").hidden=view!=="feed";
    $("#profilePanel").hidden=view!=="profile";
    $("#feedView").classList.toggle("reels-active",view==="feed");
    document.body.classList.toggle("reels-open",view==="feed");
    const feedLabel=$("#feedLabel"); if(feedLabel) feedLabel.textContent="Random reel feed";
    const reelCount=$("#reelCount"); if(reelCount) reelCount.textContent=`${videos.length} videos`;
    $("#profilePosts").textContent=videos.length;
    $("#profileReels").textContent=videos.length;
    const totalSize=videos.reduce((n,v)=>n+(v.size||0),0);
    $("#profileSize").textContent=sizeText(totalSize);
    $("#homeVideoCount").textContent=`${videos.length} videos`;
    $("#homeEmpty").hidden=videos.length>0;
    $("#emptyState").hidden=true;

    // Dedicated viewer cards are shuffled and have no download/delete controls.
    feed.replaceChildren();
    ordered.forEach((v,i)=>feed.append(makeCard(v,i)));

    // Home behaves like a normal feed: story strip + stacked video posts. Tapping a post opens Reels at that video.
    const storyRow=$("#storyRow");storyRow.replaceChildren();
    const stories=[{label:"Your story",initial:"＋"},...videos.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,12).map(v=>({label:v.name.replace(/\.[^/.]+$/,""),initial:"▶"}))];
    stories.forEach(s=>{
      const item=document.createElement("button");item.className="story-item";item.innerHTML=`<div class="story-ring"><div class="story-ring-inner">${esc(s.initial)}</div></div><small>${esc(s.label)}</small>`;
      item.addEventListener("click",()=>{if(s.label==="Your story")openPicker();else{const found=videos.find(v=>v.name.replace(/\.[^/.]+$/,"")===s.label);if(found)openReel(found.id);}});
      storyRow.append(item);
    });
    const homeFeed=$("#homeRecent");homeFeed.replaceChildren();
    videos.slice().sort((a,b)=>b.createdAt-a.createdAt).forEach(v=>{
      const tile=document.createElement("button");tile.className="home-post";tile.title=v.name;
      const u=URL.createObjectURL(v.blob);
      tile.innerHTML=`<div class="home-post-head"><span class="user-avatar">Y</span><span>your_reel</span></div><video src="${u}" muted playsinline preload="metadata"></video><span class="post-play">▶</span><span class="post-caption">${esc(v.caption||v.name)}</span>`;
      tile.addEventListener("click",()=>openReel(v.id));
      homeFeed.append(tile);
    });

    const grid=$("#profileGrid");grid.replaceChildren();
    ordered.forEach(v=>{
      const wrap=document.createElement("div");wrap.className="grid-video";wrap.title=v.name;wrap.setAttribute("role","button");wrap.tabIndex=0;
      const u=URL.createObjectURL(v.blob);wrap.innerHTML=`<video src="${u}" muted playsinline preload="metadata"></video><span>▶</span><button type="button" class="profile-delete" data-profile-delete="${esc(v.id)}">Delete</button><button type="button" class="profile-download" data-profile-download="${esc(v.id)}">Download</button>`;
      wrap.addEventListener("click",(event)=>{if(event.target.closest("[data-profile-delete],[data-profile-download]"))return;openReel(v.id);});
      grid.append(wrap);
    });
    document.querySelectorAll(".bottom-link[data-action],.side-link[data-action]").forEach(b=>{
      b.classList.toggle("selected",b.dataset.action===view || (view==="feed"&&b.dataset.action==="feed"));
      b.classList.toggle("active",b.dataset.action===view || (view==="feed"&&b.dataset.action==="feed"));
    });
  }
  function openReel(id){
    newShuffle();
    const at=shuffledIds.indexOf(id);
    if(at>0){shuffledIds.splice(at,1);shuffledIds.unshift(id);}
    view="feed";render();
    const target=feed.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if(target) target.scrollIntoView({behavior:"instant",block:"start"});
    const video=target?.querySelector("video");
    if(video) setTimeout(()=>video.play().catch(()=>{}),120);
  }
  function togglePlay(card){
    const v=card.querySelector("video");
    if(v.paused){document.querySelectorAll(".reel-video").forEach(other=>{if(other!==v)other.pause();});v.play().catch(()=>notify("Tap the video again to play."));}
    else v.pause();
  }
  async function deleteVideo(card){
    const v=videos.find(item=>item.id===card.dataset.id);if(!v)return;
    if(!confirm(`Remove "${v.name}" from this browser?`))return;
    card.querySelector("video")?.pause();await remove(v.id);await reload();newShuffle();render();notify("Video removed.");
  }
  async function action(button){
    const card=button.closest(".reel-card");if(!card)return;
    const item=videos.find(v=>v.id===card.dataset.id);if(!item)return;
    switch(button.dataset.action){
      case "sound":{const v=card.querySelector("video");v.muted=!v.muted;button.querySelector(".glyph").textContent=v.muted?"♩":"♬";button.querySelector("small").textContent=v.muted?"Muted":"Sound";break;}
      case "caption":notify(item.caption||item.name);break;
      case "delete":await deleteVideo(card);break;
      case "download":{const u=URL.createObjectURL(item.blob),a=document.createElement("a");a.href=u;a.download=item.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);break;}
    }
  }
  function setView(next){
    if(next==="upload"){openPicker();return;}
    view=next==="profile"?"profile":next==="feed"?"feed":"home";
    render();
    if(innerWidth<700)scrollTo({top:0,behavior:"smooth"});
  }
  document.addEventListener("click",async e=>{
    const del=e.target.closest("[data-profile-delete]");
    if(del){e.stopPropagation();const item=videos.find(v=>v.id===del.dataset.profileDelete);if(item){if(confirm(`Delete "${item.name}" from this browser?`)){await remove(item.id);await reload();newShuffle();render();notify("Video deleted.");}}return;}
    const down=e.target.closest("[data-profile-download]");
    if(down){e.stopPropagation();const item=videos.find(v=>v.id===down.dataset.profileDownload);if(item){const u=URL.createObjectURL(item.blob),a=document.createElement("a");a.href=u;a.download=item.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}return;}
    const b=e.target.closest("button");if(!b)return;
    if(b.closest(".reel-card")&&b.dataset.action){action(b);return;}
    if(b.dataset.action)setView(b.dataset.action);
  });
  picker.addEventListener("change",()=>{ if(picker.files && picker.files.length) selectFiles(picker.files); });
  picker.addEventListener("cancel",()=>{ selectedFiles=[]; });
  $("#saveVideos").addEventListener("click",saveVideos);
  $("#uploadForm").addEventListener("submit",()=>{selectedFiles=[];});
  if("IntersectionObserver"in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      const video=entry.target.querySelector("video");if(!video)return;
      if(entry.isIntersecting&&entry.intersectionRatio>=.78){
        document.querySelectorAll(".reel-video").forEach(other=>{if(other!==video)other.pause();});
        video.play().catch(()=>{});
      }else video.pause();
    }),{threshold:[0,.3,.78,1]});
    new MutationObserver(()=>document.querySelectorAll("#reelFeed .reel-card:not([data-observed])").forEach(card=>{card.dataset.observed="1";observer.observe(card);})).observe(feed,{childList:true});
  }
  (async()=>{try{if(!("indexedDB"in window))throw Error("IndexedDB unavailable");await openDB();await reload();newShuffle();render();}catch(e){console.error(e);notify("Local browser storage is unavailable.");}})();
})();