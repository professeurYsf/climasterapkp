'use strict';
/* Dépend de catalog.js : registerModule et ifOk().  Image : portsec.png  (id catalogue : portsec)
   Topologie : Laptop (Fa0, MAC 000A.F39C.5116) — Fa0/5 — Sw1
   3 exercices : violation shutdown (Fa0/5) · violation protect (Fa0/5) · violation restrict (Fa0/5)
   Si le cours change, modifier seulement ces constantes : */
const PS_SW  ='Sw1';                 /* nom du commutateur */
const PS_MAC ='000A.F39C.5116';      /* MAC du PC Admin (exercice 1) */
const PS_MAX2=10;                    /* exercice 2 : nombre maximal d’adresses MAC */
const PS_MAX3=4;                     /* exercice 3 : nombre maximal d’adresses MAC */

function buildPortsec(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const S=PS_SW;

  return[
    /* ---------- Exercice 1 : port-security statique, violation shutdown (Fa0/5) ---------- */
    c(`Sur <mark>${S}</mark> : entre dans la configuration de l’interface <mark>Fa0/5</mark> (le port du PC Admin)`,
      ifOk(5),
      {h:S,at:'cfg',go:'if',cfg:['! ===== Exercice 1 : statique + shutdown =====','interface FastEthernet0/5'],why:'Fa0/5 est le port relié au portable de l’administrateur.'}),
    c(`Sur <mark>${S}</mark> : configure le port en <mark>mode accès</mark>`,
      ['switchport mode access'],
      {h:S,at:'if',cfg:[' switchport mode access'],why:'La sécurité de port ne fonctionne que sur un port d’accès (ou trunk configuré), jamais en mode dynamique.'}),
    c(`Sur <mark>${S}</mark> : <mark>active la sécurité de port</mark> sur cette interface`,
      ['switchport port-security'],
      {h:S,at:'if',cfg:[' switchport port-security'],why:'Cette commande active la fonction port-security avec ses valeurs par défaut (1 adresse MAC, violation shutdown).'}),
    c(`Sur <mark>${S}</mark> : autorise <mark>statiquement</mark> l’adresse MAC <mark>${PS_MAC}</mark> du PC Admin`,
      [`switchport port-security mac-address ${PS_MAC}`],
      {h:S,at:'if',cfg:[` switchport port-security mac-address ${PS_MAC}`],why:'Adresse MAC saisie à la main : seul ce PC est autorisé sur le port.'}),
    c(`Sur <mark>${S}</mark> : limite à <mark>1</mark> le nombre maximal d’adresses MAC`,
      ['switchport port-security maximum 1'],
      {h:S,at:'if',cfg:[' switchport port-security maximum 1'],why:'Une seule adresse MAC peut être associée à ce port : celle du PC Admin.'}),
    c(`Sur <mark>${S}</mark> : en cas de violation, le port doit être <mark>désactivé</mark> (mode <mark>shutdown</mark>)`,
      ['switchport port-security violation shutdown'],
      {h:S,at:'if',cfg:[' switchport port-security violation shutdown'],why:'shutdown met le port en état err-disabled et envoie un message de journalisation (mode par défaut, le plus strict).'}),

    /* ---------- Exercice 2 : sticky, violation protect (Fa0/5) ---------- */
    c(`Sur <mark>${S}</mark> : entre dans la configuration de l’interface <mark>Fa0/5</mark>`,
      ifOk(5),
      {h:S,at:'cfg',go:'if',cfg:['! ===== Exercice 2 : sticky + protect =====','interface FastEthernet0/5'],why:'Fa0/5 est le port sur lequel plusieurs équipements peuvent se connecter.'}),
    c(`Sur <mark>${S}</mark> : configure le port en <mark>mode accès</mark>`,
      ['switchport mode access'],
      {h:S,at:'if',cfg:[' switchport mode access'],why:'La sécurité de port exige un port d’accès.'}),
    c(`Sur <mark>${S}</mark> : <mark>active la sécurité de port</mark> sur Fa0/5`,
      ['switchport port-security'],
      {h:S,at:'if',cfg:[' switchport port-security'],why:'La fonction port-security est maintenant activée sur le port.'}),
    c(`Sur <mark>${S}</mark> : autorise au maximum <mark>${PS_MAX2}</mark> adresses MAC sur ce port`,
      [`switchport port-security maximum ${PS_MAX2}`],
      {h:S,at:'if',cfg:[` switchport port-security maximum ${PS_MAX2}`],why:'Jusqu’à 10 adresses MAC différentes peuvent être apprises sur ce port.'}),
    c(`Sur <mark>${S}</mark> : autorise l’<mark>inscription dynamique</mark> des adresses MAC avec le mot clé <mark>sticky</mark>`,
      ['switchport port-security mac-address sticky'],
      {h:S,at:'if',cfg:[' switchport port-security mac-address sticky'],why:'sticky apprend dynamiquement les adresses MAC et les enregistre dans la configuration courante (running-config).'}),
    c(`Sur <mark>${S}</mark> : en cas de violation, active le mode <mark>protect</mark>`,
      ['switchport port-security violation protect'],
      {h:S,at:'if',cfg:[' switchport port-security violation protect'],why:'protect abandonne en silence les trames des adresses non autorisées : pas de message, pas de compteur de violations.'}),

    /* ---------- Exercice 3 : sticky, violation restrict (Fa0/5) ---------- */
    c(`Sur <mark>${S}</mark> : entre dans la configuration de l’interface <mark>Fa0/5</mark>`,
      ifOk(5),
      {h:S,at:'cfg',go:'if',cfg:['! ===== Exercice 3 : sticky + restrict =====','interface FastEthernet0/5'],why:'Fa0/5 est de nouveau le port à sécuriser, cette fois avec le mode de violation restrict.'}),
    c(`Sur <mark>${S}</mark> : configure le port en <mark>mode accès</mark>`,
      ['switchport mode access'],
      {h:S,at:'if',cfg:[' switchport mode access'],why:'Le port doit être un port d’accès pour activer la sécurité de port.'}),
    c(`Sur <mark>${S}</mark> : <mark>active la sécurité de port</mark> sur Fa0/5`,
      ['switchport port-security'],
      {h:S,at:'if',cfg:[' switchport port-security'],why:'La fonction port-security est activée sur le port.'}),
    c(`Sur <mark>${S}</mark> : autorise au maximum <mark>${PS_MAX3}</mark> adresses MAC`,
      [`switchport port-security maximum ${PS_MAX3}`],
      {h:S,at:'if',cfg:[` switchport port-security maximum ${PS_MAX3}`],why:'Quatre adresses MAC différentes au maximum peuvent être apprises.'}),
    c(`Sur <mark>${S}</mark> : active l’inscription dynamique des adresses MAC avec <mark>sticky</mark>`,
      ['switchport port-security mac-address sticky'],
      {h:S,at:'if',cfg:[' switchport port-security mac-address sticky'],why:'Les adresses apprises sont conservées dans la running-config.'}),
    c(`Sur <mark>${S}</mark> : en cas de violation, utilise le mode <mark>restrict</mark> (restreindre)`,
      ['switchport port-security violation restrict'],
      {h:S,at:'if',cfg:[' switchport port-security violation restrict'],why:'restrict abandonne les trames non autorisées, incrémente le compteur de violations et envoie un message syslog, mais le port reste actif.'})
  ];
}

registerModule({
  id:'portsec',build:buildPortsec,mode:'cfg',host:PS_SW,img:'portsec.png',
  chips:['switchport ','port-security ','mac-address ',['int F0/5','interface F0/5']]   /* le bouton affiche « int F0/5 » et écrit « interface F0/5 » */
});
