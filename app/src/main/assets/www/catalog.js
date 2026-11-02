'use strict';
/* =====================================================================
   CATALOGUE DES MODULES  (l'ordre ici = l'ordre affiché dans « Modules »)
   - Un module SANS fichier modules/<id>.js apparaît « Bientôt ».
   - Pour activer un module : créer modules/<id>.js (voir modules/_modele.js)
     puis ajouter UNE ligne <script> dans index.html. Rien d'autre à toucher.
   ===================================================================== */
const CATALOG=[
  ['base','Config de base d’un Routeur'],
  ['base-sw','Config de base d’un Switch'],
  ['interfaces','Configuration des interfaces'],
  ['telnet','TELNET'],
  ['ssh','SSH'],
  ['vlan','VLAN'],
  ['vtp','VTP'],
  ['intervlan-ros','Routage Inter-VLAN (Router-on-a-Stick)'],
  ['intervlan-mls','Routage Inter-VLAN (MLS)'],
  ['stp','STP'],
  ['etherchannel','Etherchannel'],
  ['hsrp','HSRP'],
  ['vrrp','VRRP'],
  ['glbp','GLBP'],
  ['static4','Routage statique (IPv4)'],
  ['static6','Routage statique (IPv6)'],
  ['rip','RIP'],
  ['ripng','RIPng'],
  ['ospf2','OSPFv2 (IPv4)'],
  ['ospf3','OSPFv3 (IPv6)'],
  ['eigrp4','EIGRP (IPv4)'],
  ['eigrp6','EIGRP (IPv6)'],
  ['dhcp4','DHCPv4'],
  ['dhcp6','DHCPv6'],
  ['acl','ACL'],
  ['nat','NAT/PAT'],
  ['portsec','PortSecurity'],
  ['cdp','CDP & LLDP'],
  ['ppp','PPP Protocol'],
  ['gre','VPN GRE'],
  ['ntp','NTP'],
  ['syslog','Syslog'],
  ['snmp','SNMP'],
  ['tftp','TFTP'],
  ['voip','VoIP (Téléphonie IP)']
];

/* ---------- Registre (ne pas modifier) ---------- */
const MODS=CATALOG.map(([id,n])=>({id,n}));
function registerModule(m){
  const k=MODS.find(x=>x.id===m.id);
  if(!k){console.warn('Module absent du catalogue : '+m.id);return}
  Object.assign(k,m,{n:k.n});            /* le titre vient toujours du catalogue */
}

/* ---------- Outils partagés par tous les modules ---------- */
const pick=a=>a[Math.floor(Math.random()*a.length)],rnd=n=>Math.floor(Math.random()*n),pad=n=>String(n).padStart(2,'0');
const M3=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/* Écritures acceptées pour « interface » (1 port) ou « interface range » (b fourni).
   ifOk(3)      → int Fa0/3 · interface Fa 0/3 · int F0/3 · interface FastEthernet0/3 …
   ifOk(6,14)   → int range Fa0/6-14 · interface range f0/6-14 · … Fa0/6 - 14           */
function ifOk(a,b){
  const rg=b!==undefined,o=[`int ${rg?'range ':''}Fa0/${rg?a+'-'+b:a}`];
  for(const cmd of rg?['int range','interface range']:['int','interface'])
    for(const t of ['Fa0/','F0/','FastEthernet0/','FastEthernet 0/','Fa 0/','F 0/'])
      for(const r of rg?[`${a}-${b}`,`${a} - ${b}`]:[`${a}`]){const x=`${cmd} ${t}${r}`;if(!o.includes(x))o.push(x)}
  return o;
}
