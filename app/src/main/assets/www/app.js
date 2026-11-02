'use strict';
const $=s=>document.querySelector(s);
const SUF={user:'>',priv:'#',cfg:'(config)#',line:'(config-line)#','if':'(config-if)#',vlan:'(config-vlan)#',ifr:'(config-if-range)#',subif:'(config-subif)#'};
const MN={user:'Mode utilisateur',priv:'Mode privilégié',cfg:'Configuration globale',line:'Configuration de ligne','if':'Configuration d’interface',vlan:'Configuration de VLAN',ifr:'Configuration de plage d’interfaces',subif:'Configuration de sous-interface'};
/* modes déclarés par les modules : modes:{id:[prompt,nom]} */
MODS.forEach(m=>m.modes&&Object.entries(m.modes).forEach(([k,[p,n]])=>{SUF[k]=p;MN[k]=n}));
/* MODS et registerModule viennent de catalog.js ; chaque modules/*.js s'y inscrit */
let MOD=MODS.find(m=>m.build)||MODS[0];
const FREE=2;
let steps,i,mode,host,er,hl,hs,sub,free,score,total,cfg;

/* ---------- Vérification stricte : commande complète et exacte ---------- */
function match(v,s){
  /* commande : insensible à la casse ; valeurs (R1, mots de passe, message) : exactement comme dans l'énoncé */
  return s.ok.some(a=>a.toLowerCase()===v.toLowerCase())&&(!s.v||s.v.every(x=>v.includes(x)));
}
function why(v,s){
  const t=v.split(' ');let best=s.ok[0].split(' '),n=-1;
  for(const o of s.ok){const e=o.split(' ');let k=0;while(k<e.length&&k<t.length&&e[k].toLowerCase()===t[k].toLowerCase())k++;if(k>n){n=k;best=e}}
  if(n===t.length&&t.length<best.length)return 'Commande incomplète : il manque '+(best.length-n)+' élément(s).';
  if(n===best.length&&t.length>best.length)return 'Trop d’éléments : la commande se termine après « '+best[best.length-1]+' ».';
  if(n===best.length)return 'Attention aux majuscules et minuscules : la valeur doit être identique.';
  const x=t[n],e=best[n];
  if(x.length<e.length&&e.toLowerCase().startsWith(x.toLowerCase()))return 'Écris le mot n°'+(n+1)+' en entier : pas d’abréviation.';
  if(n===0)return 'Ce n’est pas la bonne commande. Relis la consigne.';
  return 'Le mot n°'+(n+1)+' est incorrect (« '+x+' »). Vérifie l’orthographe ou la valeur demandée.';
}

/* ---------- Interface ---------- */
const say=(x,c)=>{const m=$('#msg');m.textContent=x;m.className=c||''};
const bk=m=>m.id==='base'?'cm_best':'cm_best_'+m.id;
const best=m=>{try{return +localStorage.getItem(bk(m||MOD))||0}catch(e){return 0}};
/* ---------- Sauvegarde de la progression (par module) ---------- */
const sk=m=>'cm_save_'+m.id;
function saveGet(m){   /* renvoie la partie en cours, ou null s'il n'y en a pas */
  try{const d=JSON.parse(localStorage.getItem(sk(m)));
    return d&&Array.isArray(d.steps)&&d.i>0&&d.i<d.steps.length?d:null}catch(e){return null}
}
function saveSet(){   /* appelée après chaque bonne réponse : i+1 = prochaine étape à faire */
  try{localStorage.setItem(sk(MOD),JSON.stringify({steps,i:i+1,score,free,cfg,mode,host}))}catch(e){}
}
const saveDel=m=>{try{localStorage.removeItem(sk(m||MOD))}catch(e){}};
let pend=null;   /* partie sauvegardée en attente de la réponse « Continuer / Recommencer » */
function resume(d){steps=d.steps;total=steps.length*10;i=d.i;hl=0;er=0;free=d.free;score=d.score;mode=d.mode;host=d.host;cfg=d.cfg;show()}

function ladder(){
  const s=steps&&steps[i];if(s&&s.dev==='pc'){$('#ladder').innerHTML='<span class="lp on">Admin · Invite de commandes</span>';return}
  const k=mode==='user'?0:mode==='priv'?1:2;
  $('#ladder').innerHTML=['Utilisateur','Privilégié','Config. globale'].map((n,j)=>`<span class="lp ${j===k?'on':j<k?'pa':''}">${n}</span>`).join('');
}
const upH=()=>{$('#hb').textContent=free>0?'Indice ('+free+')':'Indice · Vidéo'};
function show(){
  const s=steps[i];hs=false;sub=false;if(s.at)mode=s.at;if(s.h)host=s.h;   /* at / h : mode et nom d’équipement imposés au début de l’étape */
  $('#final').innerHTML='';$('#q').style.display='';$('#ladder').style.display='';
  $('#cnt').textContent=(i+1)+' / '+steps.length;$('#pg').style.width=(i/steps.length*100)+'%';
  $('#ov').textContent='ÉTAPE '+(i+1)+' · '+(s.dev==='pc'?'PC ADMIN':MN[mode].toUpperCase());
  $('#mt').textContent=MOD.n;$('#qt').innerHTML=s.q;ladder();say('');upH();
  const im=s.img||MOD.img;$('#topo').hidden=!im;if(im)$('#timg').src=im;   /* img de l’étape (ex. module PPP : PAP puis CHAP) sinon image du module */
  $('#chips').innerHTML=(s.chips||MOD.chips).map(t=>{const[l,v]=Array.isArray(t)?t:[t,t];return '<button data-v="'+v+'"'+(l.length>3?' class="w"':'')+'>'+l+'</button>'}).join('');   /* chips de l’étape (module VoIP : indices différents à chaque partie) sinon ceux du module */
  $('#pr').textContent=(s.dev==='pc'?(MOD.pcp||'PC/>'):host+SUF[mode])+' ';
  const n=$('#inp');n.value='';n.disabled=false;$('#dock').dataset.s='ask';n.focus();
}
function win(s){
  const p=Math.max(10-3*hl-Math.min(er,3),1);score+=p;
  if(s.host)host=s.host;if(s.go)mode=s.go;if(s.cfg)cfg.push(...s.cfg);
  say('Correct ! +'+p+' pts. '+s.why,'g');ladder();
  if(i+1>=steps.length)finish();else saveSet();   /* dernière étape : partie terminée, plus rien à reprendre */
  $('#dock').dataset.s='ok';$('#inp').blur();$('#pg').style.width=((i+1)/steps.length*100)+'%';
}
function fail(x){er++;say(x,'e');const w=$('#inpw');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake')}
function submit(){
  const s=steps[i],v=$('#inp').value.replace(/\s+/g,' ').trim();
  if($('#dock').dataset.s!=='ask'||!v)return;
  if(sub){   /* 2e invite : « How many bits in the modulus » */
    if(s.then.ok.includes(v)){sub=false;win(s)}else fail(s.then.err);
    return;
  }
  if(s.then&&s.then.pre.some(a=>a.toLowerCase()===v.toLowerCase())){
    sub=true;hs=false;$('#pr').textContent=s.then.pr+' ';$('#inp').value='';say(s.then.info,'i');upH();return;
  }
  match(v,s)?win(s):fail(why(v,s));
}
function next(){i++;hl=0;er=0;i<steps.length?show():end()}
function finish(){   /* enregistre le meilleur score et efface la sauvegarde, même si on quitte avant « Continuer » */
  saveDel();const b=best();if(score>b){try{localStorage.setItem(bk(MOD),score)}catch(e){}}
}
function inter(){if(window.Android&&typeof Android.showInterstitial==='function')Android.showInterstitial()}   /* interstitielle : à chaque fin de mission */
function end(){
  finish();let b=best();
  const r=score/total,n=r>=.85?3:r>=.6?2:1;
  $('#q').style.display='none';$('#ladder').style.display='none';$('#topo').hidden=true;say('');$('#pg').style.width='100%';
  $('#dock').dataset.s='end';
  $('#final').innerHTML=`<div class="q fin"><p class="ov" style="display:block">MISSION TERMINÉE</p><h1>${'★'.repeat(n)+'☆'.repeat(3-n)}</h1><p>Score : ${score}/${total} · Meilleur : ${b}</p></div><button class="fill" id="again">Recommencer avec de nouvelles valeurs</button><button class="ton" style="height:3.2rem" data-go="mods">Retour aux modules</button>`;
  $('#again').onclick=start;
  setTimeout(inter,500);   /* pub à la fin de la mission */
}
function start(){saveDel();steps=MOD.build();total=steps.length*10;i=0;hl=0;er=0;free=FREE;score=0;mode=MOD.mode;host=MOD.host;cfg=[];show()}

/* ---------- Indice : seulement la bonne commande ; 2 gratuits, ensuite une publicité ---------- */
let adCb=null;
window.onAdReward=()=>{if(adCb){const f=adCb;adCb=null;f()}};   /* AdMob : pub regardée jusqu'au bout → récompense */
window.onAdSkip=()=>{adCb=null;$('#ad').hidden=true;say('Regarde la publicité jusqu’au bout pour obtenir l’indice.','e')};   /* AdMob : pub fermée avant la fin → pas d'indice */
window.onAdFail=()=>{adCb=null;$('#ad').hidden=true;say('Publicité indisponible. Réessaie dans un instant.','e')};   /* AdMob : échec de chargement */
function ad(cb){
  if(window.Android&&typeof Android.showRewardedAd==='function'){adCb=cb;Android.showRewardedAd();return}
  const o=$('#ad');let n=5;o.hidden=false;$('#adn').textContent=n;   /* simulation hors Android */
  const t=setInterval(()=>{n--;$('#adn').textContent=n;if(n<=0){clearInterval(t);o.hidden=true;cb()}},1000);
}
function reveal(){hs=true;hl=1;const s=steps[i],t=s.then;say(sub?t.ok[0]:s.ok[0]+(t?(t.pre[0]===s.ok[0]?'\npuis : ':'\nou : '+t.pre[0]+'  puis  ')+t.ok[0]:''),'h');upH()}
function hint(){
  if($('#dock').dataset.s!=='ask')return;
  if(hs)return reveal();
  if(free>0){free--;reveal()}else $('#adlg').hidden=false;   /* indices gratuits épuisés : dialogue pub */
}

/* ---------- Navigation ---------- */
const SC=['home','mods','set','train','bye'];
const openS=id=>{$(id).classList.add('open');$('#scrim').classList.add('open')};
const closeS=()=>{document.querySelectorAll('.sheet').forEach(x=>x.classList.remove('open'));$('#scrim').classList.remove('open')};
function go(id){
  closeS();
  if(window.Android&&typeof Android.setTop==='function')Android.setTop(id==='home'?'#0b2545':'');   /* couleur de la barre d'état */
SC.forEach(x=>$('#'+x).hidden=x!==id);
  if(id==='mods'){
    $('#grid').innerHTML=MODS.map(m=>m.build?`<button class="mc on" data-go="train" data-m="${m.id}"><b>${m.n}</b><small>${saveGet(m)?'En cours · '+saveGet(m).i+' / '+saveGet(m).steps.length:best(m)?'Meilleur : '+best(m)+' pts':'Disponible'}</small></button>`:`<div class="mc off"><b>${m.n}</b><small>Bientôt</small></div>`).join('');
  }
  if(id==='train'){if(pend){const d=pend;pend=null;resume(d)}else start()}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(!b)return;
  if(b.dataset.m){
    MOD=MODS.find(m=>m.id===b.dataset.m);
    const d=saveGet(MOD);
    if(d){   /* partie déjà commencée : on demande avant d'ouvrir l'entraînement */
      pend=d;
      $('#rdlg').hidden=false;return;
    }
  }
  go(b.dataset.go);
});
/* ---------- Bouton Retour Android : revient d'un cran ---------- */
window.__back=()=>{
  if(!$('#viewer').hidden){closeV();return true}
  if(!$('#ad').hidden)return true;
  for(const id of ['#adlg','#rdlg','#dlg'])if(!$(id).hidden){$(id).hidden=true;if(id==='#rdlg')pend=null;return true}
  if(document.querySelector('.sheet.open')){closeS();return true}
  const cur=SC.find(x=>!$('#'+x).hidden);
  if(cur==='train'){go('mods');return true}
  if(cur==='mods'||cur==='set'){go('home');return true}
  if(cur==='home'){$('#dlg').hidden=false;return true}
  return false;   /* écran « À bientôt » : on laisse Android fermer l'app */
};
$('#rGo').onclick=()=>{$('#rdlg').hidden=true;go('train')};
$('#rNew').onclick=()=>{$('#rdlg').hidden=true;pend=null;saveDel();go('train')};
$('#bQuit').onclick=()=>{$('#dlg').hidden=false};
$('#qNo').onclick=()=>{$('#dlg').hidden=true};
$('#qYes').onclick=()=>{
  $('#dlg').hidden=true;
  if(window.Android&&typeof Android.exitApp==='function'){Android.exitApp();return}   /* app Android : ferme l'activité */
  try{window.close()}catch(e){}
  go('bye');
};
$('#aNo').onclick=()=>{$('#adlg').hidden=true};
$('#aYes').onclick=()=>{
  $('#adlg').hidden=true;
  if(!navigator.onLine){say('Connexion Internet requise pour regarder la publicité.','e');return}   /* pas d'Internet : l'indice reste fermé */
  ad(reveal);                                                                                      /* l'indice s'ouvre seulement après la pub */
};
$('#how').onclick=()=>openS('#hsheet');$('#about').onclick=()=>openS('#asheet');
$('#cfgb').onclick=()=>{$('#cfg').textContent=cfg.length?cfg.join('\n'):'(vide pour le moment)';openS('#sheet')};
$('#scrim').onclick=closeS;
$('#inp').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
$('#go').onclick=submit;$('#nx').onclick=next;$('#hb').onclick=hint;
$('#chips').onpointerdown=e=>e.preventDefault();
$('#chips').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  const n=$('#inp'),a=n.selectionStart,z=n.selectionEnd,t=b.dataset.v,num=/^\d/.test(t),pre=n.value.slice(0,a);
  const ins=(num&&pre&&!/\s$/.test(pre)?' ':'')+t+(num?' ':'');   /* les valeurs IP s'écrivent avec leurs espaces */
  n.value=pre+ins+n.value.slice(z);n.focus();n.setSelectionRange((pre+ins).length,(pre+ins).length);
};

/* ---------- Pas de copier / coller / sélection ---------- */
['copy','cut','paste','contextmenu','dragstart','drop'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),true));
$('#inp').addEventListener('beforeinput',e=>{if(/^insertFrom|insertReplacementText|insertTranspose/.test(e.inputType))e.preventDefault()});

/* ---------- Image en grand : zoom à deux doigts, glisser, X ou toucher pour fermer ---------- */
const vw=$('#viewer'),vi=$('#vimg'),pts=new Map();
let sc=1,tx=0,ty=0,d0=0,s0=1,sx=0,sy=0,moved=false,multi=false,t0=0;
const place=()=>{vi.style.transform=`translate(${tx}px,${ty}px) scale(${sc})`};
const zoom=v=>{sc=Math.min(5,Math.max(1,v));if(sc===1){tx=ty=0}place()};
const closeV=()=>{vw.hidden=true;pts.clear()};
$('#topo').onclick=()=>{vi.src=$('#timg').src;sc=1;tx=ty=0;place();vw.hidden=false};
$('#vx').onclick=closeV;
vw.addEventListener('pointerdown',e=>{
  if(e.target.closest('#vx'))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});try{vw.setPointerCapture(e.pointerId)}catch(_){}
  if(pts.size===1){sx=e.clientX;sy=e.clientY;moved=false;multi=false;t0=Date.now()}
  else{multi=true;const[a,b]=[...pts.values()];d0=Math.hypot(a.x-b.x,a.y-b.y)||1;s0=sc}
});
vw.addEventListener('pointermove',e=>{
  const p=pts.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(e.clientX-sx,e.clientY-sy)>10)moved=true;
  if(pts.size===2){const[a,b]=[...pts.values()];zoom(s0*Math.hypot(a.x-b.x,a.y-b.y)/d0)}
  else if(sc>1){tx+=dx;ty+=dy;place()}
});
const up=e=>{
  if(!pts.delete(e.pointerId))return;
  if(!pts.size&&!moved&&!multi&&Date.now()-t0<400&&e.type==='pointerup')closeV();   /* simple toucher = fermer */
};
vw.addEventListener('pointerup',up);vw.addEventListener('pointercancel',up);
vw.addEventListener('wheel',e=>{e.preventDefault();zoom(sc*(e.deltaY<0?1.15:.87))},{passive:false});

/* ---------- Taille de police stable : l'apparition du clavier ne la change plus ---------- */
let FW=0,FH=0;
function fit(){
  const w=innerWidth,h=innerHeight;
  if(w!==FW){FW=w;FH=h}else FH=Math.max(FH,h);   /* le clavier ne fait que réduire la hauteur : on garde la plus grande */
  document.documentElement.style.fontSize=Math.min(22,Math.max(13,Math.min(w*.043,FH*.026)))+'px';
}
fit();addEventListener('resize',fit);