'use strict';
/* Dépend de catalog.js : registerModule, ifOk.  Module « Config de base d’un Switch » (id : base-sw)
   Pas d'image : le schéma n'est pas nécessaire pour cette catégorie.
   Si les valeurs changent, modifier seulement ces constantes : */
const BS_NAME='sw1', BS_EN_PASS='cisco123', BS_EN_SECRET='cisco456', BS_LINE_PASS='cisco789',
      BS_BANNER='bienvenue sur sw1', BS_VLAN=99, BS_IP='192.168.1.99', BS_MASK='255.255.255.0',
      BS_GW='192.168.1.1', BS_PORTS=[1,5];

function buildBaseSw(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const [p1,p2]=BS_PORTS;
  return[
    c(`Change le nom de l’équipement en <mark>${BS_NAME}</mark>`,[`hostname ${BS_NAME}`],
      {host:BS_NAME,v:[BS_NAME],cfg:[`hostname ${BS_NAME}`],why:'hostname change le nom du switch : il apparaît dans l’invite de commande.'}),
    c(`Configure le mot de passe enable <mark>${BS_EN_PASS}</mark>`,[`enable password ${BS_EN_PASS}`],
      {v:[BS_EN_PASS],cfg:[`enable password ${BS_EN_PASS}`],why:'enable password protège le mode privilégié, mais il est stocké en clair.'}),
    c(`Configure le mot de passe enable secret <mark>${BS_EN_SECRET}</mark>`,[`enable secret ${BS_EN_SECRET}`],
      {v:[BS_EN_SECRET],cfg:[`enable secret ${BS_EN_SECRET}`],why:'enable secret est chiffré et prioritaire sur enable password.'}),
    c('Désactive la <mark>résolution DNS</mark> des commandes mal tapées',['no ip domain-lookup','no ip domain lookup'],
      {cfg:['no ip domain-lookup'],why:'Évite l’attente quand une commande mal écrite est prise pour un nom d’hôte.'}),
    c(`Configure la bannière <mark>motd</mark> avec le message <mark>${BS_BANNER}</mark> (délimiteur #)`,[`banner motd #${BS_BANNER}#`],
      {v:[BS_BANNER],cfg:[`banner motd #${BS_BANNER}#`],why:'La bannière motd s’affiche à chaque connexion ; # sert de délimiteur.'}),

    c('Ouvre la ligne <mark>console 0</mark>',['line console 0'],
      {go:'line',cfg:['line console 0'],why:'line console 0 ouvre le mode (config-line)# de la console.'}),
    c(`Définis le mot de passe <mark>${BS_LINE_PASS}</mark>`,[`password ${BS_LINE_PASS}`],
      {v:[BS_LINE_PASS],cfg:[` password ${BS_LINE_PASS}`],why:'Mot de passe demandé pour accéder à la console.'}),
    c('Active la vérification du mot de passe avec <mark>login</mark>',['login'],
      {cfg:[' login'],why:'Sans login, le mot de passe n’est jamais demandé.'}),

    c('Ouvre les lignes <mark>vty 0 4</mark>',['line vty 0 4'],
      {at:'cfg',go:'line',cfg:['line vty 0 4'],why:'Les lignes vty 0 à 4 permettent 5 connexions distantes (Telnet/SSH).'}),
    c(`Définis le mot de passe <mark>${BS_LINE_PASS}</mark>`,[`password ${BS_LINE_PASS}`],
      {v:[BS_LINE_PASS],cfg:[` password ${BS_LINE_PASS}`],why:'Mot de passe demandé pour l’accès à distance.'}),
    c('Active la vérification du mot de passe avec <mark>login</mark>',['login'],
      {cfg:[' login'],why:'login oblige à saisir le mot de passe sur les lignes vty.'}),

    c('<mark>Chiffre</mark> tous les mots de passe en clair',['service password-encryption'],
      {at:'cfg',cfg:['service password-encryption'],why:'Chiffre (faiblement) les mots de passe visibles dans la running-config.'}),

    c(`Ouvre l’interface virtuelle <mark>VLAN ${BS_VLAN}</mark>`,[`interface vlan ${BS_VLAN}`,`int vlan ${BS_VLAN}`],
      {go:'if',cfg:[`interface Vlan${BS_VLAN}`],why:'L’interface VLAN (SVI) donne une adresse IP au switch pour l’administrer.'}),
    c(`Configure l’adresse <mark>${BS_IP}/24</mark>`,[`ip address ${BS_IP} ${BS_MASK}`,`ip add ${BS_IP} ${BS_MASK}`],
      {cfg:[` ip address ${BS_IP} ${BS_MASK}`],why:'/24 correspond au masque 255.255.255.0.'}),
    c('<mark>Active</mark> l’interface',['no shutdown','no shut','no sh'],
      {cfg:[' no shutdown'],why:'no shutdown allume l’interface : elle passe à up.'}),
    c(`Configure la passerelle par défaut <mark>${BS_GW}</mark>`,[`ip default-gateway ${BS_GW}`],
      {at:'cfg',v:[BS_GW],cfg:[`ip default-gateway ${BS_GW}`],why:'Permet au switch de joindre d’autres réseaux (utile pour l’administrer à distance).'}),

    c(`Sélectionne les ports inutilisés <mark>Fa0/${p1} à Fa0/${p2}</mark> avec interface range`,ifOk(p1,p2),
      {go:'ifr',cfg:[`interface range FastEthernet0/${p1}-${p2}`],why:'interface range applique les commandes suivantes à tous les ports de la plage.'}),
    c('<mark>Désactive</mark> ces ports',['shutdown','shut','sh'],
      {cfg:[' shutdown'],why:'Désactiver les ports inutilisés empêche les branchements non autorisés.'}),

    c('Sauvegarde la configuration dans la <mark>NVRAM</mark>',['copy running-config startup-config','write memory','copy run start'],
      {at:'priv',why:'Copie la running-config (RAM) vers la startup-config (NVRAM) pour la garder après redémarrage.'})
  ];
}

registerModule({
  id:'base-sw',build:buildBaseSw,mode:'cfg',host:'Switch',
  chips:[BS_EN_PASS,BS_BANNER,[BS_IP+'/24',BS_IP+' '+BS_MASK],BS_GW]
});
