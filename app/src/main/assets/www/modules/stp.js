'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Image : stp.png */

function buildStp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const st=r=>[`spanning-tree ${r}`,`sp ${r}`];            /* « sp » accepté comme abréviation */
  const dev=sw=>({h:sw,at:'cfg'});
  const mk=(sw,q,ok,line,why)=>c(`${q}`,ok,Object.assign({cfg:[`! ===== ${sw} =====`,line],why},dev(sw)));
  return[
    /* ----- Méthode 1 : root primary / secondary ----- */
    mk('S1','<mark>Méthode 1</mark> · Sur <mark>S1</mark> : configure le switch comme <mark>pont racine principal</mark> du VLAN <mark>10</mark>',st('vlan 10 root primary'),'spanning-tree vlan 10 root primary','root primary donne à S1 une priorité plus basse que celle des autres switchs : il devient le pont racine.'),
    mk('S2','<mark>Méthode 1</mark> · Sur <mark>S2</mark> : configure le switch comme <mark>pont racine secondaire</mark> du VLAN <mark>10</mark>',st('vlan 10 root secondary'),'spanning-tree vlan 10 root secondary','root secondary prépare S2 à devenir racine si S1 tombe en panne.'),
    /* ----- Méthode 2 : priorité manuelle ----- */
    mk('S1','<mark>Méthode 2</mark> · Sur <mark>S1</mark> : définis la <mark>priorité</mark> du VLAN <mark>10</mark> à <mark>24576</mark> (pont racine <mark>principal</mark>)',st('vlan 10 priority 24576'),'spanning-tree vlan 10 priority 24576','La priorité est un multiple de 4096 : la plus basse devient racine.'),
    mk('S2','<mark>Méthode 2</mark> · Sur <mark>S2</mark> : définis la <mark>priorité</mark> du VLAN <mark>10</mark> à <mark>28672</mark> (pont racine <mark>secondaire</mark>)',st('vlan 10 priority 28672'),'spanning-tree vlan 10 priority 28672','28672 est supérieur à 24576 : S2 reste secondaire derrière S1.'),
    /* ----- RSTP ----- */
    mk('S3','Sur <mark>S3</mark> : active <mark>Rapid PVST+</mark> (RSTP)',st('mode rapid-pvst'),'spanning-tree mode rapid-pvst','Rapid PVST+ converge beaucoup plus vite que PVST+ classique.'),
    /* ----- PortFast + BPDU Guard sur S1 ----- */
    c('Sur <mark>S1</mark> : sélectionne l’interface <mark>Fa0/10</mark> (PC)',ifOk(10),{h:'S1',at:'cfg',go:'if',cfg:['! ===== S1 =====','interface FastEthernet0/10'],why:'Fa0/10 est le port d’accès où se branche le PC.'}),
    c('Active <mark>PortFast</mark> sur ce port',st('portfast'),{cfg:[' spanning-tree portfast'],why:'PortFast fait passer le port directement en forwarding (pas d’attente de 30 s).'}),
    c('Active la <mark>protection BPDU</mark> sur ce port',st('bpduguard enable'),{cfg:[' spanning-tree bpduguard enable'],why:'Si une BPDU arrive sur ce port, il est désactivé : on évite qu’un switch pirate s’y branche.'}),
    /* ----- Vérification ----- */
    c('Donne la commande permettant d’afficher l’<mark>état</mark> du <mark>spanning-tree</mark> sur le <mark>S1</mark>',['show spanning-tree'],{h:'S1',at:'priv',why:'show spanning-tree affiche le pont racine, le rôle et l’état de chaque port.'})
  ];
}

registerModule({
  id:'stp',build:buildStp,mode:'cfg',host:'S1',img:'stp.png',
  chips:[['VLAN 10','vlan 10 '],'spanning-tree ','28672']
});
