'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Pas d'image pour l'instant (img:'vtp.png' à ajouter si besoin). */
const VTP_DOM='prof.ma', VTP_PW='1234';

function buildVtp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const why={server:'Le serveur crée, modifie et supprime les VLAN, puis les diffuse aux autres switchs.',
             client:'Le client reçoit les VLAN du serveur : il ne peut pas en créer.',
             transparent:'Le switch transparent garde ses propres VLAN et relaie seulement les annonces.'};
  const lab={server:'Serveur',client:'Client',transparent:'Transparent'};
  const dev=(sw,m)=>[
    c(`<mark>${sw}</mark> : mode de fonctionnement <mark>${lab[m]}</mark>`,[`vtp mode ${m}`],{h:sw,cfg:[`! ===== ${sw} =====`,`vtp mode ${m}`],why:why[m]}),
    c(`<mark>${sw}</mark> : domaine VTP <mark>${VTP_DOM}</mark>`,[`vtp domain ${VTP_DOM}`],{v:[VTP_DOM],cfg:[`vtp domain ${VTP_DOM}`],why:'Les switchs échangent leurs VLAN seulement s’ils ont le même domaine.'}),
    c(`<mark>${sw}</mark> : version <mark>2</mark>`,['vtp version 2'],{cfg:['vtp version 2'],why:'La version doit être la même sur tous les switchs.'}),
    c(`<mark>${sw}</mark> : mot de passe <mark>${VTP_PW}</mark>`,[`vtp password ${VTP_PW}`],{v:[VTP_PW],cfg:[`vtp password ${VTP_PW}`],why:'Le mot de passe protège le domaine : il doit être identique partout.'})
  ];
  return[
    ...dev('S1','server'),...dev('S2','client'),...dev('S3','transparent'),
    c('Sur <mark>S1</mark> : crée le VLAN <mark>10</mark>',['vlan 10'],{h:'S1',at:'cfg',go:'vlan',cfg:['! ===== S1 =====','vlan 10'],why:'vlan 10 crée le VLAN et ouvre son mode (config-vlan)#.'}),
    c('Donne-lui le nom <mark>IT</mark>',['name IT'],{v:['IT'],cfg:[' name IT'],why:'Ce VLAN sera diffusé par VTP vers S2.'}),
    c('Sélectionne l’interface <mark>Fa0/3</mark>',ifOk(3),{go:'if',cfg:['interface FastEthernet0/3'],why:'Fa0/3 est le port où se branche le PC.'}),
    c('Passe ce port en mode <mark>access</mark>',['switchport mode access'],{cfg:[' switchport mode access'],why:'Un port access appartient à un seul VLAN.'}),
    c('Affecte ce port au VLAN <mark>10</mark>',['switchport access vlan 10'],{cfg:[' switchport access vlan 10'],why:'Le port Fa0/3 est maintenant dans le VLAN 10.'}),
    c('Sélectionne les ports <mark>Fa0/1 à Fa0/2</mark> avec interface range',ifOk(1,2),{go:'ifr',cfg:['interface range FastEthernet0/1-2'],why:'Ces ports relient les switchs entre eux.'}),
    c('Passe ces ports en mode <mark>trunk</mark>',['switchport mode trunk'],{cfg:[' switchport mode trunk'],why:'VTP circule uniquement sur les liens trunk.'}),
    c('Donne la commande permettant d’afficher l’<mark>état</mark> du <mark>VTP</mark> sur le <mark>S1</mark>',['show vtp status'],{h:'S1',at:'priv',why:'show vtp status affiche le mode, le domaine, la version et le nombre de VLAN.'}),
    c('Donne la commande permettant d’afficher les <mark>compteurs</mark> du <mark>VTP</mark> sur le <mark>S1</mark>',['show vtp counters'],{why:'show vtp counters affiche les annonces VTP envoyées et reçues.'})
  ];
}

registerModule({
  id:'vtp',build:buildVtp,mode:'cfg',host:'S1',img:'vtp.png',
  chips:['vtp ','switchport ','prof.ma']
});
