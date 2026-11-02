'use strict';
/* Dépend de catalog.js : registerModule.  Image : ospf3.png  (id catalogue : ospf3)
   Topologie : PC1 — S1 — R2 — R1 — S2 — PC2
   LAN2 2001:ACAD:2::/64 · liaison série 2001:CAFE::/64 · LAN1 2001:ACAD:1::/64
   Si le cours change, modifier seulement ces constantes : */
const O3_PID='20';                /* numéro de processus OSPFv3 */
const O3_ID1='1.1.1.1';           /* router-id de R1 */
const O3_ID2='2.2.2.2';           /* router-id de R2 */

/* écritures acceptées (forme complète en premier : c’est elle que l’indice affiche) */
function o3Int(full,short,n){const o=[];for(const k of['interface','int'])for(const x of full)for(const sp of['',' '])o.push(`${k} ${x}${sp}${n}`);return o}
const o3Gig=()=>o3Int(['GigabitEthernet','Gig','Gi','G'],'G','0/0');
const o3Ser=()=>o3Int(['Serial','Ser','Se','S'],'S','0/0/0');

function buildOspf3(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  const block=(R,rid,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage IPv6</mark>`,
      ['ipv6 unicast-routing'],
      {h:R,at:'cfg',cfg:first.concat(['ipv6 unicast-routing']),why:'Par défaut un routeur Cisco ne route pas l’IPv6 : cette commande active le routage de paquets IPv6.'}),
    c(`Sur <mark>${R}</mark> : <mark>active le routage OSPFv3</mark> avec le numéro de processus <mark>${O3_PID}</mark>`,
      [`ipv6 router ospf ${O3_PID}`],
      {h:R,at:'cfg',go:'rtr',cfg:[`ipv6 router ospf ${O3_PID}`],why:'ipv6 router ospf 20 lance le processus OSPFv3 et ouvre son mode de configuration (config-rtr).'}),
    c(`Sur <mark>${R}</mark> : configure l’<mark>ID de routeur</mark> <mark>${rid}</mark>`,
      [`router-id ${rid}`],
      {h:R,at:'rtr',cfg:[` router-id ${rid}`],why:'OSPFv3 exige un router-id de 32 bits au format IPv4, même sur un réseau 100 % IPv6.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>`,
      o3Gig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'interface G0/0 ouvre le mode de configuration de l’interface connectée au LAN.'}),
    c(`Sur <mark>${R}</mark> : active <mark>OSPFv3 ${O3_PID}</mark> sur cette interface dans l’<mark>area 0</mark>`,
      [`ipv6 ospf ${O3_PID} area 0`],
      {h:R,at:'if',cfg:[` ipv6 ospf ${O3_PID} area 0`],why:'En OSPFv3 il n’y a plus de commande network : on affecte l’interface à une aire directement.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>S0/0/0</mark>`,
      o3Ser(),
      {h:R,at:'cfg',go:'if',cfg:['interface Serial0/0/0'],why:'interface S0/0/0 ouvre le mode de configuration de la liaison série vers l’autre routeur.'}),
    c(`Sur <mark>${R}</mark> : active <mark>OSPFv3 ${O3_PID}</mark> sur cette interface dans l’<mark>area 0</mark>`,
      [`ipv6 ospf ${O3_PID} area 0`],
      {h:R,at:'if',cfg:[` ipv6 ospf ${O3_PID} area 0`],why:'La liaison série 2001:CAFE::/64 rejoint l’area 0 : les deux routeurs peuvent devenir voisins.'})
  ];

  return[
    ...block('R1',O3_ID1,['! ===== R1 =====']),
    ...block('R2',O3_ID2,['! ===== R2 =====']),

    c('Sur <mark>R1</mark> : affiche la <mark>table de voisinage</mark> OSPFv3',
      shw('ipv6 ospf neighbor').concat(shw('ipv6 ospf neighbors')),
      {h:'R1',at:'priv',why:'show ipv6 ospf neighbor affiche les voisins OSPFv3, leur état (FULL) et l’interface utilisée.'}),
    c('Sur <mark>R1</mark> : vérifie la <mark>table de routage IPv6</mark> : <mark>uniquement les routes OSPF</mark>',
      shw('ipv6 route ospf'),
      {h:'R1',at:'priv',why:'show ipv6 route ospf filtre la table : les routes apprises par OSPF sont repérées par la lettre O.'})
  ];
}

registerModule({
  id:'ospf3',build:buildOspf3,mode:'cfg',host:'R1',img:'ospf3.png',
  modes:{rtr:['(config-rtr)#','Configuration du routage OSPFv3']},   /* R1(config-rtr)# */
  chips:['ipv6 ','ospf ','area 0','show ']
});
