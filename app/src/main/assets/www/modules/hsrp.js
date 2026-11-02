'use strict';
/* Dépend de catalog.js : registerModule.  Image : hsrp.png */

/* écritures acceptées pour Gig0/0 : int Gig0/0 · interface g0/0 · GigabitEthernet0/0 … */
function hsrpGig(n){
  const o=[`int Gig0/${n}`];
  for(const cmd of ['int','interface'])
    for(const t of ['Gig0/','G0/','Gi0/','GigabitEthernet0/','GigabitEthernet 0/','Gig 0/','Gi 0/','G 0/']){
      const x=`${cmd} ${t}${n}`;if(!o.includes(x))o.push(x)}
  return o;
}

function buildHsrp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const dev=(sw,ip,prio,role)=>[
    c(`Sur <mark>${sw}</mark> : sélectionne l’interface <mark>Gig0/0</mark>`,hsrpGig(0),{h:sw,at:'cfg',go:'if',cfg:[`! ===== ${sw} =====`,'interface GigabitEthernet0/0'],why:'Gig0/0 est l’interface reliée au switch S1.'}),
    c(`Attribue l’adresse <mark>${ip}/24</mark>`,[`ip address ${ip} 255.255.255.0`,`ip add ${ip} 255.255.255.0`],{cfg:[` ip address ${ip} 255.255.255.0`],why:'Adresse réelle du routeur sur le réseau 192.168.1.0/24.'}),
    c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],{cfg:[' no shutdown'],why:'no shutdown allume l’interface : elle passe à up.'}),
    c('Configure l’adresse IP virtuelle <mark>192.168.1.254</mark> pour le groupe <mark>1</mark>',['standby 1 ip 192.168.1.254'],{cfg:[' standby 1 ip 192.168.1.254'],why:'Les PC utilisent cette adresse virtuelle comme passerelle par défaut.'}),
    c(`Définis la priorité <mark>${prio}</mark> du groupe <mark>1</mark> (routeur <mark>${role}</mark>)`,[`standby 1 priority ${prio}`],{cfg:[` standby 1 priority ${prio}`],why:'La priorité la plus haute devient le routeur actif (100 par défaut).'}),
    c('Active la <mark>préemption</mark> pour le groupe <mark>1</mark>',['standby 1 preempt'],{cfg:[' standby 1 preempt'],why:'Avec preempt, le routeur de plus haute priorité reprend le rôle actif quand il revient.'})
  ];
  return[
    ...dev('R1','192.168.1.1',170,'actif'),
    ...dev('R2','192.168.1.2',120,'standby'),
    c('Donne la commande permettant d’afficher l’<mark>état</mark> du <mark>HSRP</mark> sur le <mark>R1</mark>',['show standby'],{h:'R1',at:'priv',why:'show standby affiche l’état (Active/Standby), la priorité et l’adresse virtuelle.'}),
    c('Donne la commande permettant d’afficher le <mark>résumé</mark> du <mark>HSRP</mark> sur le <mark>R1</mark>',['show standby brief'],{why:'La version brief résume chaque groupe sur une seule ligne.'})
  ];
}

registerModule({
  id:'hsrp',build:buildHsrp,mode:'cfg',host:'R1',img:'hsrp.png',
  chips:['standby ','192.168.1.1','192.168.1.2']
});
