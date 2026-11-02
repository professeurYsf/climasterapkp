'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Image : intervlan-ros.png
   Déclare son propre mode « sous-interface » (voir modes: plus bas). */

/* écritures acceptées pour une interface Gigabit : int Gig0/1 · interface g0/0.10 · GigabitEthernet 0/1 … */
function rosGig(n){
  const o=[`int Gig0/${n}`];
  for(const cmd of ['int','interface'])
    for(const t of ['Gig0/','G0/','Gi0/','GigabitEthernet0/','GigabitEthernet 0/','Gig 0/','Gi 0/','G 0/']){
      const x=`${cmd} ${t}${n}`;if(!o.includes(x))o.push(x)}
  return o;
}

function buildRos(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const vlan=(id,nm,first)=>[
    c(`Sur <mark>S1</mark> : crée le VLAN <mark>${id}</mark>`,[`vlan ${id}`],Object.assign({go:'vlan',cfg:[...(first?['! ===== S1 =====']:[]),`vlan ${id}`],why:`vlan ${id} crée le VLAN et ouvre son mode (config-vlan)#.`},first?{h:'S1',at:'cfg'}:{})),
    c(`Donne-lui le nom <mark>${nm}</mark>`,[`name ${nm}`],{v:[nm],cfg:[` name ${nm}`],why:`${nm} est une simple étiquette qui identifie le VLAN.`})
  ];
  const port=(n,id)=>[
    c(`Sélectionne l’interface <mark>Fa0/${n}</mark>`,ifOk(n),{go:'if',cfg:[`interface FastEthernet0/${n}`],why:`Fa0/${n} est le port où se branche le PC${n}.`}),
    c('Passe ce port en mode <mark>access</mark>',['switchport mode access'],{cfg:[' switchport mode access'],why:'Un port access appartient à un seul VLAN.'}),
    c(`Affecte ce port au VLAN <mark>${id}</mark>`,[`switchport access vlan ${id}`],{cfg:[` switchport access vlan ${id}`],why:`Fa0/${n} est maintenant dans le VLAN ${id}.`})
  ];
  const sub=(id,ip)=>[
    c(`Crée la sous-interface <mark>Gig0/0.${id}</mark>`,rosGig('0.'+id),{go:'subif',cfg:[`interface GigabitEthernet0/0.${id}`],why:'Une sous-interface représente un VLAN sur le lien du routeur.'}),
    c(`Active l’encapsulation <mark>dot1Q</mark> pour le VLAN <mark>${id}</mark>`,[`encapsulation dot1Q ${id}`],{cfg:[` encapsulation dot1Q ${id}`],why:`Les trames étiquetées VLAN ${id} sont traitées par cette sous-interface.`}),
    c(`Attribue l’adresse <mark>${ip}/24</mark>`,[`ip address ${ip} 255.255.255.0`,`ip add ${ip} 255.255.255.0`],{cfg:[` ip address ${ip} 255.255.255.0`],why:'Cette adresse sera la passerelle des PC du VLAN.'})
  ];
  return[
    ...vlan(10,'IT',true),...vlan(20,'RH'),
    ...port(1,10),...port(2,20),
    c('Sélectionne l’interface <mark>Gig0/1</mark>',rosGig(1),{go:'if',cfg:['interface GigabitEthernet0/1'],why:'Gig0/1 relie S1 au routeur R1.'}),
    c('Configure-la en mode <mark>trunk</mark>',['switchport mode trunk'],{cfg:[' switchport mode trunk'],why:'Le trunk transporte les VLAN 10 et 20 vers le routeur.'}),
    c('Sur <mark>R1</mark> : sélectionne l’interface <mark>Gig0/0</mark>',rosGig(0),{h:'R1',at:'cfg',go:'if',cfg:['! ===== R1 =====','interface GigabitEthernet0/0'],why:'Gig0/0 est l’interface physique reliée au switch.'}),
    c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],{cfg:[' no shutdown'],why:'Sans no shutdown, l’interface et ses sous-interfaces restent down.'}),
    ...sub(10,'192.168.10.1'),...sub(20,'192.168.20.1')
  ];
}

registerModule({
  id:'intervlan-ros',build:buildRos,mode:'cfg',host:'S1',img:'intervlan-ros.png',
  modes:{subif:['(config-subif)#','Configuration de sous-interface']},
  chips:['switchport',['192.168.10.1/24','192.168.10.1 255.255.255.0'],['192.168.20.1/24','192.168.20.1 255.255.255.0']]
});
