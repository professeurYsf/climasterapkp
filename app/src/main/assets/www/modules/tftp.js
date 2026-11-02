'use strict';
/* Dépend de catalog.js : registerModule.  Image : tftp.png  (id catalogue : tftp)
   Topologie : Serveur TFTP (Fa0, 10.0.0.254) — réseau 10.0.0.0/8 — R1 (Gig0/0, 10.0.0.1)
   Chaque « copy … tftp » ouvre une 2e invite : « Address or name of remote host []? » → 10.0.0.254
   Si le cours change, modifier seulement ces constantes : */
const TF_R ='R1';                 /* nom du routeur */
const TF_IP='10.0.0.254';         /* adresse du serveur TFTP */

function buildTftp(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  /* écritures acceptées : running-config / run · startup-config / start. Forme complète en premier : c’est elle que l’indice affiche */
  const RUN=['running-config','run'],STA=['startup-config','start'];
  const to  =src=>src.map(x=>`copy ${x} tftp`);       /* routeur → serveur */
  const from=dst=>dst.map(x=>`copy tftp ${x}`);       /* serveur → routeur */
  const R=TF_R;

  /* commande « copy » : 1re invite = la commande, 2e invite = adresse du serveur TFTP */
  const cp=(q,list,why)=>c(q,list,{h:R,at:'priv',why,then:{
    pre:list,
    pr:'Address or name of remote host []?',
    info:'IOS demande l’adresse ou le nom du serveur TFTP distant : saisis l’adresse IP du serveur.',
    ok:[TF_IP],
    err:'Ce n’est pas l’adresse du serveur TFTP. Regarde le schéma : c’est l’adresse du serveur (Fa0).'
  }});

  return[
    c(`Sur <mark>${R}</mark> : vérifie la connectivité avec le <mark>serveur TFTP</mark> <mark>${TF_IP}</mark>`,
      [`ping ${TF_IP}`],
      {h:R,at:'priv',why:'Avant de copier un fichier, on teste que le routeur joint bien le serveur TFTP (les points « !!!!! » indiquent une réponse).'}),

    /* ---------- Sauvegarde : routeur → serveur TFTP ---------- */
    cp(`Sur <mark>${R}</mark> : <mark>enregistre la configuration en cours d’exécution</mark> sur le <mark>serveur TFTP</mark>`,
      to(RUN),
      'copy running-config tftp envoie la configuration active vers le serveur ; IOS demande l’adresse du serveur, puis le nom du fichier.'),
    cp(`Sur <mark>${R}</mark> : <mark>enregistre la configuration de démarrage</mark> sur le <mark>serveur TFTP</mark>`,
      to(STA),
      'copy startup-config tftp envoie la configuration enregistrée en NVRAM (celle qui sera chargée au prochain démarrage).'),

    /* ---------- Restauration : serveur TFTP → routeur ---------- */
    cp(`Sur <mark>${R}</mark> : <mark>récupère</mark> la configuration depuis le <mark>serveur TFTP</mark> vers la <mark>configuration en cours d’exécution</mark>`,
      from(RUN),
      'copy tftp running-config fusionne le fichier avec la configuration active : les commandes du fichier s’ajoutent ou remplacent les existantes, sans redémarrage.'),
    cp(`Sur <mark>${R}</mark> : <mark>récupère</mark> la configuration depuis le <mark>serveur TFTP</mark> vers la <mark>configuration de démarrage</mark>`,
      from(STA),
      'copy tftp startup-config remplace la configuration de démarrage ; elle ne sera active qu’après un rechargement (reload).')
  ];
}

registerModule({
  id:'tftp',build:buildTftp,mode:'priv',host:TF_R,img:'tftp.png',
  chips:['tftp ','running-config ','startup-config ',TF_IP]
});
