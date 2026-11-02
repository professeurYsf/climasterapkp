'use strict';
/* Dépend de catalog.js : registerModule.  Image : dhcp6.png  (id catalogue : dhcp6)
   Topologie : PC1 — S1 — R1 — R2 — S2 — PC2   (liaison série 2000:AB:1::/64)
   R1 : serveur DHCPv6 AVEC état (stateful) · R2 : serveur DHCPv6 SANS état (stateless)
   Si le cours change, modifier seulement ces constantes : */
const D6_P1   ='TEST1';                 /* pool de R1 (sensible à la casse) */
const D6_P2   ='TEST2';                 /* pool de R2 (sensible à la casse) */
const D6_PFX  ='2001:db8:1::/64';       /* préfixe distribué par R1 */
const D6_DNS1 ='2001:db8:1::1';         /* DNS annoncé par R1 */
const D6_DNS2 ='2001:db8:2::1';         /* DNS annoncé par R2 */
const D6_DOM1 ='profysf.ma';            /* domaine annoncé par R1 */
const D6_DOM2 ='profysf.com';           /* domaine annoncé par R2 */

/* écritures acceptées pour « interface G0/0 » : forme complète en premier (c’est elle que l’indice affiche) */
function d6Gig(){const o=[];for(const k of['interface','int'])for(const x of['GigabitEthernet','Gig','Gi','G'])for(const sp of['',' '])o.push(`${k} ${x}${sp}0/0`);return o}

function buildDhcp6(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  return[
    /* ---------- R1 : DHCPv6 avec état ---------- */
    c('Sur <mark>R1</mark> : <mark>active le routage IPv6</mark>',
      ['ipv6 unicast-routing'],
      {h:'R1',at:'cfg',cfg:['! ===== R1 =====','ipv6 unicast-routing'],why:'Par défaut un routeur Cisco ne route pas l’IPv6 : cette commande active le routage de paquets IPv6.'}),
    c(`Sur <mark>R1</mark> : crée le <mark>pool DHCPv6</mark> nommé <mark>${D6_P1}</mark>`,
      [`ipv6 dhcp pool ${D6_P1}`],
      {h:'R1',at:'cfg',go:'dhcp6',v:[D6_P1],cfg:[`ipv6 dhcp pool ${D6_P1}`],why:'ipv6 dhcp pool crée le pool et ouvre son mode de configuration (config-dhcpv6).'}),
    c(`Sur <mark>R1</mark> : distribue des adresses du <mark>préfixe</mark> <mark>${D6_PFX}</mark> (DHCPv6 avec état)`,
      [`address prefix ${D6_PFX}`],
      {h:'R1',at:'dhcp6',cfg:[` address prefix ${D6_PFX}`],why:'address prefix rend le serveur « stateful » : il attribue et mémorise les adresses des clients.'}),
    c(`Sur <mark>R1</mark> : définis le <mark>serveur DNS</mark> <mark>${D6_DNS1}</mark>`,
      [`dns-server ${D6_DNS1}`],
      {h:'R1',at:'dhcp6',cfg:[` dns-server ${D6_DNS1}`],why:'Les clients utiliseront ce serveur pour résoudre les noms de domaine.'}),
    c(`Sur <mark>R1</mark> : définis le <mark>nom de domaine</mark> <mark>${D6_DOM1}</mark>`,
      [`domain-name ${D6_DOM1}`],
      {h:'R1',at:'dhcp6',v:[D6_DOM1],cfg:[` domain-name ${D6_DOM1}`],why:'Le nom de domaine est transmis aux clients avec leur configuration.'}),
    c('Sur <mark>R1</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>, celle qui doit offrir le service DHCPv6 au LAN',
      d6Gig(),
      {h:'R1',at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'interface G0/0 est l’interface connectée au LAN dont les clients demandent une adresse.'}),
    c(`Sur <mark>R1</mark> : <mark>attribue le pool</mark> <mark>${D6_P1}</mark> à cette interface en activant le <mark>serveur DHCPv6</mark>`,
      [`ipv6 dhcp server ${D6_P1}`],
      {h:'R1',at:'if',v:[D6_P1],cfg:[` ipv6 dhcp server ${D6_P1}`],why:'ipv6 dhcp server lie le pool à l’interface : le routeur répond maintenant aux requêtes DHCPv6 des clients.'}),
    c('Sur <mark>R1</mark> : dis aux clients d’obtenir leur <mark>adresse IPv6 auprès du serveur DHCPv6</mark> (active le <mark>flag M</mark>)',
      ['ipv6 nd managed-config-flag'],
      {h:'R1',at:'if',cfg:[' ipv6 nd managed-config-flag'],why:'Le flag M (Managed) est annoncé dans les messages RA : les clients demandent leur adresse en DHCPv6.'}),
    c('Sur <mark>R1</mark> : vérifie le <mark>serveur avec état</mark> en affichant les <mark>liaisons DHCPv6</mark>',
      shw('ipv6 dhcp binding'),
      {h:'R1',at:'priv',why:'show ipv6 dhcp binding affiche les clients, leurs adresses attribuées et la durée du bail.'}),

    /* ---------- R2 : DHCPv6 sans état ---------- */
    c(`Sur <mark>R2</mark> : crée le <mark>pool DHCPv6</mark> sans état nommé <mark>${D6_P2}</mark>`,
      [`ipv6 dhcp pool ${D6_P2}`],
      {h:'R2',at:'cfg',go:'dhcp6',v:[D6_P2],cfg:['! ===== R2 =====',`ipv6 dhcp pool ${D6_P2}`],why:'Un pool sans « address prefix » est « stateless » : il ne distribue que des options (DNS, domaine).'}),
    c(`Sur <mark>R2</mark> : définis le <mark>serveur DNS</mark> <mark>${D6_DNS2}</mark>`,
      [`dns-server ${D6_DNS2}`],
      {h:'R2',at:'dhcp6',cfg:[` dns-server ${D6_DNS2}`],why:'Le serveur DNS est transmis aux clients, qui se configurent seuls leur adresse (SLAAC).'}),
    c(`Sur <mark>R2</mark> : définis le <mark>nom de domaine</mark> <mark>${D6_DOM2}</mark>`,
      [`domain-name ${D6_DOM2}`],
      {h:'R2',at:'dhcp6',v:[D6_DOM2],cfg:[` domain-name ${D6_DOM2}`],why:'Le nom de domaine est une option transmise aux clients.'}),
    c('Sur <mark>R2</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>, celle qui doit offrir le service DHCPv6 au LAN',
      d6Gig(),
      {h:'R2',at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'interface G0/0 est l’interface connectée au LAN de R2.'}),
    c(`Sur <mark>R2</mark> : <mark>attribue le pool</mark> <mark>${D6_P2}</mark> à cette interface en activant le <mark>serveur DHCPv6</mark>`,
      [`ipv6 dhcp server ${D6_P2}`],
      {h:'R2',at:'if',v:[D6_P2],cfg:[` ipv6 dhcp server ${D6_P2}`],why:'Le pool est lié à l’interface : les clients peuvent y demander les options DNS et domaine.'}),
    c('Sur <mark>R2</mark> : dis aux clients de <mark>créer leur adresse eux-mêmes</mark> mais d’obtenir les <mark>autres informations en DHCPv6</mark> (active le <mark>flag O</mark>)',
      ['ipv6 nd other-config-flag'],
      {h:'R2',at:'if',cfg:[' ipv6 nd other-config-flag'],why:'Le flag O (Other) dans les RA : adresse par SLAAC, autres options (DNS, domaine) par DHCPv6 sans état.'}),
    c('Sur <mark>R2</mark> : vérifie le <mark>serveur sans état</mark> en affichant les <mark>pools DHCPv6</mark>',
      shw('ipv6 dhcp pool'),
      {h:'R2',at:'priv',why:'show ipv6 dhcp pool affiche le nom du pool, ses options (DNS, domaine) et les interfaces qui l’utilisent.'})
  ];
}

registerModule({
  id:'dhcp6',build:buildDhcp6,mode:'cfg',host:'R1',img:'dhcp6.png',
  modes:{dhcp6:['(config-dhcpv6)#','Configuration du pool DHCPv6']},   /* R1(config-dhcpv6)# */
  chips:['ipv6 ','dhcp ',D6_PFX,'show ']
});
