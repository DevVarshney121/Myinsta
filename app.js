(() => {
  "use strict";
  const DB_NAME = "reelgram-local-library";
  const DB_VERSION = 1;
  const STORE = "videos";
  const $ = s => document.querySelector(s);
  const picker = $("#videoPicker"), feed = $("#reelFeed"), dialog = $("#uploadDialog");
  let db, reels = [], selectedFiles = [], query = "", view = "feed", toastTimer;

  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const d = request.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, {keyPath:"id"});
    };
    request.onsuccess = () => { db = request.result; resolve(); };
    request.onerror = () => reject(request.error);
  });
  const store = mode => db.transaction(STORE, mode).objectStore(STORE);
  const getAll = () => new Promise((resolve, reject) => {
    const r = store("readonly").getAll(); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error);
  });
  const put = item => new Promise((resolve, reject) => {
    const r = store("readwrite").put(item); r.onsuccess = resolve; r.onerror = () => reject(r.error);
  });
  const remove = id => new Promise((resolve, reject) => {
    const r = store("readwrite").delete(id); r.onsuccess = resolve; r.onerror = () => reject(r.error);
  });
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const bytes = n => n > 1073741824 ? (n/1073741824).toFixed(1)+" GB" : (n/1048576).toFixed(1)+" MB";
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function openPicker() { picker.click(); }
  function selectVideos(files) {
    selectedFiles = Array.from(files || []).filter(f => f.type.startsWith("video/"));
    if (!selectedFiles.length) { toast("Please select video files."); return; }
    $("#uploadSummary").textContent = `${selectedFiles.length} video(s) selected · ${bytes(selectedFiles.reduce((sum,f)=>sum+f.size,0))}. Stored in this browser only.`;
    $("#captionInput").value = "";
    if (dialog.showModal) dialog.showModal();
    else if (confirm(`Add ${selectedFiles.length} videos?`)) saveVideos();
  }
  async function saveVideos() {
    if (!selectedFiles.length) return;
    const files = selectedFiles.slice(), caption = $("#captionInput").value.trim(), button = $("#saveVideos");
    button.disabled = true; button.textContent = "Saving…";
    let saved = 0;
    try {
      for (const file of files) {
        await put({id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          name:file.name, caption, blob:file, type:file.type || "video/mp4", size:file.size,
          createdAt:Date.now()+saved, liked:false, likes:0});
        saved++;
      }
      selectedFiles = []; picker.value = ""; if (dialog.open) dialog.close();
      await reload(); view = "feed"; render(); toast(`${saved} reel(s) added`);
    } catch (e) {
      console.error(e); toast("Storage full or browser could not save these videos. Try fewer/smaller files.");
      await reload(); render();
    } finally { button.disabled = false; button.textContent = "Add reels"; }
  }
  function visibleReels() {
    let list = reels.slice();
    if (view === "liked") list = list.filter(r => r.liked);
    if (query) { const q=query.toLowerCase(); list=list.filter(r=>(r.name+" "+r.caption).toLowerCase().includes(q)); }
    const sort = $("#sortSelect").value;
    list.sort(sort==="oldest" ? (a,b)=>a.createdAt-b.createdAt : sort==="liked" ? (a,b)=>b.likes-a.likes || b.createdAt-a.createdAt : (a,b)=>b.createdAt-a.createdAt);
    return list;
  }
  function makeCard(r, i) {
    const card = document.createElement("article"); card.className = "reel-card"; card.dataset.id = r.id;
    const videoUrl = URL.createObjectURL(r.blob);
    const caption = r.caption || r.name.replace(/\.[^/.]+$/, "");
    card.innerHTML = `<div class="video-wrap paused">
      <video class="reel-video" src="${videoUrl}" playsinline loop preload="metadata" aria-label="${escapeHTML(r.name)}"></video>
      <button class="video-control" tabindex="-1" aria-hidden="true"><span>▶</span></button>
      <div class="reel-top"><span class="user-avatar">Y</span><span>your_reel</span><button class="follow-btn" data-action="follow">Following</button></div>
      <div class="reel-actions">
        <button class="reel-action like-action ${r.liked?"liked":""}" data-action="like" aria-label="Like reel"><span class="glyph">${r.liked?"♥":"♡"}</span><small>${r.likes||0}</small></button>
        <button class="reel-action" data-action="comment" aria-label="Caption"><span class="glyph">▢</span><small>Caption</small></button>
        <button class="reel-action" data-action="sound" aria-label="Toggle sound"><span class="glyph">♬</span><small>Sound</small></button>
        <button class="reel-action" data-action="more" aria-label="More options"><span class="glyph">•••</span><small>More</small></button>
      </div>
      <div class="reel-caption"><strong>your_reel</strong><p>${escapeHTML(caption)}</p><div class="audio-line">♫ <span>${escapeHTML(r.name.replace(/\.[^/.]+$/, ""))}</span></div></div>
    </div>
    <div class="reel-footer"><span class="file-name">${escapeHTML(r.name)} · ${bytes(r.size)}</span><div class="footer-actions"><button class="text-btn" data-action="download">Download</button><button class="text-btn delete-btn" data-action="delete">Delete</button></div></div>`;
    const video = card.querySelector("video");
    video.addEventListener("click", () => togglePlay(card));
    video.addEventListener("play", () => card.querySelector(".video-wrap").classList.remove("paused"));
    video.addEventListener("pause", () => card.querySelector(".video-wrap").classList.add("paused"));
    return card;
  }
  function render() {
    const list = visibleReels(); feed.replaceChildren();
    $("#pageTitle").textContent = view === "liked" ? "Liked reels" : "Reels";
    $("#feedLabel").textContent = view === "liked" ? "Liked reels" : query ? "Search results" : "Your reels";
    $("#reelCount").textContent = list.length;
    $("#emptyState").hidden = list.length > 0 || (reels.length > 0 && (query || view === "liked"));
    if (!list.length && (query || view === "liked") && reels.length) {
      const no = document.createElement("div"); no.className = "empty-state"; no.innerHTML = `<h2>${query?"No results found":"No liked reels yet"}</h2><p>${query?"Try another caption or filename.":"Tap the heart on a reel to save it here."}</p>`; feed.append(no);
    } else list.forEach((r,i)=>feed.append(makeCard(r,i)));
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("selected", b.dataset.view === view || (view==="feed" && b.dataset.view==="feed")));
  }
  async function reload() { reels = await getAll(); }
  function togglePlay(card) {
    const video = card.querySelector("video");
    if (video.paused) {
      document.querySelectorAll(".reel-video").forEach(v=>{if(v!==video)v.pause();});
      video.play().catch(()=>toast("Tap the video to play."));
    } else video.pause();
  }
  async function handleAction(button) {
    const card = button.closest(".reel-card"); if (!card) return;
    const item = reels.find(r=>r.id===card.dataset.id); if (!item) return;
    switch(button.dataset.action) {
      case "like":
        item.liked = !item.liked; item.likes = Math.max(0,(item.likes||0)+(item.liked?1:-1));
        await put(item); render(); break;
      case "comment": toast(item.caption || item.name); break;
      case "sound": {
        const v=card.querySelector("video"); v.muted=!v.muted;
        button.querySelector(".glyph").textContent=v.muted?"♩":"♬";
        button.querySelector("small").textContent=v.muted?"Muted":"Sound";
        break;
      }
      case "more":
        if (confirm(`Delete "${item.name}" from your local library?`)) await deleteItem(item,card);
        break;
      case "delete":
        if (confirm(`Delete "${item.name}" from your local library?`)) await deleteItem(item,card);
        break;
      case "download": {
        const url=URL.createObjectURL(item.blob), a=document.createElement("a");
        a.href=url; a.download=item.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1200); break;
      }
      case "follow": toast("This is your private local profile."); break;
    }
  }
  async function deleteItem(item, card) {
    card.querySelector("video").pause(); await remove(item.id); await reload(); render(); toast("Reel deleted.");
  }
  function setView(next) {
    if (next==="upload") { openPicker(); return; }
    if (next==="search") { expandSearch(); return; }
    view = next; render(); if (innerWidth<700) scrollTo({top:0,behavior:"smooth"});
  }
  function expandSearch() {
    const field = document.querySelector(".search-field");
    field.classList.add("expanded"); $("#searchInput").focus();
    if (innerWidth<700) scrollTo({top:0,behavior:"smooth"});
  }

  document.addEventListener("click", e => {
    const b=e.target.closest("button"); if(!b)return;
    if(b.closest(".reel-card") && b.dataset.action){handleAction(b);return;}
    if(b.dataset.view){setView(b.dataset.view);return;}
  });
  ["#desktopUpload","#mobileUpload","#storyUpload","#storyUpload2","#emptyUpload","#uploadButton"].forEach(s=>$(s).addEventListener("click",openPicker));
  $("#saveVideos").addEventListener("click",saveVideos);
  picker.addEventListener("change",()=>selectVideos(picker.files));
  $("#searchInput").addEventListener("input",e=>{query=e.target.value.trim();render();});
  $("#mobileSearch").addEventListener("click",expandSearch);
  $("#bottomSearch").addEventListener("click",expandSearch);
  $("#sortSelect").addEventListener("change",render);
  $("#uploadForm").addEventListener("submit",()=>{selectedFiles=[];});
  feed.addEventListener("dblclick",async e=>{
    const card=e.target.closest(".reel-card"); if(!card)return;
    const item=reels.find(r=>r.id===card.dataset.id); if(item&&!item.liked){item.liked=true;item.likes=(item.likes||0)+1;await put(item);render();}
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const video=entry.target.querySelector("video"); if(!video)return;
      if(entry.isIntersecting && entry.intersectionRatio>=.72){
        document.querySelectorAll(".reel-video").forEach(v=>{if(v!==video)v.pause();});
        video.play().catch(()=>{});
      } else video.pause();
    }),{threshold:[0,.25,.72,1]});
    new MutationObserver(()=>document.querySelectorAll(".reel-card:not([data-observed])").forEach(c=>{c.dataset.observed="1";observer.observe(c);})).observe(feed,{childList:true});
  }
  (async()=>{try{if(!("indexedDB" in window))throw Error("No IndexedDB");await openDB();await reload();render();}catch(e){console.error(e);$("#emptyState").querySelector("p").textContent="This browser cannot access local storage. Please use an up-to-date version of Chrome, Edge, or Safari.";toast("Browser storage unavailable.");}})();
})();