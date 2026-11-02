'use strict';
/* Dépend de catalog.js : registerModule.  Image : acl.png  (id catalogue : acl)
   Topologie : PC0 (192.168.1.100) — R1 (G0/0 .1 · S0/0/0 10.0.0.1) — R2 (S0/0/0 .2 · G0/0 200.0.0.1) — Sw — Srv1 (200.0.0.5 HTTP/SMTP) · Srv2 (200.0.0.6 DNS/FTP)
   Scénarios (tous sur R1) : 1. ACL standard 1 · 2. ACL étendue 100 (PC → serveurs) · 3. ACL 100 étendue au réseau + ICMP + permit ip any any
                              4. ACL étendue nommée test1 (telnet) + line vty · 5. Vérification (show) à la fin
   Si le cours change, modifier seulement ces constantes : */
const AC_R   ='R1';                  /* routeur où se font les ACL */
const AC_PC  ='192.168.1.100';       /* PC0 */
const AC_LAN ='192.168.1.0';         /* réseau du PC */
const AC_LANW='0.0.0.255';           /* wildcard d’un /24 */
const AC_NET ='200.0.0.0';           /* réseau des serveurs */
const AC_S1  ='200.0.0.5';           /* Srv1 : HTTP et SMTP */
const AC_S2  ='200.0.0.6';           /* Srv2 : DNS et FTP */
const AC_NAME='test1';               /* ACL étendue nommée (sensible à la casse) */

/* écritures acceptées pour une interface : forme complète en premier (c’est elle que l’indice affiche) */
function acIf(types,slot){const o=[];for(const k of['interface','int'])for(const x of types)for(const sp of['',' '])o.push(`${k} ${x}${sp}${slot}`);return o}
const acGig=()=>acIf(['GigabitEthernet','Gig','Gi','G'],'0/0');
const acSer=()=>acIf(['Serial','Ser','Se','S'],'0/0/0');
/* « base eq 80 » ou « base eq www » : numéro en premier, puis les mots-clés IOS */
const acEq=(base,port,names)=>[port,...names].map(p=>`${base} eq ${p}`);

function buildAcl(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);
  const R=AC_R;
  const Q=(tag,txt)=>`<mark>${tag}</mark> · Sur <mark>${R}</mark> : ${txt}`;
  const cfg=(...l)=>({h:R,at:'cfg',cfg:l});

  /* ---------- 1. ACL standard numérotée (1 à 99) ---------- */
  const T1='ACL standard';
  const s1=[
    c(Q(T1,`crée l’<mark>ACL standard 1</mark> qui <mark>autorise</mark> le réseau <mark>${AC_NET}</mark> (wildcard <mark>0.0.0.255</mark>)`),
      [`access-list 1 permit ${AC_NET} 0.0.0.255`,`access-list 1 permit ${AC_NET}`],
      {...cfg('! ===== R1 : ACL standard 1 =====',`access-list 1 permit ${AC_NET} 0.0.0.255`),why:'Une ACL standard ne regarde que l’adresse SOURCE : ici, seul le trafic qui vient du réseau 200.0.0.0/24 (les serveurs) est autorisé. Numéros 1 à 99. Tout le reste est refusé par le deny implicite.'}),
    c(Q(T1,'entre dans la configuration de l’interface <mark>G0/0</mark>'),
      acGig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'G0/0 est l’interface côté PC (réseau 192.168.1.0/24).'}),
    c(Q(T1,'applique l’<mark>ACL 1</mark> sur cette interface en <mark>sortie</mark> (<mark>out</mark>)'),
      ['ip access-group 1 out'],
      {h:R,at:'if',cfg:[' ip access-group 1 out'],why:'out : filtre les paquets qui sortent de R1 vers le PC. Seuls ceux dont la source est 200.0.0.0/24 (les réponses des serveurs) passent.'}),
    c(Q(T1,'entre dans la configuration de l’interface <mark>S0/0/0</mark>'),
      acSer(),
      {h:R,at:'if',go:'if',cfg:['interface Serial0/0/0'],why:'S0/0/0 est l’interface série vers R2 et les serveurs.'}),
    c(Q(T1,'applique l’<mark>ACL 1</mark> sur cette interface en <mark>entrée</mark> (<mark>in</mark>)'),
      ['ip access-group 1 in'],
      {h:R,at:'if',cfg:[' ip access-group 1 in'],why:'in : filtre les paquets qui arrivent sur R1 depuis le réseau. Seul le trafic venant de 200.0.0.0/24 est accepté.'})
  ];

  /* ---------- 2. ACL étendue numérotée (100 à 199) : PC → serveurs ---------- */
  const T2='ACL étendue';
  const base=`access-list 100`;
  const s2=[
    c(Q(T2,`crée l’<mark>ACL étendue 100</mark> : <mark>autorise</mark> le PC <mark>${AC_PC}</mark> à accéder au serveur <mark>${AC_S1}</mark> en <mark>HTTP</mark> (port <mark>80</mark>)`),
      acEq(`access-list 100 permit tcp host ${AC_PC} host ${AC_S1}`,'80',['www']),
      {...cfg('! ===== R1 : ACL étendue 100 =====',`access-list 100 permit tcp host ${AC_PC} host ${AC_S1} eq 80`),why:'Une ACL étendue filtre le protocole, la source, la destination et le port. « host » désigne une seule adresse ; eq 80 (ou www) = HTTP. Numéros 100 à 199.'}),
    c(Q(T2,`ajoute à l’ACL 100 : autorise le même PC vers <mark>${AC_S1}</mark> en <mark>HTTPS</mark> (port <mark>443</mark>)`),
      acEq(`access-list 100 permit tcp host ${AC_PC} host ${AC_S1}`,'443',['https']),
      {...cfg(`access-list 100 permit tcp host ${AC_PC} host ${AC_S1} eq 443`),why:'HTTPS utilise le port TCP 443.'}),
    c(Q(T2,`ajoute à l’ACL 100 : autorise le même PC vers <mark>${AC_S1}</mark> en <mark>SMTP</mark> (port <mark>25</mark>)`),
      acEq(`access-list 100 permit tcp host ${AC_PC} host ${AC_S1}`,'25',['smtp']),
      {...cfg(`access-list 100 permit tcp host ${AC_PC} host ${AC_S1} eq 25`),why:'SMTP (envoi de courrier) utilise le port TCP 25 ; Srv1 offre HTTP et SMTP.'}),
    c(Q(T2,`ajoute à l’ACL 100 : <mark>refuse</mark> le PC <mark>${AC_PC}</mark> vers <mark>${AC_S2}</mark> sur le port <mark>53</mark> (DNS)`),
      acEq(`access-list 100 deny tcp host ${AC_PC} host ${AC_S2}`,'53',['domain']),
      {...cfg(`access-list 100 deny tcp host ${AC_PC} host ${AC_S2} eq 53`),why:'DNS = port 53 ; Srv2 (200.0.0.6) offre DNS et FTP. En IOS, le mot-clé du port 53 est « domain ».'}),
    c(Q(T2,`ajoute à l’ACL 100 : <mark>refuse</mark> le PC <mark>${AC_PC}</mark> vers <mark>${AC_S2}</mark> sur le port <mark>21</mark> (FTP)`),
      acEq(`access-list 100 deny tcp host ${AC_PC} host ${AC_S2}`,'21',['ftp']),
      {...cfg(`access-list 100 deny tcp host ${AC_PC} host ${AC_S2} eq 21`),why:'FTP (contrôle) utilise le port TCP 21.'}),
    c(Q(T2,'entre dans la configuration de l’interface <mark>G0/0</mark>'),
      acGig(),
      {h:R,at:'cfg',go:'if',cfg:['interface GigabitEthernet0/0'],why:'Une ACL étendue se place au plus près de la source : G0/0, côté PC.'}),
    c(Q(T2,'applique l’<mark>ACL 100</mark> sur cette interface en <mark>entrée</mark> (<mark>in</mark>)'),
      ['ip access-group 100 in'],
      {h:R,at:'if',cfg:[' ip access-group 100 in'],why:'in : les paquets du PC sont filtrés dès leur arrivée sur R1, avant d’être routés.'})
  ];

  /* ---------- 3. Étendre l’ACL 100 : tout le réseau, ICMP, permit ip any any ---------- */
  const T3='ACL étendue (réseau)';
  const s3=[
    c(Q(T3,`ajoute à l’ACL 100 : autorise tout le <mark>réseau ${AC_LAN}</mark> (wildcard <mark>${AC_LANW}</mark>), et plus seulement le PC, vers <mark>${AC_S1}</mark> en <mark>HTTP</mark> (port 80)`),
      acEq(`access-list 100 permit tcp ${AC_LAN} ${AC_LANW} host ${AC_S1}`,'80',['www']),
      {...cfg('! ===== R1 : ACL 100 étendue au réseau =====',`access-list 100 permit tcp ${AC_LAN} ${AC_LANW} host ${AC_S1} eq 80`),why:'Au lieu de « host », on donne un réseau et son wildcard : tous les hôtes de 192.168.1.0/24 peuvent accéder au serveur Web.'}),
    c(Q(T3,`ajoute à l’ACL 100 : autorise les <mark>requêtes ping</mark> (<mark>echo</mark>) du réseau <mark>${AC_LAN}</mark> vers le réseau <mark>${AC_NET}</mark> (wildcard <mark>${AC_LANW}</mark>)`),
      [`access-list 100 permit icmp ${AC_LAN} ${AC_LANW} ${AC_NET} ${AC_LANW} echo`],
      {...cfg(`access-list 100 permit icmp ${AC_LAN} ${AC_LANW} ${AC_NET} ${AC_LANW} echo`),why:'ICMP echo = echo request, la requête envoyée par la commande ping.'}),
    c(Q(T3,`ajoute à l’ACL 100 : autorise les <mark>réponses ping</mark> (<mark>echo-reply</mark>) du réseau <mark>${AC_NET}</mark> vers le réseau <mark>${AC_LAN}</mark>`),
      [`access-list 100 permit icmp ${AC_NET} ${AC_LANW} ${AC_LAN} ${AC_LANW} echo-reply`],
      {...cfg(`access-list 100 permit icmp ${AC_NET} ${AC_LANW} ${AC_LAN} ${AC_LANW} echo-reply`),why:'echo-reply est la réponse à un ping : sans elle, les réponses des serveurs seraient bloquées.'}),
    c(Q(T3,'ajoute à l’ACL 100 : <mark>autorise tout le reste</mark> du trafic IP (<mark>permit ip any any</mark>)'),
      ['access-list 100 permit ip any any'],
      {...cfg('access-list 100 permit ip any any'),why:'any = n’importe quelle adresse. Cette ligne, en dernier, évite que le deny implicite bloque tout le reste. Les lignes sont lues dans l’ordre : le deny DNS et FTP reste prioritaire.'})
  ];

  /* ---------- 4. ACL étendue nommée + line vty ---------- */
  const T4='ACL nommée et VTY';
  const s4=[
    c(Q(T4,`crée l’<mark>ACL étendue nommée</mark> <mark>${AC_NAME}</mark>`),
      [`ip access-list extended ${AC_NAME}`],
      {h:R,at:'cfg',go:'enacl',v:[AC_NAME],cfg:['! ===== R1 : ACL nommée + VTY =====',`ip access-list extended ${AC_NAME}`],why:'Une ACL nommée remplace le numéro par un nom ; on entre dans son mode (config-ext-nacl) et on tape les règles sans « access-list ».'}),
    c(Q(T4,`autorise <mark>uniquement Telnet</mark> (port <mark>23</mark>) depuis le PC <mark>${AC_PC}</mark> vers n’importe quelle destination`),
      acEq(`permit tcp host ${AC_PC} any`,'23',['telnet']),
      {h:R,at:'enacl',cfg:[` permit tcp host ${AC_PC} any eq 23`],why:'Telnet = TCP 23. Comme tout le reste est refusé par le deny implicite, seul ce PC pourra ouvrir une session Telnet.'}),
    c(Q(T4,'entre dans la configuration des lignes <mark>vty 0 à 4</mark> (accès distant)'),
      ['line vty 0 4'],
      {h:R,at:'cfg',go:'line',cfg:['line vty 0 4'],why:'Les lignes vty 0 à 4 sont les 5 sessions Telnet/SSH simultanées possibles vers le routeur.'}),
    c(Q(T4,`applique l’ACL <mark>${AC_NAME}</mark> aux lignes vty en <mark>entrée</mark> (<mark>access-class</mark>)`),
      [`access-class ${AC_NAME} in`],
      {h:R,at:'line',v:[AC_NAME],cfg:[` access-class ${AC_NAME} in`],why:'Sur une ligne vty on utilise access-class (et non access-group) : l’ACL filtre qui peut se connecter AU routeur.'})
  ];

  /* ---------- 5. Vérification (à la fin) ---------- */
  const T5='Vérification';
  const s5=[
    c(Q(T5,'affiche <mark>toutes les ACL</mark> configurées'),
      shw('access-lists').concat(shw('access-list')),
      {h:R,at:'priv',why:'show access-lists affiche chaque ACL, ses règles numérotées (10, 20, 30…) et le nombre de correspondances (matches).'}),
    c(Q(T5,`affiche uniquement l’ACL nommée <mark>${AC_NAME}</mark>`),
      shw(`access-lists ${AC_NAME}`).concat(shw(`access-list ${AC_NAME}`)),
      {h:R,at:'priv',why:'On donne le nom (ou le numéro) pour n’afficher qu’une seule ACL.'}),
    c(Q(T5,'affiche la configuration IP de l’interface <mark>G0/0</mark> : on y voit l’ACL appliquée en entrée et en sortie'),
      shw('ip interface GigabitEthernet0/0').concat(shw('ip interface Gig0/0'),shw('ip interface Gi0/0'),shw('ip interface G0/0'),shw('ip int g0/0'),shw('ip int Gig0/0')),
      {h:R,at:'priv',why:'show ip interface indique « Outgoing access list is 1 » et « Inbound access list is 100 » : les ACL réellement appliquées.'})
  ];

  return[...s1,...s2,...s3,...s4,...s5];
}

registerModule({
  id:'acl',build:buildAcl,mode:'cfg',host:AC_R,img:'acl.png',
  modes:{enacl:['(config-ext-nacl)#','Configuration d’ACL étendue nommée']},   /* R1(config-ext-nacl)# */
  chips:['access-list ','permit ','deny ','host ']
});
