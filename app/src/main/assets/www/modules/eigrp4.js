'use strict';
/* Dépend de catalog.js : registerModule.  Image : eigrp.png  (id catalogue : eigrp4)
   Topologie : PC1 — S1 — R2 — R1 — S2 — PC2
   Si le cours change, modifier seulement ces constantes : */
const E4_AS  ='1';               /* numéro de système autonome EIGRP */
const E4_ID1 ='1.1.1.1';         /* router-id de R1 */
const E4_ID2 ='2.2.2.2';         /* router-id de R2 */
const E4_WAN ='30.0.0.0';        /* liaison R1 — R2 (/30) */
const E4_WANW='0.0.0.3';         /* wildcard du /30       */
const E4_LAN1='192.168.1.0';     /* LAN1 (derrière R1)    */
const E4_LAN2='192.168.2.0';     /* LAN2 (derrière R2)    */
const E4_LANW='0.0.0.255';       /* wildcard du /24       */

/* préfixes acceptés : net = network ; sh = show. Forme complète en premier : c’est elle que l’indice affiche */
const e4Pre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};

function buildEigrp4(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const net=(a,w)=>e4Pre('network',3).map(x=>`${x} ${a} ${w}`);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  const block=(R,rid,lan,lanLabel,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage EIGRP</mark> avec le numéro de système autonome <mark>${E4_AS}</mark>`,
      [`router eigrp ${E4_AS}`],
      {h:R,at:'cfg',go:'eig4',cfg:first.concat([`router eigrp ${E4_AS}`]),why:'router eigrp 1 lance le processus EIGRP ; le numéro doit être identique sur tous les routeurs voisins.'}),
    c(`Sur <mark>${R}</mark> : configure l’<mark>ID de routeur</mark> <mark>${rid}</mark>`,
      [`eigrp router-id ${rid}`],
      {h:R,at:'eig4',cfg:[` eigrp router-id ${rid}`],why:'Le router-id identifie le routeur dans EIGRP ; il est choisi manuellement ici au lieu de dépendre des adresses des interfaces.'}),
    c(`Sur <mark>${R}</mark> : annonce le réseau du <mark>${lanLabel}</mark> <mark>${lan}</mark> (wildcard <mark>${E4_LANW}</mark>)`,
      net(lan,E4_LANW),
      {h:R,at:'eig4',cfg:[` network ${lan} ${E4_LANW}`],why:`Le LAN ${lan}/24 est connecté à ${R} ; 0.0.0.255 est le wildcard d’un /24.`}),
    c(`Sur <mark>${R}</mark> : annonce le réseau de la <mark>liaison série</mark> <mark>${E4_WAN}</mark> (wildcard <mark>${E4_WANW}</mark>)`,
      net(E4_WAN,E4_WANW),
      {h:R,at:'eig4',cfg:[` network ${E4_WAN} ${E4_WANW}`],why:'0.0.0.3 correspond à un /30 : EIGRP active alors le protocole sur l’interface série et forme l’adjacence.'})
  ];

  return[
    ...block('R1',E4_ID1,E4_LAN1,'LAN1',['! ===== R1 =====']),
    ...block('R2',E4_ID2,E4_LAN2,'LAN2',['! ===== R2 =====']),

    c('Sur <mark>R1</mark> : affiche la <mark>table de voisinage</mark> EIGRP',
      shw('ip eigrp neighbors').concat(shw('ip eigrp neighbor')),
      {h:'R1',at:'priv',why:'show ip eigrp neighbors affiche les voisins EIGRP, l’interface utilisée, le Hold time et le SRTT.'}),
    c('Sur <mark>R1</mark> : affiche la <mark>table topologique</mark> EIGRP',
      shw('ip eigrp topology'),
      {h:'R1',at:'priv',why:'show ip eigrp topology affiche les routes connues : successeurs (Successor) et successeurs potentiels (Feasible Successor).'})
  ];
}

registerModule({
  id:'eigrp4',build:buildEigrp4,mode:'cfg',host:'R1',img:'eigrp.png',
  modes:{eig4:['(config-router)#','Configuration du routage EIGRP']},   /* R1(config-router)# */
  chips:['network ',E4_LAN1,E4_LAN2,'show ']
});
