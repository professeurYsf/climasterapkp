'use strict';
/* Dépend de catalog.js : registerModule.  Image : interfaces.png (à la racine, comme vlan.png)
   Module « Configuration des interfaces » (id : interfaces) — R1 puis R2.
   Si le schéma change, modifier seulement ces constantes : */
const I_CLOCK=64000, I_WAN_MASK='255.255.255.252', I_LAN2_MASK='255.255.0.0', I_LAN1_MASK='255.255.255.0',
      I_R1_WAN='10.0.0.1', I_R2_WAN='10.0.0.2', I_R1_LAN='172.16.0.1', I_R2_LAN='192.168.1.1';

function buildInterfaces(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  /* écritures acceptées : int S0/0/0 · interface Serial0/0/0 · interface Serial 0/0/0 … */
  const ifn=(names)=>{const o=[];for(const cmd of['int','interface'])for(const n of names)o.push(`${cmd} ${n}`);return o};
  const SER=ifn(['S0/0/0','Se0/0/0','Serial0/0/0','Serial 0/0/0','S 0/0/0']);
  const GIG=ifn(['G0/0','Gi0/0','Gig0/0','GigabitEthernet0/0','GigabitEthernet 0/0','G 0/0','Gi 0/0']);
  const ip=(a,m,p)=>c(`Configure l’adresse <mark>${a}/${p}</mark>`,[`ip address ${a} ${m}`,`ip add ${a} ${m}`],
    {cfg:[` ip address ${a} ${m}`],why:`/${p} correspond au masque ${m}.`});
  const desc=(t)=>c(`Ajoute la description <mark>${t}</mark>`,[`description ${t}`,`desc ${t}`],
    {v:[t],cfg:[` description ${t}`],why:'La description est une simple étiquette : elle aide à reconnaître le rôle du port.'});
  const noshut=()=>c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],
    {cfg:[' no shutdown'],why:'no shutdown allume l’interface : elle passe à up.'});
  return[
    /* ---------- R1 ---------- */
    c('Sur <mark>R1</mark>, ouvre l’interface <mark>S0/0/0</mark>',SER,
      {h:'R1',at:'cfg',go:'if',cfg:['! --- R1 ---','interface Serial0/0/0'],why:'Serial0/0/0 est le port de la liaison WAN vers R2.'}),
    c(`Ce côté est le <mark>DCE</mark> : configure la vitesse de la liaison WAN à <mark>${I_CLOCK}</mark>`,[`clock rate ${I_CLOCK}`],
      {cfg:[` clock rate ${I_CLOCK}`],why:'Le côté DCE fournit l’horloge (clock rate) à la liaison série.'}),
    ip(I_R1_WAN,I_WAN_MASK,30),
    desc('Liaison WAN vers R2'),
    noshut(),
    c('Ouvre l’interface <mark>G0/0</mark>',GIG,
      {go:'if',cfg:['interface GigabitEthernet0/0'],why:'GigabitEthernet0/0 est le port relié au réseau local LAN2.'}),
    ip(I_R1_LAN,I_LAN2_MASK,16),
    desc('Connecte a LAN2'),
    noshut(),

    /* ---------- R2 ---------- */
    c('Sur <mark>R2</mark>, ouvre l’interface <mark>S0/0/0</mark>',SER,
      {h:'R2',at:'cfg',go:'if',cfg:['! --- R2 ---','interface Serial0/0/0'],why:'Serial0/0/0 est le port de la liaison WAN vers R1.'}),
    ip(I_R2_WAN,I_WAN_MASK,30),
    desc('Liaison WAN vers R1'),
    noshut(),
    c('Ouvre l’interface <mark>G0/0</mark>',GIG,
      {go:'if',cfg:['interface GigabitEthernet0/0'],why:'GigabitEthernet0/0 est le port relié au réseau local LAN1.'}),
    ip(I_R2_LAN,I_LAN1_MASK,24),
    desc('Connecte a LAN1'),
    noshut(),

    c('Donne la commande permettant d’afficher <mark>brièvement</mark> l’état des <mark>interfaces</mark> sur <mark>R2</mark>',
      ['show ip interface brief','show ip int brief'],
      {at:'priv',why:'show ip interface brief liste les interfaces, leur adresse IP et leur état (up/down).'})
  ];
}

registerModule({
  id:'interfaces',build:buildInterfaces,mode:'cfg',host:'R1',img:'interfaces.png',
  chips:['S0/0/0','G0/0',['172.16.0.1/16','172.16.0.1 255.255.0.0'],['192.168.1.1/24','192.168.1.1 255.255.255.0']]
});
