'use strict';
/* Dépend de catalog.js : registerModule.  Image : syslog.png  (id catalogue : syslog)
   Topologie : Serveur Syslog (Fa0, 10.0.0.254) — réseau 10.0.0.0/8 — R1 (Gig0/0, 10.0.0.1)
   Si le cours change, modifier seulement ces constantes (les valeurs sont écrites dans les consignes) : */
const SY_R   ='R1';                      /* nom du routeur */
const SY_SRV ='10.0.0.254';              /* adresse du serveur Syslog */
const SY_LVL ='4';                       /* niveau de gravité (4 = warnings) */
const SY_TIME='12:30:00';                /* heure (bouton d’aide) */
const SY_DATE='15 MAR 2027';             /* date (jour mois année) */
const SY_CLK =`${SY_TIME} ${SY_DATE}`;   /* le bouton « 12:30:00 » écrit heure + date complètes */

/* écritures acceptées pour « g0/0 » : forme complète en premier (c’est elle que l’indice affiche) */
function syGig(){const o=[];for(const x of['GigabitEthernet','Gig','Gi','G','g'])for(const sp of['',' '])o.push(`logging source-interface ${x}${sp}0/0`);return o}

function buildSyslog(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);
  const R=SY_R;

  return[
    c(`Sur <mark>${R}</mark> : envoie les <mark>événements consignés</mark> au <mark>serveur Syslog</mark> <mark>${SY_SRV}</mark>`,
      [`logging ${SY_SRV}`],
      {h:R,at:'cfg',cfg:['! ===== R1 =====',`logging ${SY_SRV}`],why:'logging suivi d’une adresse IP envoie les messages du routeur au serveur Syslog (UDP, port 514).'}),
    c(`Sur <mark>${R}</mark> : modifie le <mark>niveau de gravité</mark> de la journalisation à <mark>${SY_LVL}</mark>`,
      [`logging trap ${SY_LVL}`,'logging trap warnings'],
      {h:R,at:'cfg',cfg:[`logging trap ${SY_LVL}`],why:'Les messages de gravité 0 à 4 (emergencies à warnings) sont envoyés au serveur ; les niveaux plus bas (notifications, informational, debugging) sont ignorés.'}),
    c(`Sur <mark>${R}</mark> : configure l’<mark>interface source</mark> des messages : <mark>G0/0</mark>`,
      syGig(),
      {h:R,at:'cfg',cfg:['logging source-interface GigabitEthernet0/0'],why:'Les messages partent avec l’adresse de G0/0 (10.0.0.1) : le serveur reconnaît toujours le même expéditeur.'}),
    c(`Sur <mark>${R}</mark> : envoie les <mark>horodatages</mark> (date et heure à la milliseconde) avec les journaux`,
      ['service timestamps log datetime msec'],
      {h:R,at:'cfg',cfg:['service timestamps log datetime msec'],why:'Chaque message contient la date et l’heure (avec les millisecondes) : indispensable pour retrouver quand un événement s’est produit.'}),
    c(`Sur <mark>${R}</mark> : vérifie la configuration de <mark>Syslog</mark>`,
      shw('logging'),
      {h:R,at:'priv',why:'show logging affiche le niveau de journalisation, l’adresse du serveur Syslog et les derniers messages.'}),
    c(`Sur <mark>${R}</mark> : règle l’<mark>heure</mark> à <mark>${SY_TIME}</mark> et la date au <mark>${SY_DATE}</mark>`,
      [`clock set ${SY_CLK}`],
      {h:R,at:'priv',v:[SY_CLK],why:'clock set (en mode privilégié) règle l’horloge : heure:minute:seconde, puis jour, mois et année.'}),
    c(`Sur <mark>${R}</mark> : affiche l’<mark>heure</mark> du routeur`,
      shw('clock'),
      {h:R,at:'priv',why:'show clock affiche la date et l’heure du routeur ; une * devant l’heure signale qu’elle n’est pas synchronisée.'})
  ];
}

registerModule({
  id:'syslog',build:buildSyslog,mode:'cfg',host:SY_R,img:'syslog.png',
  chips:['logging ','timestamps ',[SY_TIME,SY_CLK],'datetime ']   /* « 12:30:00 » écrit heure + date complètes */
});
