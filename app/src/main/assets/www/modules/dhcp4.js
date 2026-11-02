'use strict';
/* Dépend de catalog.js : registerModule.  Image : dhcp4.png  (id catalogue : dhcp4)
   Topologie : PC1 — S1 — SRV_DHCP — AR — S2 — PC2   (liaison série 30.0.0.0/30 : SRV_DHCP .1 · AR .2)
   Si le cours change, modifier seulement ces constantes : */
const D4_SRV ='SRV_DHCP';          /* nom du serveur DHCP */
const D4_AR  ='AR';                /* nom de l’agent de relais */
const D4_POOL='LAN1';              /* nom du pool (sensible à la casse) */
const D4_NET ='172.16.0.0';        /* réseau du pool */
const D4_MASK='255.255.0.0';       /* masque du pool */
const D4_GW  ='172.16.0.1';        /* passerelle par défaut = adresse exclue */
const D4_DNS ='8.8.8.8';           /* serveur DNS */
const D4_DOM ='profysf.ma';        /* nom de domaine */
const D4_HELP='30.0.0.1';          /* adresse du serveur DHCP (ip helper-address) */

/* préfixes acceptés : excluded-add (au minimum) · net = network. Forme complète en premier : c’est elle que l’indice affiche */
const d4Pre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};

/* écritures acceptées pour « interface G0/0 » */
function d4Gig(){const o=[];for(const k of['interface','int'])for(const x of['GigabitEthernet','Gig','Gi','G'])for(const sp of['',' '])o.push(`${k} ${x}${sp}0/0`);return o}

function buildDhcp4(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  return[
    c(`Sur <mark>${D4_SRV}</mark> : <mark>exclus l’adresse IPv4</mark> <mark>${D4_GW}</mark> de la distribution`,
      d4Pre('excluded-address',12).map(x=>`ip dhcp ${x} ${D4_GW}`),
      {h:D4_SRV,at:'cfg',cfg:['! ===== '+D4_SRV+' =====',`ip dhcp excluded-address ${D4_GW}`],why:'Cette adresse est réservée à l’interface du routeur (passerelle) : le serveur ne la distribuera à aucun client.'}),
    c(`Sur <mark>${D4_SRV}</mark> : crée le <mark>pool DHCP</mark> nommé <mark>${D4_POOL}</mark>`,
      [`ip dhcp pool ${D4_POOL}`],
      {h:D4_SRV,at:'cfg',go:'dhcp',v:[D4_POOL],cfg:[`ip dhcp pool ${D4_POOL}`],why:'ip dhcp pool crée le pool et ouvre son mode de configuration (dhcp-config).'}),
    c(`Sur <mark>${D4_SRV}</mark> : définis le <mark>réseau</mark> <mark>${D4_NET}</mark> avec le masque <mark>${D4_MASK}</mark>`,
      d4Pre('network',3).map(x=>`${x} ${D4_NET} ${D4_MASK}`),
      {h:D4_SRV,at:'dhcp',cfg:[` network ${D4_NET} ${D4_MASK}`],why:'Le pool distribue les adresses du réseau 172.16.0.0/16 (masque 255.255.0.0).'}),
    c(`Sur <mark>${D4_SRV}</mark> : définis la <mark>passerelle par défaut</mark> <mark>${D4_GW}</mark>`,
      [`default-router ${D4_GW}`],
      {h:D4_SRV,at:'dhcp',cfg:[` default-router ${D4_GW}`],why:'default-router est l’adresse de la passerelle envoyée aux clients avec leur adresse IP.'}),
    c(`Sur <mark>${D4_SRV}</mark> : définis le <mark>serveur DNS</mark> <mark>${D4_DNS}</mark>`,
      [`dns-server ${D4_DNS}`],
      {h:D4_SRV,at:'dhcp',cfg:[` dns-server ${D4_DNS}`],why:'Les clients utiliseront ce serveur pour résoudre les noms de domaine.'}),
    c(`Sur <mark>${D4_SRV}</mark> : définis le <mark>nom de domaine</mark> <mark>${D4_DOM}</mark>`,
      [`domain-name ${D4_DOM}`],
      {h:D4_SRV,at:'dhcp',v:[D4_DOM],cfg:[` domain-name ${D4_DOM}`],why:'Le nom de domaine est transmis aux clients en même temps que leur configuration IP.'}),

    c(`Sur l’agent de relais <mark>${D4_AR}</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>`,
      d4Gig(),
      {h:D4_AR,at:'cfg',go:'if',cfg:['! ===== '+D4_AR+' =====','interface GigabitEthernet0/0'],why:'interface G0/0 est celle qui reçoit les requêtes DHCP (broadcast) des clients du LAN.'}),
    c(`Sur <mark>${D4_AR}</mark> : configure le <mark>relais DHCPv4</mark> vers le serveur <mark>${D4_HELP}</mark>`,
      [`ip helper-address ${D4_HELP}`],
      {h:D4_AR,at:'if',cfg:[` ip helper-address ${D4_HELP}`],why:'Le routeur transforme la requête broadcast en unicast vers le serveur DHCP, situé sur un autre réseau.'}),

    c(`Sur <mark>${D4_SRV}</mark> : affiche les <mark>adresses IP attribuées</mark> (liaisons DHCP)`,
      shw('ip dhcp binding'),
      {h:D4_SRV,at:'priv',why:'show ip dhcp binding liste les adresses distribuées, l’adresse MAC du client et la date d’expiration du bail.'})
  ];
}

registerModule({
  id:'dhcp4',build:buildDhcp4,mode:'cfg',host:D4_SRV,img:'dhcp4.png',
  modes:{dhcp:['(dhcp-config)#','Configuration du pool DHCP']},   /* SRV_DHCP(dhcp-config)# */
  chips:['ip dhcp ',D4_NET,D4_HELP,'show ']
});
