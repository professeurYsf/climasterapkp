'use strict';
/* Dépend de catalog.js : registerModule.  Image : ospf.png (id catalogue : ospf2)
   Topologie : PC1 — S1 — R2 — R1 — S2 — PC2
   Si le cours change, modifier seulement ces constantes : */
const OSPF_PID ='10';                 /* numéro de processus / système autonome */
const OSPF_WAN ='30.0.0.0';           /* liaison R1 — R2 (/30) */
const OSPF_WANW='0.0.0.3';            /* wildcard du /30       */
const OSPF_LAN1='192.168.1.0';        /* LAN1 (derrière R1)    */
const OSPF_LAN2='192.168.2.0';        /* LAN2 (derrière R2)    */
const OSPF_LANW='0.0.0.255';          /* wildcard du /24       */
const OSPF_SUB ='ospf';               /* nom du sous-mode « (config-router)# » (déclaré plus bas) */

/* préfixes acceptés : net = network ; sh = show. Forme complète en premier : c’est elle que l’indice affiche */
const ospfPre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};

/* écritures acceptées pour « interface G0/0 » : int / interface + G, Gi, Gig, GigabitEthernet (forme complète en premier) */
function ospfGig(){const o=[];for(const k of['interface','int'])for(const x of['GigabitEthernet','Gig','Gi','G'])for(const sp of['',' '])o.push(`${k} ${x}${sp}0/0`);return o}

function buildOspf(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const rou =()=>[`router ospf ${OSPF_PID}`];
  const net =(a,w)=>ospfPre('network',3).map(x=>`${x} ${a} ${w} area 0`);
  const shw =rest=>['show','sh'].map(x=>`${x} ${rest}`);

  const block=(R,lan,lanLabel,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage OSPFv2</mark> avec le numéro de système autonome <mark>${OSPF_PID}</mark>`,
      rou(),
      {h:R,at:'cfg',cfg:first.concat([`router ospf ${OSPF_PID}`]),why:'router ospf 10 lance le processus OSPF (le numéro n’a qu’une valeur locale) et ouvre son mode de configuration.'}),
    c(`Sur <mark>${R}</mark> : annonce le réseau de la <mark>liaison série</mark> <mark>${OSPF_WAN}</mark> (wildcard <mark>${OSPF_WANW}</mark>) dans l’<mark>area 0</mark>`,
      net(OSPF_WAN,OSPF_WANW),
      {h:R,at:OSPF_SUB,cfg:[` network ${OSPF_WAN} ${OSPF_WANW} area 0`],why:'OSPF utilise un masque générique (wildcard) : 0.0.0.3 correspond à un /30. L’area 0 est l’aire de backbone.'}),
    c(`Sur <mark>${R}</mark> : annonce le réseau du <mark>${lanLabel}</mark> <mark>${lan}</mark> (wildcard <mark>${OSPF_LANW}</mark>) dans l’<mark>area 0</mark>`,
      net(lan,OSPF_LANW),
      {h:R,at:OSPF_SUB,cfg:[` network ${lan} ${OSPF_LANW} area 0`],why:`Le LAN ${lan}/24 est connecté à ${R} ; 0.0.0.255 est le wildcard d’un /24.`})
  ];

  return[
    ...block('R1',OSPF_LAN1,'LAN1',['! ===== R1 =====']),
    ...block('R2',OSPF_LAN2,'LAN2',['! ===== R2 =====']),

    c('Sur <mark>R1</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>',
      ospfGig(),
      {h:'R1',at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'interface G0/0 ouvre le mode de configuration de l’interface connectée au LAN1.'}),
    c('Sur <mark>R1</mark> : modifie la <mark>priorité OSPF</mark> de l’interface à <mark>255</mark>',
      ['ip ospf priority 255'],
      {h:'R1',at:'if',cfg:[' ip ospf priority 255'],why:'La priorité (0 à 255) sert à l’élection du DR/BDR : la plus haute gagne ; 0 interdit à l’interface de devenir DR.'}),
    c('Sur <mark>R1</mark> : <mark>efface le processus de routage OSPF</mark>',
      ['clear ip ospf process'],
      {h:'R1',at:'priv',why:'clear ip ospf process redémarre OSPF : les adjacences sont recréées et la nouvelle priorité / le nouveau Router ID est pris en compte.'}),

    c('Sur <mark>R1</mark> : affiche la <mark>table des voisins</mark> OSPF',
      shw('ip ospf neighbor').concat(shw('ip ospf neighbors')),
      {h:'R1',at:'priv',why:'show ip ospf neighbor affiche les voisins, leur état (FULL) et l’interface utilisée.'}),
    c('Sur <mark>R1</mark> : affiche les <mark>informations générales</mark> du processus OSPF',
      shw('ip ospf'),
      {h:'R1',at:'priv',why:'show ip ospf affiche le Router ID, les aires, le nombre d’exécutions de SPF et les temporisateurs.'}),
    c('Sur <mark>R1</mark> : affiche la <mark>table de routage</mark>',
      shw('ip route'),
      {h:'R1',at:'priv',why:'show ip route liste les routes : C (connectée), L (locale) et O (apprise par OSPF, ici le LAN2).'})
  ];
}

registerModule({
  id:'ospf2',build:buildOspf,mode:'cfg',host:'R1',img:'ospf.png',
  modes:{ospf:['(config-router)#','Configuration du routage OSPF']},   /* R1(config-router)# */
  chips:['network ',OSPF_LAN1,OSPF_LAN2,'show ']
});
