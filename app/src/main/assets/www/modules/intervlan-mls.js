'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Image : intervlan-mls.png
   Si le schéma change, modifier seulement cette constante : */
const MLS_GIG=1;          /* port Gigabit du trunk Sw1 ↔ MLS (Gig0/1 sur le schéma) */

/* écritures acceptées pour une interface Gigabit : int Gig0/1 · interface g0/1 · GigabitEthernet 0/1 … */
function mlsGig(n){
  const o=[`int Gig0/${n}`];
  for(const cmd of ['int','interface'])
    for(const t of ['Gig0/','G0/','Gi0/','GigabitEthernet0/','GigabitEthernet 0/','Gig 0/','Gi 0/','G 0/']){
      const x=`${cmd} ${t}${n}`;if(!o.includes(x))o.push(x)}
  return o;
}

function buildMls(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const vlan=(sw,id,first)=>c(`Sur <mark>${sw}</mark> : crée le VLAN <mark>${id}</mark> (sans nom)`,[`vlan ${id}`],
    Object.assign({go:'vlan',cfg:[...(first?[`! ===== ${sw} =====`]:[]),`vlan ${id}`],why:`vlan ${id} crée le VLAN ; sans « name », il garde un nom par défaut.`},first?{h:sw,at:'cfg'}:{}));
  const port=(n,id,pc)=>[
    c(`Sélectionne l’interface <mark>Fa0/${n}</mark> (${pc})`,ifOk(n),{go:'if',cfg:[`interface FastEthernet0/${n}`],why:`Fa0/${n} est le port du PC ${pc}.`}),
    c('Passe ce port en mode <mark>access</mark>',['switchport mode access'],{cfg:[' switchport mode access'],why:'Un port access appartient à un seul VLAN.'}),
    c(`Affecte ce port au VLAN <mark>${id}</mark>`,[`switchport access vlan ${id}`],{cfg:[` switchport access vlan ${id}`],why:`Fa0/${n} est maintenant dans le VLAN ${id}.`})
  ];
  const svi=(id,ip)=>[
    c(`Ouvre l’interface virtuelle du VLAN <mark>${id}</mark>`,[`interface vlan ${id}`,`int vlan ${id}`],{go:'if',cfg:[`interface Vlan${id}`],why:`L’interface VLAN ${id} (SVI) sera la passerelle du VLAN ${id}.`}),
    c(`Attribue l’adresse <mark>${ip}/8</mark>`,[`ip address ${ip} 255.0.0.0`,`ip add ${ip} 255.0.0.0`],{cfg:[` ip address ${ip} 255.0.0.0`],why:'/8 correspond au masque 255.0.0.0.'}),
    c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],{cfg:[' no shutdown'],why:'no shutdown allume l’interface : elle passe à up.'})
  ];
  return[
    /* ----- Sw1 ----- */
    vlan('Sw1',10,true),vlan('Sw1',20),
    ...port(2,10,'L1'),...port(3,20,'L2'),
    c(`Sélectionne l’interface <mark>Gig0/${MLS_GIG}</mark>`,mlsGig(MLS_GIG),{go:'if',cfg:[`interface GigabitEthernet0/${MLS_GIG}`],why:'Ce port relie Sw1 au MLS.'}),
    c('Configure-la en mode <mark>trunk</mark>',['switchport mode trunk'],{cfg:[' switchport mode trunk'],why:'Le trunk transporte les VLAN 10 et 20 vers le MLS.'}),
    /* ----- MLS ----- */
    vlan('MLS',10,true),vlan('MLS',20),
    ...svi(10,'10.0.0.1'),...svi(20,'20.0.0.1'),
    c(`Sélectionne l’interface <mark>Gig0/${MLS_GIG}</mark>`,mlsGig(MLS_GIG),{go:'if',cfg:[`interface GigabitEthernet0/${MLS_GIG}`],why:'Ce port relie le MLS à Sw1.'}),
    c('Définis l’encapsulation <mark>dot1Q</mark> du trunk',['switchport trunk encapsulation dot1Q'],{cfg:[' switchport trunk encapsulation dot1q'],why:'Le MLS doit choisir 802.1Q avant de pouvoir passer en trunk.'}),
    c('Passe ce port en mode <mark>trunk</mark>',['switchport mode trunk'],{cfg:[' switchport mode trunk'],why:'Le trunk reçoit les trames de tous les VLAN envoyées par Sw1.'}),
    c('<mark>Active le routage</mark> entre les VLAN',['ip routing'],{go:'cfg',cfg:['ip routing'],why:'ip routing transforme le switch multicouche en routeur entre ses interfaces VLAN.'})
  ];
}

registerModule({
  id:'intervlan-mls',build:buildMls,mode:'cfg',host:'Sw1',img:'intervlan-mls.png',
  chips:['switchport ','dot1Q ',['10.0.0.1/8','10.0.0.1 255.0.0.0'],['20.0.0.1/8','20.0.0.1 255.0.0.0']]
});
