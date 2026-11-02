'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Image : vlan.png
   Si le schéma change, modifier seulement ces constantes : */
const V_SALES=[6,14], V_RH=[15,24], V_TRUNK=[1,5], V_MGMT=100;

function buildVlan(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const [s1,s2]=V_SALES,[r1,r2]=V_RH,[t1,t2]=V_TRUNK;
  const mkVlan=(id,nm)=>[
    c(`Crée le VLAN <mark>${id}</mark>`,[`vlan ${id}`],{go:'vlan',cfg:[`vlan ${id}`],why:`vlan ${id} crée le VLAN et ouvre son mode (config-vlan)#.`}),
    c(`Donne-lui le nom <mark>${nm}</mark>`,[`name ${nm}`],{v:[nm],cfg:[` name ${nm}`],why:`Le nom ${nm} est une simple étiquette : il aide à reconnaître le VLAN.`})
  ];
  const range=(a,b,txt)=>c(`Sélectionne les ports <mark>Fa0/${a} à Fa0/${b}</mark> avec interface range${txt?' ('+txt+')':''}`,ifOk(a,b),
    {go:'ifr',cfg:[`interface range FastEthernet0/${a}-${b}`],why:'interface range applique les commandes suivantes à tous les ports de la plage.'});
  const access=(id)=>[
    c('Passe ces ports en mode <mark>access</mark>',['switchport mode access'],{cfg:[' switchport mode access'],why:'Un port access appartient à un seul VLAN et se branche sur un PC.'}),
    c(`Affecte ces ports au VLAN <mark>${id}</mark>`,[`switchport access vlan ${id}`],{cfg:[` switchport access vlan ${id}`],why:`Les ports sont maintenant dans le VLAN ${id}.`})
  ];
  return[
    ...mkVlan(10,'Sales'),...mkVlan(20,'RH'),...mkVlan(99,'Native'),...mkVlan(V_MGMT,'Gestion'),
    range(s1,s2,'VLAN 10 · Sales'),...access(10),
    range(r1,r2,'VLAN 20 · RH'),...access(20),
    c(`Sélectionne les ports <mark>Fa0/${t1} à Fa0/${t2}</mark> (trunk) avec interface range`,ifOk(t1,t2),
      {go:'ifr',cfg:[`interface range FastEthernet0/${t1}-${t2}`],why:'Ces ports relient S1 à S2 : ils transportent plusieurs VLAN.'}),
    c('Passe ces ports en mode <mark>trunk</mark>',['switchport mode trunk'],{cfg:[' switchport mode trunk'],why:'Un port trunk transporte les trames de tous les VLAN (étiquetées 802.1Q).'}),
    c('Définis le <mark>VLAN natif 99</mark> sur ces ports',['switchport trunk native vlan 99'],{cfg:[' switchport trunk native vlan 99'],why:'Le trafic non étiqueté du trunk appartient au VLAN 99.'}),
    c(`Ouvre l’interface virtuelle de gestion : <mark>VLAN ${V_MGMT}</mark>`,[`interface vlan ${V_MGMT}`,`int vlan ${V_MGMT}`],{go:'if',cfg:[`interface Vlan${V_MGMT}`],why:'L’interface VLAN (SVI) donne une adresse IP au switch pour l’administrer.'}),
    c('Configure l’adresse <mark>192.168.100.10/24</mark>',['ip address 192.168.100.10 255.255.255.0','ip add 192.168.100.10 255.255.255.0'],{cfg:[' ip address 192.168.100.10 255.255.255.0'],why:'/24 correspond au masque 255.255.255.0.'}),
    c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],{cfg:[' no shutdown'],why:'no shutdown allume l’interface : elle passe à up.'}),
    c('Donne la commande permettant d’afficher <mark>brièvement</mark> les <mark>VLANs</mark> sur le <mark>S1</mark>',['show vlan brief'],{at:'priv',why:'show vlan brief liste les VLAN et les ports qui leur sont affectés.'})
  ];
}

registerModule({
  id:'vlan',build:buildVlan,mode:'cfg',host:'S1',img:'vlan.png',
  chips:[['192.168.100.10/24','192.168.100.10 255.255.255.0'],'switchport ','access ']
});
