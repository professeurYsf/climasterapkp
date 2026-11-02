'use strict';
/* Dépend de catalog.js : registerModule.  Image : ntp.png  (id catalogue : ntp)
   Topologie : R1 (client NTP, Gig0/0, 10.0.0.1) — S1 — R2 (serveur NTP, Gig0/0, 10.0.0.2) — réseau 10.0.0.0/8
   Si le cours change, modifier seulement ces constantes : */
const NT_SRV   ='R2';             /* serveur NTP (maître) */
const NT_CLI   ='R1';             /* client NTP */
const NT_SRV_IP='10.0.0.2';       /* adresse du serveur NTP */
const NT_STRATUM='1';             /* strate du maître */

function buildNtp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  return[
    c(`Sur <mark>${NT_SRV}</mark> : configure-le en tant que <mark>maître NTP</mark> (strate <mark>${NT_STRATUM}</mark>)`,
      [`ntp master ${NT_STRATUM}`],
      {h:NT_SRV,at:'cfg',cfg:['! ===== R2 =====',`ntp master ${NT_STRATUM}`],why:'ntp master fait de R2 une source de temps : il se sert de sa propre horloge, de strate 1 ; ses clients seront de strate 2.'}),
    c(`Sur <mark>${NT_CLI}</mark> : configure-le en tant que <mark>client NTP</mark> du serveur <mark>${NT_SRV_IP}</mark>`,
      [`ntp server ${NT_SRV_IP}`],
      {h:NT_CLI,at:'cfg',cfg:['! ===== R1 =====',`ntp server ${NT_SRV_IP}`],why:'ntp server désigne la source de temps : R1 synchronise son horloge sur celle de R2.'}),
    c(`Sur <mark>${NT_CLI}</mark> : <mark>mets à jour le calendrier matériel</mark> avec l’heure obtenue par NTP`,
      ['ntp update-calendar'],
      {h:NT_CLI,at:'cfg',cfg:['ntp update-calendar'],why:'Le routeur a deux horloges : l’horloge logicielle (synchronisée par NTP) et le calendrier matériel, que cette commande met à jour périodiquement.'}),
    c(`Sur <mark>${NT_CLI}</mark> : vérifie l’<mark>état de la synchronisation NTP</mark>`,
      shw('ntp status'),
      {h:NT_CLI,at:'priv',why:'show ntp status indique si l’horloge est synchronisée (« Clock is synchronized »), la strate et l’adresse du serveur de référence.'})
  ];
}

registerModule({
  id:'ntp',build:buildNtp,mode:'cfg',host:NT_SRV,img:'ntp.png',
  chips:['ntp ','show ','server ',NT_SRV_IP]
});
