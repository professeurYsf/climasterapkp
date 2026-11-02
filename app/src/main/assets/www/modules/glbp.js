'use strict';
/* Dépend de catalog.js : registerModule.  Image : glbp.png
   Les interfaces sont déjà configurées (voir HSRP) : on démarre directement en (config-if)#. */

function buildGlbp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const dev=(sw,prio,role,first)=>[
    c(`Sur <mark>${sw}</mark> : configure l’adresse IP virtuelle <mark>192.168.1.254</mark> pour le groupe <mark>1</mark>`,['glbp 1 ip 192.168.1.254'],{h:sw,at:'if',cfg:[`! ===== ${sw} =====`,' glbp 1 ip 192.168.1.254'],why:'Les PC utilisent cette adresse virtuelle comme passerelle par défaut.'}),
    c(`Définis la priorité <mark>${prio}</mark> du groupe <mark>1</mark> (routeur <mark>${role}</mark>)`,[`glbp 1 priority ${prio}`],{cfg:[` glbp 1 priority ${prio}`],why:'La priorité la plus haute devient l’AVG (routeur qui distribue les adresses MAC virtuelles).'}),
    c('Active la <mark>préemption</mark> pour le groupe <mark>1</mark>',['glbp 1 preempt'],{cfg:[' glbp 1 preempt'],why:'Avec preempt, le routeur de plus haute priorité reprend son rôle quand il revient.'})
  ];
  return[
    ...dev('R1',170,'actif'),
    ...dev('R2',120,'standby'),
    c('Donne la commande permettant d’afficher l’<mark>état</mark> du <mark>GLBP</mark> sur le <mark>R1</mark>',['show glbp'],{h:'R1',at:'priv',why:'show glbp affiche le rôle du routeur, la priorité et l’adresse virtuelle.'}),
    c('Donne la commande permettant d’afficher le <mark>résumé</mark> du <mark>GLBP</mark> sur le <mark>R1</mark>',['show glbp brief'],{why:'La version brief résume chaque groupe sur une seule ligne.'})
  ];
}

registerModule({
  id:'glbp',build:buildGlbp,mode:'if',host:'R1',img:'glbp.png',
  chips:['preempt ','glbp ','192.168.1.254']
});
