'use strict';
/* Dépend de catalog.js : pick, rnd, pad, M3, registerModule */
/* ---------- Module « Telnet » : R1 puis PC Admin ---------- */
function buildTelnet(){
  const pw=pick(['telnet123','Vty2027','remote1','cisco789']),IF=[];
  ['Gig','G','Gi','GigabitEthernet'].forEach(n=>['',' '].forEach(sp=>IF.push(`interface ${n}${sp}0/0`)));
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  return[
    c('Configure les lignes <mark>VTY de 0 à 4</mark> (accès à distance)',['line vty 0 4'],{go:'line',cfg:['line vty 0 4'],why:'Les lignes VTY reçoivent les connexions Telnet et SSH.'}),
    c(`Définis le mot de passe VTY : <mark>${pw}</mark>`,[`password ${pw}`],{v:[pw],cfg:[` password ${pw}`],why:'Ce mot de passe sera demandé à chaque connexion à distance.'}),
    c('Exige le mot de passe à la connexion Telnet',['login'],{cfg:[' login'],why:'login active la demande du mot de passe sur les lignes VTY.'}),
    c('Entre dans la configuration de l’interface <mark>GigabitEthernet 0/0</mark>',IF,{go:'if',cfg:['interface GigabitEthernet0/0'],why:'IOS accepte une commande globale depuis un sous-mode : on passe directement à l’interface.'}),
    c('Attribue l’adresse <mark>192.168.1.1</mark> avec le masque <mark>255.255.255.0</mark>',['ip address 192.168.1.1 255.255.255.0','ip add 192.168.1.1 255.255.255.0'],{cfg:[' ip address 192.168.1.1 255.255.255.0'],why:'Cette adresse sera la passerelle du PC Admin.'}),
    c('Active l’interface',['no shutdown','no shut','no sh'],{cfg:[' no shutdown'],why:'Par défaut, une interface de routeur est désactivée (shutdown).'}),
    c('Sur le PC <mark>Admin</mark> : adresse <mark>192.168.1.10</mark>, masque <mark>255.255.255.0</mark>, passerelle <mark>192.168.1.1</mark>',['ipconfig 192.168.1.10 255.255.255.0 192.168.1.1'],{dev:'pc',why:'Le PC et R1 sont maintenant dans le même réseau 192.168.1.0/24.'}),
    c('Depuis le PC <mark>Admin</mark> : connecte-toi en Telnet à <mark>192.168.1.1</mark>',['telnet 192.168.1.1'],{dev:'pc',why:`R1 demande maintenant le mot de passe VTY : ${pw}.`})
  ];
}

registerModule({id:'telnet',build:buildTelnet,mode:'cfg',host:'R1',img:'telnet.png',chips:['192.168.1.1',['/24','255.255.255.0'],'192.168.1.10','/']});
