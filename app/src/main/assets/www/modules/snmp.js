'use strict';
/* Dépend de catalog.js : registerModule.  Image : snmp.png  (id catalogue : snmp)
   Topologie : R1 (192.168.1.1) — SNMP — PC1 (192.168.1.3, visionneuse SNMP)
   Si le cours change, modifier seulement ces constantes (les valeurs sont écrites dans les consignes) : */
const SN_R  ='R1';                 /* nom du routeur */
const SN_MGR='192.168.1.3';        /* adresse du gestionnaire SNMP (PC1) */
const SN_COM='cisco123';           /* community string (sensible à la casse) */
const SN_ACL='SNMP_ACL';           /* nom de l’ACL (sensible à la casse) */
const SN_LOC='test';               /* emplacement */
const SN_CON='prof youssef';       /* contact (texte libre, avec espace) */
const SN_GRP='groupe1';            /* groupe SNMPv3 (sensible à la casse) */
const SN_USR='user1';              /* utilisateur SNMPv3 (sensible à la casse) */
const SN_AUT='authpass1';          /* mot de passe d’authentification (8 caractères minimum) */
const SN_PRV='privpass1';          /* mot de passe de chiffrement (8 caractères minimum) */

function buildSnmp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const R=SN_R;
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  return[
    c(`Sur <mark>${R}</mark> : crée la <mark>communauté SNMP</mark> <mark>${SN_COM}</mark> en <mark>lecture seule</mark> (<mark>ro</mark>), limitée par l’ACL <mark>${SN_ACL}</mark>`,
      [`snmp-server community ${SN_COM} ro ${SN_ACL}`],
      {h:R,at:'cfg',v:[SN_COM,SN_ACL],cfg:['! ===== R1 =====',`snmp-server community ${SN_COM} ro ${SN_ACL}`],why:'La community est un mot de passe entre le gestionnaire et le routeur ; ro = lecture seule ; l’ACL restreint les adresses autorisées à l’utiliser.'}),
    c(`Sur <mark>${R}</mark> : définis l’<mark>emplacement</mark> du routeur : <mark>${SN_LOC}</mark>`,
      [`snmp-server location ${SN_LOC}`],
      {h:R,at:'cfg',v:[SN_LOC],cfg:[`snmp-server location ${SN_LOC}`],why:'Texte libre qui décrit où se trouve l’équipement ; il est visible depuis le gestionnaire SNMP.'}),
    c(`Sur <mark>${R}</mark> : définis la <mark>personne à contacter</mark> : <mark>${SN_CON}</mark>`,
      [`snmp-server contact ${SN_CON}`],
      {h:R,at:'cfg',v:[SN_CON],cfg:[`snmp-server contact ${SN_CON}`],why:'Texte libre (un nom, un e-mail…) : ce n’est pas une commande, c’est une information pour l’administrateur.'}),
    c(`Sur <mark>${R}</mark> : envoie les notifications au gestionnaire <mark>${SN_MGR}</mark> en <mark>version 2c</mark> avec la communauté <mark>${SN_COM}</mark>`,
      [`snmp-server host ${SN_MGR} version 2c ${SN_COM}`],
      {h:R,at:'cfg',v:[SN_COM],cfg:[`snmp-server host ${SN_MGR} version 2c ${SN_COM}`],why:'host désigne le destinataire des traps (PC1) ; 2c est la version SNMP utilisée ; la communauté sert d’authentification.'}),
    c(`Sur <mark>${R}</mark> : <mark>active l’envoi des notifications</mark> SNMP (traps)`,
      ['snmp-server enable traps'],
      {h:R,at:'cfg',cfg:['snmp-server enable traps'],why:'Les traps sont des alertes envoyées spontanément au gestionnaire (changement d’état d’une interface, par exemple).'}),
    c(`Sur <mark>${R}</mark> : crée l’<mark>ACL standard nommée</mark> <mark>${SN_ACL}</mark>`,
      [`ip access-list standard ${SN_ACL}`],
      {h:R,at:'cfg',go:'snacl',v:[SN_ACL],cfg:[`ip access-list standard ${SN_ACL}`],why:'ip access-list standard crée l’ACL nommée et ouvre son mode de configuration (config-std-nacl).'}),
    c(`Sur <mark>${R}</mark> : autorise uniquement le gestionnaire <mark>${SN_MGR}</mark>`,
      [`permit ${SN_MGR}`,`permit host ${SN_MGR}`],
      {h:R,at:'snacl',cfg:[` permit ${SN_MGR}`],why:'Seul PC1 peut utiliser la communauté : tout autre équipement est refusé par le deny implicite en fin d’ACL.'}),

    /* ---------- SNMPv3 : groupe et utilisateur ---------- */
    c(`Sur <mark>${R}</mark> : crée le <mark>groupe SNMP</mark> <mark>${SN_GRP}</mark> en <mark>version 3</mark> avec <mark>authentification et chiffrement</mark> (<mark>priv</mark>)`,
      [`snmp-server group ${SN_GRP} v3 priv`],
      {h:R,at:'cfg',v:[SN_GRP],cfg:[`snmp-server group ${SN_GRP} v3 priv`],why:'SNMPv3 définit des groupes : noauth = aucune sécurité, auth = authentification, priv = authentification + chiffrement (le plus sûr).'}),
    c(`Sur <mark>${R}</mark> : ajoute l’<mark>utilisateur</mark> <mark>${SN_USR}</mark> au groupe <mark>${SN_GRP}</mark> en <mark>v3</mark> : authentification <mark>sha</mark> avec le mot de passe <mark>${SN_AUT}</mark>, chiffrement <mark>aes 128</mark> avec le mot de passe <mark>${SN_PRV}</mark>`,
      [`snmp-server user ${SN_USR} ${SN_GRP} v3 auth sha ${SN_AUT} priv aes 128 ${SN_PRV}`],
      {h:R,at:'cfg',v:[SN_USR,SN_GRP,SN_AUT,SN_PRV],cfg:[`snmp-server user ${SN_USR} ${SN_GRP} v3 auth sha ${SN_AUT} priv aes 128 ${SN_PRV}`],why:'auth sha vérifie l’identité de l’utilisateur ; priv aes 128 chiffre les messages ; les deux mots de passe sont différents.'}),

    /* ---------- Vérification ---------- */
    c(`Sur <mark>${R}</mark> : vérifie la configuration SNMP : affiche les <mark>statistiques et l’état</mark> de SNMP`,
      shw('snmp'),
      {h:R,at:'priv',why:'show snmp affiche le contact, l’emplacement, le nombre de paquets SNMP reçus et envoyés, et les erreurs.'}),
    c(`Sur <mark>${R}</mark> : affiche les <mark>communautés SNMP</mark>`,
      shw('snmp community'),
      {h:R,at:'priv',why:'show snmp community liste les communautés configurées, leur ACL et leur état (lecture seule ou lecture-écriture).'})
  ];
}

registerModule({
  id:'snmp',build:buildSnmp,mode:'cfg',host:SN_R,img:'snmp.png',
  modes:{snacl:['(config-std-nacl)#','Configuration d’ACL standard nommée']},   /* R1(config-std-nacl)# */
  chips:['snmp-server ','community ','access-list ',SN_MGR]
});
