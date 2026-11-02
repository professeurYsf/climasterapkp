'use strict';
/* Dépend de catalog.js : registerModule.  Image : ripng.png
   Topologie : PC2 — S2 — R1 — R2 — S1 — PC1   +   R2 — Internet (S0/0/1)
   Si le cours change, modifier seulement ces constantes : */
const RNG_NAME='Test';            /* nom du processus : ipv6 router rip Test */
const RNG_SUB ='rtr';             /* sous-mode « (config-rtr)# » */

/* écritures acceptées d'une interface : G0/0 · Gi0/0 · Gig0/0 · GigabitEthernet0/0  /  S0/0/0 · Se0/0/0 · Serial0/0/0 */
function rngIf(kind,n){
  const g=kind==='G',t=g?['G','Gi','Gig','GigabitEthernet']:['S','Se','Serial'],p=g?'0/0':`0/0/${n}`,o=[];
  for(const cmd of['int','interface'])for(const x of t)for(const sp of['',' '])o.push(`${cmd} ${x}${sp}${p}`);
  return o;
}
const rngG=()=>{const o=[];for(const x of['G','Gi','Gig','GigabitEthernet'])for(const sp of['',' '])o.push(`${x}${sp}0/0`);return o};

function buildRng(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const noAS=['no auto-summary','no auto summary','no auto-sum','no auto sum'];
  const pass=rngG().map(g=>`passive-interface ${g}`);

  const proto=(R,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage IPv6</mark> (mono-diffusion)`,
      ['ipv6 unicast-routing'],
      {h:R,at:'cfg',cfg:first.concat(['ipv6 unicast-routing']),why:'Sans cette commande, le routeur ne transfère pas les paquets IPv6.'}),
    c(`Sur <mark>${R}</mark> : <mark>active le protocole RIPng</mark> avec le nom de processus <mark>${RNG_NAME}</mark>`,
      [`ipv6 router rip ${RNG_NAME}`],
      {h:R,at:'cfg',cfg:[`ipv6 router rip ${RNG_NAME}`],why:`Le nom « ${RNG_NAME} » n’a qu’une portée locale : il sert à relier les interfaces à ce processus.`})
  ];
  const iface=(R,kind,n,label)=>[
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>${label}</mark>`,
      rngIf(kind,n),
      {h:R,at:'cfg',cfg:[`interface ${kind==='G'?'GigabitEthernet0/0':'Serial0/0/'+n}`],why:`On passe en mode de configuration de l’interface ${label}.`}),
    c(`Sur <mark>${R}</mark> : <mark>active RIPng</mark> (processus <mark>${RNG_NAME}</mark>) sur cette interface`,
      [`ipv6 rip ${RNG_NAME} enable`],
      {h:R,at:'if',cfg:[` ipv6 rip ${RNG_NAME} enable`],why:'RIPng s’active interface par interface (pas avec « network » comme RIPv2).'})
  ];

  return[
    ...proto('R1',['! ===== R1 =====']),
    c('Sur <mark>R1</mark> : <mark>désactive la récapitulation automatique</mark>',
      noAS,
      {h:'R1',at:RNG_SUB,cfg:[' no auto-summary'],why:'On évite que RIP résume les réseaux à leur limite classfull.'}),
    c('Sur <mark>R1</mark> : <mark>désactive l’envoi des mises à jour</mark> sur l’interface <mark>G0/0</mark>',
      pass,
      {h:'R1',at:RNG_SUB,cfg:[' passive-interface GigabitEthernet0/0'],why:'Le LAN ne contient pas de routeur : inutile d’y envoyer des mises à jour RIPng.'}),
    ...iface('R1','S',0,'S0/0/0'),
    ...iface('R1','G',0,'G0/0'),

    ...proto('R2',['! ===== R2 =====']),
    ...iface('R2','S',0,'S0/0/0'),
    ...iface('R2','G',0,'G0/0'),

    c('Donne la commande permettant de <mark>vérifier les routes</mark> (table de routage IPv6) sur le <mark>R1</mark>',
      ['show ipv6 route'],
      {h:'R1',at:'priv',why:'show ipv6 route liste les routes : C (connectée), L (locale), R (RIP), S (statique).'}),
    c('Donne la commande permettant d’afficher <mark>uniquement les routes RIP</mark> sur le <mark>R1</mark>',
      ['show ipv6 route rip'],
      {h:'R1',at:'priv',why:'show ipv6 route rip filtre la table : seules les routes apprises par RIPng sont affichées.'})
  ];
}

registerModule({
  id:'ripng',build:buildRng,mode:'cfg',host:'R1',img:'ripng.png',
  modes:{rtr:['(config-rtr)#','Configuration du routage RIPng']},   /* ipv6 router rip → R1(config-rtr)# */
  chips:['ipv6 ','rip ','Test ','enable','show ']
});
