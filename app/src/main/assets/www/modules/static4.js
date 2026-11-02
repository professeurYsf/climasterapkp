'use strict';
/* Dépend de catalog.js : registerModule.  Image : static4.png
   Si le cours change, modifier seulement ces constantes : */
const ST4_FLOAT_MASK='255.255.255.0';   /* masque de la route flottante (24 bits) */
const ST4_FLOAT_AD=5;                   /* distance administrative */

/* écritures acceptées pour un port série : S0/0/0 · Se0/0/0 · Serial0/0/0 · Serial 0/0/0 … */
function st4Ser(n){
  return [`S0/0/${n}`,`Se0/0/${n}`,`Serial0/0/${n}`,`Serial 0/0/${n}`,`Se 0/0/${n}`,`S 0/0/${n}`];
}

function buildSt4(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const route=(net,mask,hop,suffix)=>hop.map(h=>`ip route ${net} ${mask} ${h}${suffix||''}`);
  return[
    c('Sur <mark>R1</mark> : crée une route statique vers <mark>192.168.2.0/24</mark> en utilisant l’<mark>interface de sortie</mark> <mark>S0/0/0</mark>',
      route('192.168.2.0','255.255.255.0',st4Ser(0)),
      {h:'R1',at:'cfg',cfg:['! ===== R1 =====','ip route 192.168.2.0 255.255.255.0 Serial0/0/0'],why:'R1 envoie vers S0/0/0 tout le trafic destiné au LAN de R2.'}),
    c('Sur <mark>R2</mark> : crée une route statique vers <mark>192.168.1.0/24</mark> en utilisant le <mark>tronçon suivant</mark> <mark>10.0.0.1</mark>',
      route('192.168.1.0','255.255.255.0',['10.0.0.1']),
      {h:'R2',at:'cfg',cfg:['! ===== R2 =====','ip route 192.168.1.0 255.255.255.0 10.0.0.1'],why:'R2 passe par l’adresse 10.0.0.1 (l’interface S0/0/0 de R1) pour joindre le LAN de R1.'}),
    c('Sur <mark>R1</mark> : crée une <mark>route par défaut</mark> vers Internet via l’interface <mark>S0/0/1</mark>',
      route('0.0.0.0','0.0.0.0',st4Ser(1)).map(x=>x),
      {h:'R1',at:'cfg',cfg:['! ===== R1 =====','ip route 0.0.0.0 0.0.0.0 Serial0/0/1'],why:'0.0.0.0 0.0.0.0 correspond à n’importe quelle destination : c’est la route de dernier recours.'}),
    c(`Sur <mark>R1</mark> : crée une <mark>route flottante</mark> (<mark>AD = ${ST4_FLOAT_AD}</mark>) vers <mark>192.168.2.0/24</mark> via <mark>S0/0/0</mark>`,
      route('192.168.2.0',ST4_FLOAT_MASK,st4Ser(0),` ${ST4_FLOAT_AD}`),
      {cfg:[`ip route 192.168.2.0 ${ST4_FLOAT_MASK} Serial0/0/0 ${ST4_FLOAT_AD}`],why:'Une route flottante a une distance administrative plus haute : elle reste en réserve tant que la route principale existe.'}),
    c('Donne la commande permettant d’afficher la <mark>table de routage</mark> sur le <mark>R1</mark>',['show ip route'],
      {h:'R1',at:'priv',why:'show ip route liste les routes : C (connectée), S (statique), S* (route par défaut).'})
  ];
}

registerModule({
  id:'static4',build:buildSt4,mode:'cfg',host:'R1',img:'static4.png',
  chips:['ip route ','192.168.1.0','192.168.2.0',['/24','255.255.255.0']]
});
