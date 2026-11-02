'use strict';
/* Dépend de catalog.js : registerModule.  Image : rip.png
   Topologie : PC2 — S2 — R1 — R2 — S1 — PC1   +   R2 — Internet (S0/0/1)
   Si le cours change, modifier seulement ces constantes : */
const RIP_WAN ='30.0.0.0';        /* liaison R1 — R2 (/30) */
const RIP_LAN1='192.168.1.0';     /* LAN1 (derrière R1)    */
const RIP_LAN2='192.168.2.0';     /* LAN2 (derrière R2)    */
const RIP_SUB ='router';          /* nom du sous-mode « (config-router)# » dans app.js */

/* préfixes acceptés : ver = version · net = network */
const ripPre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};   /* forme complète en premier : c’est elle que l’indice affiche */

/* écritures acceptées pour S0/0/n et G0/0 */
function ripSer(n){const o=[];for(const x of['S','Se','Serial'])for(const sp of['',' '])o.push(`${x}${sp}0/0/${n}`);return o}
function ripGig(){const o=[];for(const x of['G','Gi','Gig','GigabitEthernet'])for(const sp of['',' '])o.push(`${x}${sp}0/0`);return o}

function buildRip(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const ver  =()=>ripPre('version',3).map(x=>`${x} 2`);
  const net  =a=>ripPre('network',3).map(x=>`${x} ${a}`);
  const noAS =()=>['no auto-summary','no auto summary','no auto-sum','no auto sum'];
  const pass =()=>ripGig().map(g=>`passive-interface ${g}`);
  const defR =s=>ripSer(1).map(x=>`ip route 0.0.0.0 0.0.0.0 ${x}`);

  /* bloc RIP commun : router rip · version 2 · 2 × network · no auto-summary · passive-interface */
  const block=(R,lan,lanLabel,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage RIP</mark>`,
      ['router rip'],
      {h:R,at:'cfg',cfg:first.concat(['router rip']),why:'router rip lance le processus RIP et ouvre son mode de configuration.'}),
    c(`Sur <mark>${R}</mark> : utilise la <mark>version 2</mark> de RIP`,
      ver(),
      {h:R,at:RIP_SUB,cfg:[' version 2'],why:'RIPv2 transporte le masque de sous-réseau et utilise la multidiffusion 224.0.0.9.'}),
    c(`Sur <mark>${R}</mark> : annonce le réseau de la <mark>liaison série</mark> <mark>${RIP_WAN}</mark>`,
      net(RIP_WAN),
      {h:R,at:RIP_SUB,cfg:[` network ${RIP_WAN}`],why:'RIP annonce les réseaux classfull directement connectés : ici le réseau 30.0.0.0.'}),
    c(`Sur <mark>${R}</mark> : annonce le réseau du <mark>${lanLabel}</mark> <mark>${lan}</mark>`,
      net(lan),
      {h:R,at:RIP_SUB,cfg:[` network ${lan}`],why:`Le LAN ${lan}/24 est connecté à ${R} ; on l’annonce à son voisin.`}),
    c(`Sur <mark>${R}</mark> : <mark>désactive la récapitulation automatique</mark>`,
      noAS(),
      {h:R,at:RIP_SUB,cfg:[' no auto-summary'],why:'Sans cela, RIP résume les réseaux à leur limite classfull (192.168.0.0/16 par exemple).'}),
    c(`Sur <mark>${R}</mark> : <mark>désactive l’envoi des mises à jour</mark> sur l’interface <mark>Gig0/0</mark>`,
      pass(),
      {h:R,at:RIP_SUB,cfg:[' passive-interface GigabitEthernet0/0'],why:'Le LAN ne contient pas de routeur : inutile d’y envoyer des mises à jour RIP.'})
  ];

  return[
    ...block('R1',RIP_LAN1,'LAN1',['! ===== R1 =====']),

    c('Sur <mark>R2</mark> : crée une <mark>route par défaut</mark> vers Internet via l’interface <mark>S0/0/1</mark>',
      defR(),
      {h:'R2',at:'cfg',cfg:['! ===== R2 =====','ip route 0.0.0.0 0.0.0.0 Serial0/0/1'],why:'0.0.0.0 0.0.0.0 correspond à n’importe quelle destination : c’est la route de dernier recours.'}),

    ...block('R2',RIP_LAN2,'LAN2',[]),

    c('Sur <mark>R2</mark> : <mark>propage la route par défaut</mark> aux autres routeurs RIP',
      ['default-information originate'],
      {h:'R2',at:RIP_SUB,cfg:[' default-information originate'],why:'R2 annonce sa route par défaut à R1 : R1 la reçoit comme route RIP (R*).'}),

    c('Donne la commande permettant d’afficher la <mark>table de routage</mark> sur le <mark>R1</mark>',
      ['show ip route'],
      {h:'R1',at:'priv',why:'show ip route liste les routes : C (connectée), R (RIP), S (statique), R* (route par défaut apprise).'}),
    c('Donne la commande permettant d’afficher les <mark>protocoles de routage</mark> actifs sur le <mark>R1</mark>',
      ['show ip protocols'],
      {h:'R1',at:'priv',why:'show ip protocols affiche la version de RIP, les réseaux annoncés, les interfaces passives et les voisins.'}),
    c('Donne la commande permettant d’afficher <mark>uniquement les routes RIP</mark> sur le <mark>R1</mark>',
      ['show ip route rip'],
      {h:'R1',at:'priv',why:'show ip route rip filtre la table de routage : seules les routes apprises par RIP sont affichées.'})
  ];
}

registerModule({
  id:'rip',build:buildRip,mode:'cfg',host:'R1',img:'rip.png',
  modes:{router:['(config-router)#','Configuration du routage RIP']},   /* nouveau mode : R1(config-router)# */
  chips:[RIP_WAN,'network ','rip',RIP_LAN1,'show ']
});
