'use strict';
/* Dépend de catalog.js : registerModule.  Images : ppp-pap.png puis ppp-chap.png  (id catalogue : ppp)
   Topologie : R1 (S0/0/0, 10.0.0.1) — liaison série 10.0.0.0/30 — R2 (S0/0/0, 10.0.0.2)
   Partie 1 : PAP (bidirectionnel) · Partie 2 : CHAP — l’image change à chaque étape (champ img de l’étape, géré par app.js)
   Si le cours change, modifier seulement ces constantes (les valeurs sont écrites dans les consignes) : */
const PP_U1='admin1';             /* utilisateur de R1 */
const PP_U2='admin2';             /* utilisateur de R2 */
const PP_PW='cisco123';           /* mot de passe (sensible à la casse) */
const PP_IMG_PAP ='ppp-pap.png';
const PP_IMG_CHAP='ppp-chap.png';

/* écritures acceptées pour « interface S0/0/0 » : forme complète en premier (c’est elle que l’indice affiche) */
function ppSer(){const o=[];for(const k of['interface','int'])for(const x of['Serial','Ser','Se','S'])for(const sp of['',' '])o.push(`${k} ${x}${sp}0/0/0`);return o}

function buildPpp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);

  /* R : routeur · own : son utilisateur · peer : l’utilisateur de l’autre routeur · tag : PAP ou CHAP */
  const block=(tag,img,R,own,peer,first,auth)=>[
    c(`<mark>${tag}</mark> · Sur <mark>${R}</mark> : crée l’utilisateur <mark>${peer}</mark> avec le mot de passe <mark>${PP_PW}</mark>`,
      [`username ${peer} password ${PP_PW}`],
      {img,h:R,at:'cfg',v:[peer,PP_PW],cfg:[first,`username ${peer} password ${PP_PW}`],why:`C’est le compte de l’autre routeur : ${R} l’utilisera pour vérifier l’identité de son voisin.`}),
    c(`<mark>${tag}</mark> · Sur <mark>${R}</mark> : entre dans la configuration de l’interface <mark>S0/0/0</mark>`,
      ppSer(),
      {img,h:R,at:'cfg',go:'if',cfg:['interface Serial0/0/0'],why:'S0/0/0 est l’interface série qui relie les deux routeurs.'}),
    c(`<mark>${tag}</mark> · Sur <mark>${R}</mark> : change l’<mark>encapsulation</mark> de l’interface en <mark>PPP</mark>`,
      ['encapsulation ppp'],
      {img,h:R,at:'if',cfg:[' encapsulation ppp'],why:'Par défaut, une interface série Cisco utilise HDLC ; PPP est nécessaire pour l’authentification PAP / CHAP.'}),
    ...auth(img,R,own)
  ];

  const pap=(img,R,own)=>[
    c(`<mark>PAP</mark> · Sur <mark>${R}</mark> : active l’<mark>authentification PAP</mark>`,
      ['ppp authentication pap'],
      {img,h:R,at:'if',cfg:[' ppp authentication pap'],why:'PAP : le voisin envoie son nom et son mot de passe en clair, une seule fois. Peu sécurisé.'}),
    c(`<mark>PAP</mark> · Sur <mark>${R}</mark> : définis le nom <mark>${own}</mark> et le mot de passe <mark>${PP_PW}</mark> que ${R} <mark>envoie</mark> à son voisin`,
      [`ppp pap sent-username ${own} password ${PP_PW}`],
      {img,h:R,at:'if',v:[own,PP_PW],cfg:[` ppp pap sent-username ${own} password ${PP_PW}`],why:'sent-username : les identifiants que ce routeur présente à l’autre (bidirectionnel : les deux routeurs s’authentifient mutuellement).'})
  ];

  const chap=(img,R,own)=>[
    c(`<mark>CHAP</mark> · Sur <mark>${R}</mark> : active l’<mark>authentification CHAP</mark>`,
      ['ppp authentication chap'],
      {img,h:R,at:'if',cfg:[' ppp authentication chap'],why:'CHAP : le mot de passe ne circule jamais ; le voisin répond à un défi (challenge) avec un condensé MD5.'}),
    c(`<mark>CHAP</mark> · Sur <mark>${R}</mark> : définis le nom CHAP <mark>${own}</mark> de ${R}`,
      [`ppp chap hostname ${own}`],
      {img,h:R,at:'if',v:[own],cfg:[` ppp chap hostname ${own}`],why:'Le nom que ce routeur utilise pour s’identifier auprès de l’autre (au lieu de son hostname).'}),
    c(`<mark>CHAP</mark> · Sur <mark>${R}</mark> : définis le mot de passe CHAP <mark>${PP_PW}</mark>`,
      [`ppp chap password ${PP_PW}`],
      {img,h:R,at:'if',v:[PP_PW],cfg:[` ppp chap password ${PP_PW}`],why:'Mot de passe partagé utilisé pour calculer la réponse au défi ; il doit correspondre à celui de l’utilisateur créé chez le voisin.'})
  ];

  return[
    ...block('PAP',PP_IMG_PAP,'R1',PP_U1,PP_U2,'! ===== PAP : R1 =====',pap),
    ...block('PAP',PP_IMG_PAP,'R2',PP_U2,PP_U1,'! ===== PAP : R2 =====',pap),
    ...block('CHAP',PP_IMG_CHAP,'R1',PP_U1,PP_U2,'! ===== CHAP : R1 =====',chap),
    ...block('CHAP',PP_IMG_CHAP,'R2',PP_U2,PP_U1,'! ===== CHAP : R2 =====',chap)
  ];
}

registerModule({
  id:'ppp',build:buildPpp,mode:'cfg',host:'R1',img:PP_IMG_PAP,
  chips:['username ','password ','ppp ','authentication ','S0/0/0']
});
