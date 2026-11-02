'use strict';
/* Dépend de catalog.js : registerModule.  Image : eigrp6.png  (id catalogue : eigrp6)
   Topologie : PC1 — S1 — R2 — R1 — S2 — PC2
   LAN2 2001:ACAD:2::/64 · liaison série 2001:CAFE::/64 · LAN1 2001:ACAD:1::/64
   Si le cours change, modifier seulement ces constantes : */
const E6_AS ='2';                 /* numéro de système autonome EIGRP */
const E6_ID1='1.1.1.1';           /* router-id de R1 */
const E6_ID2='2.2.2.2';           /* router-id de R2 */

/* écritures acceptées (forme complète en premier : c’est elle que l’indice affiche) */
function e6Int(full,n){const o=[];for(const k of['interface','int'])for(const x of full)for(const sp of['',' '])o.push(`${k} ${x}${sp}${n}`);return o}
const e6Gig=()=>e6Int(['GigabitEthernet','Gig','Gi','G'],'0/0');
const e6Ser=()=>e6Int(['Serial','Ser','Se','S'],'0/0/0');

function buildEigrp6(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  const block=(R,rid,first)=>[
    c(`Sur <mark>${R}</mark> : <mark>active le routage IPv6</mark>`,
      ['ipv6 unicast-routing'],
      {h:R,at:'cfg',cfg:first.concat(['ipv6 unicast-routing']),why:'Par défaut un routeur Cisco ne route pas l’IPv6 : cette commande active le routage de paquets IPv6.'}),
    c(`Sur <mark>${R}</mark> : <mark>active le routage EIGRP</mark> pour IPv6 avec le numéro de système autonome <mark>${E6_AS}</mark>`,
      [`ipv6 router eigrp ${E6_AS}`],
      {h:R,at:'cfg',go:'eig6',cfg:[`ipv6 router eigrp ${E6_AS}`],why:'ipv6 router eigrp 2 lance le processus EIGRP pour IPv6 ; le numéro doit être identique sur tous les routeurs voisins.'}),
    c(`Sur <mark>${R}</mark> : configure l’<mark>ID de routeur</mark> <mark>${rid}</mark>`,
      [`eigrp router-id ${rid}`],
      {h:R,at:'eig6',cfg:[` eigrp router-id ${rid}`],why:'EIGRP pour IPv6 exige un router-id de 32 bits au format IPv4 s’il n’y a aucune adresse IPv4 sur le routeur.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>`,
      e6Gig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'interface G0/0 ouvre le mode de configuration de l’interface connectée au LAN.'}),
    c(`Sur <mark>${R}</mark> : active <mark>EIGRP ${E6_AS}</mark> sur cette interface`,
      [`ipv6 eigrp ${E6_AS}`],
      {h:R,at:'if',cfg:[` ipv6 eigrp ${E6_AS}`],why:'En EIGRP pour IPv6 il n’y a pas de commande network : on active le protocole directement sur l’interface.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>S0/0/0</mark>`,
      e6Ser(),
      {h:R,at:'cfg',go:'if',cfg:['interface Serial0/0/0'],why:'interface S0/0/0 ouvre le mode de configuration de la liaison série vers l’autre routeur.'}),
    c(`Sur <mark>${R}</mark> : active <mark>EIGRP ${E6_AS}</mark> sur cette interface`,
      [`ipv6 eigrp ${E6_AS}`],
      {h:R,at:'if',cfg:[` ipv6 eigrp ${E6_AS}`],why:'La liaison série 2001:CAFE::/64 participe à EIGRP : les deux routeurs peuvent devenir voisins.'})
  ];

  return[
    ...block('R1',E6_ID1,['! ===== R1 =====']),
    ...block('R2',E6_ID2,['! ===== R2 =====']),

    c('Sur <mark>R1</mark> : affiche la <mark>table de voisinage</mark> EIGRP pour IPv6',
      shw('ipv6 eigrp neighbors').concat(shw('ipv6 eigrp neighbor')),
      {h:'R1',at:'priv',why:'show ipv6 eigrp neighbors affiche les voisins EIGRP IPv6 (adresses link-local), l’interface et le temps de retransmission.'})
  ];
}

registerModule({
  id:'eigrp6',build:buildEigrp6,mode:'cfg',host:'R1',img:'eigrp6.png',
  modes:{eig6:['(config-rtr)#','Configuration du routage EIGRP IPv6']},   /* R1(config-rtr)# */
  chips:['ipv6 ','unicast-routing','show ','S0/0/0']
});
