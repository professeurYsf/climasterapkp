'use strict';
/* Dépend de catalog.js : registerModule.  Image : static6.png
   Topologie : PC1 — S1 — R1 — R2 — S2 — PC2   +   R1 — Internet (S0/0/1)
   Si le cours change, modifier seulement ces constantes : */
const ST6_LAN1='2001:ACAD:1::';   /* LAN de R1 (PC1)            */
const ST6_LAN2='2001:ACAD:2::';   /* LAN de R2 (PC2)            */
const ST6_WAN ='2001:CAFE::';     /* liaison R1 — R2            */
const ST6_NET ='2003:ABCD::';     /* liaison R1 — Internet      */
const ST6_LL  ='FE80::1';         /* link-local de R1           */

/* Casse libre pour les adresses : 2001:ACAD:1::1/64 = 2001:acad:1::1/64 */
function st6Case(a){return[...new Set([a,a.toUpperCase(),a.toLowerCase()])]}

/* Écritures acceptées d'une interface : G0/0/0 · Gi0/0/0 · Gig0/0/0 · GigabitEthernet0/0/0 …
   (type 'S' pour série : S0/0/0 · Se0/0/0 · Serial0/0/0 …) */
function st6If(kind,n){
  const t=kind==='G'?['G','Gi','Gig','GigabitEthernet']:['S','Se','Serial'];
  const p=kind==='G'?'0/0':`0/0/${n}`;   /* G0/0 (Gigabit) · S0/0/n (série) */
  const o=[];
  for(const cmd of['int','interface'])for(const x of t)for(const sp of['',' '])o.push(`${cmd} ${x}${sp}${p}`);
  return o;
}
const st6Ser=n=>{const o=[];for(const x of['S','Se','Serial'])for(const sp of['',' '])o.push(`${x}${sp}0/0/${n}`);return o};

function buildSt6(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  /* abréviations acceptées : ipv6 add · ipv6 addr … ipv6 address  /  no sh · no shut … no shutdown */
  const ADD=['add','addr','addre','addres','address'].map(x=>`ipv6 ${x}`);
  const addr=(a)=>ADD.flatMap(p=>st6Case(`${p} ${a}`));
  const ll=()=>ADD.flatMap(p=>st6Case(`${p} ${ST6_LL} link-local`));
  const noSh=['sh','shu','shut','shutd','shutdo','shutdow','shutdown'].map(x=>`no ${x}`);
  const route=(net,hop)=>st6Ser(hop).flatMap(s=>st6Case(`ipv6 route ${net} ${s}`));

  /* ----- bloc d'interface : entrée + adresse globale + link-local + no shutdown ----- */
  const ifaceBlock=(kind,n,label,net,global)=>[
    c(`Sur <mark>R1</mark> : entre dans la configuration de l’interface <mark>${label}</mark>`,
      st6If(kind,n),
      {h:'R1',at:'cfg',cfg:['! ===== R1 =====',`interface ${kind==='G'?'GigabitEthernet0/0':'Serial0/0/'+n}`],why:`On passe en mode de configuration de l’interface ${label}.`}),
    c(`Donne l’<mark>adresse IPv6 globale</mark> de cette interface : <mark>${global}</mark>`,
      addr(global),
      {h:'R1',at:'if',cfg:[` ipv6 address ${global}`],why:`Le réseau ${net}/64 est connecté à cette interface ; R1 prend l’hôte ::1.`}),
    c(`Donne l’adresse <mark>link-local</mark> de cette interface : <mark>${ST6_LL}</mark>`,
      ll(),
      {h:'R1',at:'if',cfg:[` ipv6 address ${ST6_LL} link-local`],why:'Une adresse link-local (FE80::/10) ne sort pas du lien ; on la fixe pour la retenir facilement.'}),
    c('<mark>Active</mark> l’interface',
      noSh,
      {h:'R1',at:'if',cfg:[' no shutdown'],why:'Une interface de routeur est désactivée par défaut : no shutdown la met en marche.'})
  ];

  return[
    ...ifaceBlock('G',0,'G0/0',ST6_LAN1,`${ST6_LAN1}1/64`),
    ...ifaceBlock('S',0,'S0/0/0',ST6_WAN,`${ST6_WAN}1/64`),
    ...ifaceBlock('S',1,'S0/0/1',ST6_NET,`${ST6_NET}1/64`),

    c('Sur <mark>R1</mark> : <mark>active le routage IPv6</mark> (mono-diffusion)',
      ['ipv6 unicast-routing'],
      {h:'R1',at:'cfg',cfg:['ipv6 unicast-routing'],why:'Sans cette commande, le routeur ne transfère pas les paquets IPv6.'}),

    c(`Sur <mark>R1</mark> : crée une route statique vers <mark>${ST6_LAN2}/64</mark> en utilisant l’<mark>interface de sortie</mark> <mark>S0/0/0</mark>`,
      route(`${ST6_LAN2}/64`,0),
      {h:'R1',at:'cfg',cfg:[`ipv6 route ${ST6_LAN2}/64 Serial0/0/0`],why:'R1 envoie vers S0/0/0 tout le trafic destiné au LAN de R2.'}),

    c(`Sur <mark>R2</mark> : crée une route statique vers <mark>${ST6_LAN1}/64</mark> en utilisant l’<mark>interface de sortie</mark> <mark>S0/0/0</mark>`,
      route(`${ST6_LAN1}/64`,0),
      {h:'R2',at:'cfg',cfg:['! ===== R2 =====',`ipv6 route ${ST6_LAN1}/64 Serial0/0/0`],why:'R2 envoie vers S0/0/0 tout le trafic destiné au LAN de R1.'}),

    c('Sur <mark>R1</mark> : crée une <mark>route par défaut</mark> vers Internet via l’interface <mark>S0/0/1</mark>',
      route('::/0',1),
      {h:'R1',at:'cfg',cfg:['! ===== R1 =====','ipv6 route ::/0 Serial0/0/1'],why:'::/0 correspond à n’importe quelle destination : c’est la route de dernier recours.'}),

    c('Donne la commande permettant d’afficher la <mark>table de routage IPv6</mark> sur le <mark>R1</mark>',
      ['show ipv6 route'],
      {h:'R1',at:'priv',why:'show ipv6 route liste les routes : C (connectée), L (locale), S (statique), ::/0 pour la route par défaut.'})
  ];
}

registerModule({
  id:'static6',build:buildSt6,mode:'cfg',host:'R1',img:'static6.png',
  chips:['2001:ACAD:1::/64','FE80::1','2001:CAFE::/64','no sh']
});
