'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Image : etherchannel.png
   Si le schéma ou le cours change, modifier seulement ces constantes : */
const EC_LACP=[1,2,1];            /* ports Fa0/1-2 · channel-group 1 · Sw1 ↔ Sw3 */
const EC_PAGP=[3,4,2];            /* ports Fa0/3-4 · channel-group 2 · Sw1 ↔ Sw2 */
const EC_NONE=[5,6,3];            /* ports Fa0/5-6 · channel-group 3 · Sw2 ↔ Sw3 */
const EC_PAGP_SW1='desirable', EC_PAGP_SW2='auto';   /* auto + auto ne forme jamais le bundle */

/* écritures acceptées pour l'interface logique : int port-channel 1 · interface po1 … */
function ecPo(g){
  const o=[`int port-channel ${g}`];
  for(const cmd of ['int','interface'])
    for(const t of [`port-channel ${g}`,`port-channel${g}`,`po${g}`,`po ${g}`]){const x=`${cmd} ${t}`;if(!o.includes(x))o.push(x)}
  return o;
}

function buildEc(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const why={active:'active envoie des paquets LACP et propose la négociation.',
             passive:'passive attend les paquets LACP de l’autre côté.',
             desirable:'desirable envoie des paquets PAgP et propose la négociation.',
             auto:'auto attend les paquets PAgP de l’autre côté.',
             on:'on force l’EtherChannel sans aucun protocole de négociation.'};
  const blk=(sw,[a,b,g],md,proto)=>[
    c(`<mark>${proto}</mark> · Sur <mark>${sw}</mark> : sélectionne les interfaces <mark>Fa0/${a} à Fa0/${b}</mark> avec interface range`,ifOk(a,b),
      {h:sw,at:'cfg',go:'ifr',cfg:[`! ===== ${sw} =====`,`interface range FastEthernet0/${a}-${b}`],why:'interface range applique les commandes suivantes aux deux liens physiques.'}),
    c(`Ajoute-les au groupe <mark>${g}</mark> en mode <mark>${md}</mark>`,[`channel-group ${g} mode ${md}`],
      {cfg:[` channel-group ${g} mode ${md}`],why:why[md]}),
    c(`Sélectionne l’interface virtuelle <mark>port-channel ${g}</mark>`,ecPo(g),
      {go:'if',cfg:[`interface Port-channel${g}`],why:'Le port-channel est l’interface logique qui regroupe les liens physiques.'}),
    c('Configure-la en mode <mark>trunk</mark>',['switchport mode trunk'],
      {cfg:[' switchport mode trunk'],why:'Le trunk du port-channel transporte tous les VLAN sur le lien agrégé.'})
  ];
  return[
    ...blk('Sw1',EC_LACP,'active','LACP'),
    ...blk('Sw3',EC_LACP,'passive','LACP'),
    ...blk('Sw1',EC_PAGP,EC_PAGP_SW1,'PAgP'),
    ...blk('Sw2',EC_PAGP,EC_PAGP_SW2,'PAgP'),
    ...blk('Sw2',EC_NONE,'on','Sans négociation'),
    c('Donne la commande permettant d’afficher le <mark>résumé</mark> de l’<mark>EtherChannel</mark> sur le <mark>Sw1</mark>',['show etherchannel summary'],
      {h:'Sw1',at:'priv',why:'show etherchannel summary indique les groupes, leur protocole et l’état des ports (P = bundled, SU = en service).'})
  ];
}

registerModule({
  id:'etherchannel',build:buildEc,mode:'cfg',host:'Sw1',img:'etherchannel.png',
  chips:[['switchport mode trunk','switchport mode trunk'],'channel-group ','int range ']
});
