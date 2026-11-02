'use strict';
/* Dépend de catalog.js : registerModule.  Image : vrrp.png
   Les interfaces sont déjà configurées (voir HSRP) : on démarre directement en (config-if)#. */

function buildVrrp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const dev=(sw,prio,role,first)=>[
    c(`Sur <mark>${sw}</mark> : configure l’adresse IP virtuelle <mark>192.168.1.254</mark> pour le groupe <mark>1</mark>`,['vrrp 1 ip 192.168.1.254'],{h:sw,at:'if',cfg:[`! ===== ${sw} =====`,' vrrp 1 ip 192.168.1.254'],why:'Les PC utilisent cette adresse virtuelle comme passerelle par défaut.'}),
    c(`Définis la priorité <mark>${prio}</mark> du groupe <mark>1</mark> (routeur <mark>${role}</mark>)`,[`vrrp 1 priority ${prio}`],{cfg:[` vrrp 1 priority ${prio}`],why:'La priorité la plus haute devient le routeur maître (100 par défaut).'}),
    c('Active la <mark>préemption</mark> pour le groupe <mark>1</mark>',['vrrp 1 preempt'],{cfg:[' vrrp 1 preempt'],why:'Avec preempt, le routeur de plus haute priorité reprend son rôle quand il revient.'})
  ];
  return[
    ...dev('R1',170,'principal (master)'),
    ...dev('R2',120,'secondaire (backup)'),
    c('Donne la commande permettant d’afficher l’<mark>état</mark> du <mark>VRRP</mark> sur le <mark>R1</mark>',['show vrrp'],{h:'R1',at:'priv',why:'show vrrp affiche le rôle du routeur, la priorité et l’adresse virtuelle.'}),
    c('Donne la commande permettant d’afficher le <mark>résumé</mark> du <mark>VRRP</mark> sur le <mark>R1</mark>',['show vrrp brief'],{why:'La version brief résume chaque groupe sur une seule ligne.'})
  ];
}

registerModule({
  id:'vrrp',build:buildVrrp,mode:'if',host:'R1',img:'vrrp.png',
  chips:['vrrp ','192.168.1.254','priority ']
});
