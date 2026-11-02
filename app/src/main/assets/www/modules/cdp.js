'use strict';
/* Dépend de catalog.js : registerModule.  Image : cdp.png  (id catalogue : cdp)
   Topologie : R1 (Gig0/0) — Fa0/1 Sw1 (Fa0/2 Laptop · Fa0/3 IP Phone0)
   Si le cours change, modifier seulement ces constantes : */
const CD_R='R1';                    /* nom du routeur */

/* écritures acceptées pour « interface G0/0 » : forme complète en premier (c’est elle que l’indice affiche) */
function cdGig(){const o=[];for(const k of['interface','int'])for(const x of['GigabitEthernet','Gig','Gi','G'])for(const sp of['',' '])o.push(`${k} ${x}${sp}0/0`);return o}

function buildCdp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);
  const R=CD_R;

  return[
    /* ---------- CDP ---------- */
    c(`Sur <mark>${R}</mark> : <mark>active le protocole CDP</mark> afin de détecter ses voisins`,
      ['cdp run'],
      {h:R,at:'cfg',cfg:['! ===== CDP =====','cdp run'],why:'cdp run active CDP (protocole propriétaire Cisco, couche 2) sur tout le routeur : il envoie et reçoit des annonces.'}),
    c(`Sur <mark>${R}</mark> : affiche les <mark>informations sur les voisins CDP</mark> (ID du voisin, interfaces, type d’équipement)`,
      shw('cdp neighbors').concat(shw('cdp neighbor')),
      {h:R,at:'priv',why:'show cdp neighbors résume chaque voisin : Device ID, interface locale, Holdtime, Capability, Platform et interface distante.'}),
    c(`Sur <mark>${R}</mark> : affiche les <mark>informations détaillées</mark> sur les <mark>voisins CDP</mark>`,
      shw('cdp neighbors detail').concat(shw('cdp neighbor detail')),
      {h:R,at:'priv',why:'La version detail ajoute l’adresse IP du voisin, la version d’IOS et le VTP domain.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>`,
      cdGig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'G0/0 est l’interface reliée au commutateur Sw1 : on règle CDP port par port.'}),
    c(`Sur <mark>${R}</mark> : <mark>arrête les annonces CDP</mark> sur cette interface`,
      ['no cdp enable'],
      {h:R,at:'if',cfg:[' no cdp enable'],why:'no cdp enable empêche CDP d’envoyer et de recevoir des annonces sur cette interface seulement (CDP reste actif ailleurs).'}),
    c(`Sur <mark>${R}</mark> : <mark>réactive CDP</mark> sur cette interface`,
      ['cdp enable'],
      {h:R,at:'if',cfg:[' cdp enable'],why:'cdp enable remet CDP en marche sur l’interface (il est actif par défaut quand cdp run est actif).'}),
    c(`Sur <mark>${R}</mark> : <mark>désactive le protocole CDP</mark> sur tout le routeur`,
      ['no cdp run'],
      {h:R,at:'cfg',cfg:['no cdp run'],why:'no cdp run arrête CDP globalement : plus aucune annonce n’est envoyée ni reçue sur aucune interface.'}),

    /* ---------- LLDP ---------- */
    c(`Sur <mark>${R}</mark> : <mark>active le protocole LLDP</mark>`,
      ['lldp run'],
      {h:R,at:'cfg',cfg:['! ===== LLDP =====','lldp run'],why:'lldp run active LLDP (norme IEEE 802.1AB, indépendante du constructeur) ; il est désactivé par défaut sur Cisco.'}),
    c(`Sur <mark>${R}</mark> : affiche les <mark>voisins LLDP</mark>`,
      shw('lldp neighbors').concat(shw('lldp neighbor')),
      {h:R,at:'priv',why:'show lldp neighbors résume les voisins LLDP : Device ID, interface locale, Hold-time, Capability et port distant.'}),
    c(`Sur <mark>${R}</mark> : affiche les <mark>informations détaillées</mark> sur les <mark>voisins LLDP</mark>`,
      shw('lldp neighbors detail').concat(shw('lldp neighbor detail')),
      {h:R,at:'priv',why:'La version detail ajoute l’adresse de gestion, la description du système et les capacités du voisin.'}),
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>G0/0</mark>`,
      cdGig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'Comme pour CDP, LLDP se règle aussi interface par interface.'}),
    c(`Sur <mark>${R}</mark> : <mark>arrête l’envoi des annonces LLDP</mark> sur cette interface`,
      ['no lldp transmit'],
      {h:R,at:'if',cfg:[' no lldp transmit'],why:'no lldp transmit empêche d’envoyer des trames LLDP sur cette interface ; la réception reste possible.'}),
    c(`Sur <mark>${R}</mark> : <mark>arrête la réception des annonces LLDP</mark> sur cette interface`,
      ['no lldp receive'],
      {h:R,at:'if',cfg:[' no lldp receive'],why:'no lldp receive ignore les trames LLDP reçues : le routeur ne découvre plus de voisin sur ce port.'}),
    c(`Sur <mark>${R}</mark> : <mark>désactive le protocole LLDP</mark> sur tout le routeur`,
      ['no lldp run'],
      {h:R,at:'cfg',cfg:['no lldp run'],why:'no lldp run arrête LLDP globalement sur le routeur.'})
  ];
}

registerModule({
  id:'cdp',build:buildCdp,mode:'cfg',host:CD_R,img:'cdp.png',
  chips:['cdp ','lldp ','run','enable','neighbors ']
});
