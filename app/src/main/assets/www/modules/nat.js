'use strict';
/* Dépend de catalog.js : registerModule.  (id catalogue : nat — NAT/PAT)  Nécessite app.js avec « img » par étape.
   5 scénarios sur R2, puis la vérification (show) à la fin :
     1. NAT statique                    — nat.png        (S0/1/0 inside · S0/1/1 outside · serveur 192.168.10.254 ⇄ 209.165.201.5)
     2. NAT statique avec port          — nat-port.png   (S0/0/0 inside · S0/1/0 outside · 192.168.10.254:80 ⇄ 209.165.200.225:8080)
     3. NAT dynamique (pool)            — nat-dyn.png    (S0/1/0 inside · S0/1/1 outside · pool 209.165.200.226-240)
     4. PAT avec un pool d’adresses     — nat-pat.png    (idem, mot clé overload)
     5. PAT avec une seule adresse      — nat-pat.png    (adresse de S0/1/1 = 209.165.200.225, overload)
     6. Vérification                    — nat-table.png  (table NAT)
   Si le cours change, modifier seulement ces constantes : */
const NA_R   ='R2';                  /* routeur NAT */
/* scénario 1 : NAT statique */
const NA_LOC ='192.168.10.254';      /* adresse privée du serveur (inside local) */
const NA_GLO ='209.165.201.5';       /* adresse publique du serveur (inside global) */
const NA_IN  ='192.168.1.2';         /* S0/1/0 (inside) */
const NA_INM ='255.255.255.252';     /* masque /30 */
const NA_INGW='192.168.1.1';         /* routeur voisin côté inside */
const NA_LAN ='192.168.10.0';        /* réseau du serveur */
const NA_LANM='255.255.255.0';       /* masque du réseau du serveur */
const NA_OUT ='209.165.200.1';       /* S0/1/1 (outside) */
const NA_OUTM='255.255.255.252';     /* masque /30 */
const NA_ISP ='209.165.200.2';       /* routeur de l’opérateur (ISP) */
/* scénario 2 : NAT statique avec port */
const NA_PUB ='209.165.200.225';     /* adresse publique */
const NA_PIN ='80';                  /* port interne (serveur web) */
const NA_POUT='8080';                /* port public */
/* scénarios 3 à 5 : NAT dynamique / PAT */
const NA_P1  ='NAT-POOL1';           /* pool du NAT dynamique (sensible à la casse) */
const NA_P2  ='NAT-POOL2';           /* pool du PAT (sensible à la casse) */
const NA_PF  ='209.165.200.226';     /* première adresse du pool */
const NA_PL  ='209.165.200.240';     /* dernière adresse du pool */
const NA_PM  ='255.255.255.224';     /* masque du pool (/27) */
const NA_ACLN='192.168.0.0';         /* ACL 1 : réseaux internes autorisés */
const NA_ACLW='0.0.255.255';         /* wildcard de l’ACL 1 */

/* préfixes acceptés (forme complète en premier : c’est elle que l’indice affiche) */
const naPre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};
/* « interface Serial 0/1/n » : int / interface + Serial, Ser, Se, S, avec ou sans espace */
function naSer(slot){const o=[];for(const k of['interface','int'])for(const x of['Serial','Ser','Se','S'])for(const sp of['',' '])o.push(`${k} ${x}${sp}${slot}`);return o}
/* « interface serial 0/1/1 » dans « ip nat inside source list 1 interface … overload » */
function naSerIf(slot){const o=[];for(const x of['Serial','Ser','Se','S'])for(const sp of['',' '])o.push(`ip nat inside source list 1 interface ${x}${sp}${slot} overload`);return o}

function buildNat(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);
  const R=NA_R;
  const Q=(tag,txt)=>`<mark>${tag}</mark> · Sur <mark>${R}</mark> : ${txt}`;

  /* briques communes : entrée dans l’interface, inside / outside, exit */
  const enter=(img,tag,slot,label,at,why)=>c(Q(tag,`entre dans la configuration de l’interface <mark>S${slot}</mark> (côté <mark>${label}</mark>)`),
    naSer(slot),{img,h:R,at,go:'if',cfg:[`interface Serial${slot}`],why});
  const side=(img,tag,s,why)=>c(Q(tag,`déclare cette interface comme <mark>${s==='inside'?'interne (inside)':'externe (outside)'}</mark> pour le NAT`),
    [`ip nat ${s}`],{img,h:R,at:'if',cfg:[` ip nat ${s}`],why});
  const exit=(img,tag)=>c(Q(tag,'<mark>quitte</mark> le mode de configuration de l’interface'),
    ['exit'],{img,h:R,at:'if',go:'cfg',why:'exit revient au mode de configuration globale.'});
  const ip=(img,tag,addr,mask,why)=>c(Q(tag,`attribue l’adresse <mark>${addr}</mark> et le masque <mark>${mask}</mark> (/30)`),
    naPre('address',3).map(x=>`ip ${x} ${addr} ${mask}`),{img,h:R,at:'if',cfg:[` ip address ${addr} ${mask}`],why});
  const WHY_IN ='inside : réseau interne, dont les adresses sont traduites au passage vers l’extérieur.';
  const WHY_OUT='outside : réseau externe (Internet), vers lequel les paquets sortent avec l’adresse traduite.';
  const acl=(img,tag,first)=>c(Q(tag,`crée l’<mark>ACL 1</mark> qui autorise les réseaux internes <mark>${NA_ACLN}</mark> (wildcard <mark>${NA_ACLW}</mark>)`),
    [`access-list 1 permit ${NA_ACLN} ${NA_ACLW}`],
    {img,h:R,at:'cfg',cfg:(first||[]).concat([`access-list 1 permit ${NA_ACLN} ${NA_ACLW}`]),why:'Cette ACL ne filtre pas : elle désigne les adresses internes (192.168.10.0/24 et 192.168.11.0/24) qui ont le droit d’être traduites.'});

  /* ---------- 1. NAT statique ---------- */
  const I1='nat.png',T1='NAT statique';
  const s1=[
    c(Q(T1,`configure le <mark>NAT statique</mark> : l’adresse privée du serveur <mark>${NA_LOC}</mark> doit être traduite en <mark>${NA_GLO}</mark>`),
      [`ip nat inside source static ${NA_LOC} ${NA_GLO}`],
      {img:I1,h:R,at:'cfg',v:[NA_LOC,NA_GLO],cfg:['! ===== R2 : NAT statique =====',`ip nat inside source static ${NA_LOC} ${NA_GLO}`],why:'Traduction 1 pour 1, permanente : un client d’Internet atteint le serveur en tapant http://209.165.201.5. L’adresse interne (inside local) vient en premier, l’adresse publique (inside global) en second.'}),
    enter(I1,T1,'0/1/0','inside','cfg','S0/1/0 est l’interface qui mène au réseau interne, où se trouve le serveur.'),
    ip(I1,T1,NA_IN,NA_INM,'Cette adresse relie R2 au routeur du réseau interne (le nuage de gauche, côté 192.168.1.1).'),
    side(I1,T1,'inside',WHY_IN),
    exit(I1,T1),
    enter(I1,T1,'0/1/1','outside','cfg','S0/1/1 est l’interface qui mène à Internet et au client 209.165.200.254.'),
    ip(I1,T1,NA_OUT,NA_OUTM,'Cette adresse relie R2 au routeur de l’opérateur (ISP).'),
    side(I1,T1,'outside',WHY_OUT),
    exit(I1,T1),
    c(Q(T1,`crée une <mark>route statique</mark> vers le réseau du serveur <mark>${NA_LAN}</mark> (masque <mark>${NA_LANM}</mark>) via <mark>${NA_INGW}</mark>`),
      [`ip route ${NA_LAN} ${NA_LANM} ${NA_INGW}`],
      {img:I1,h:R,at:'cfg',cfg:[`ip route ${NA_LAN} ${NA_LANM} ${NA_INGW}`],why:'Le serveur (192.168.10.254) n’est pas dans le réseau 192.168.1.0/30 : R2 doit savoir passer par le routeur interne pour l’atteindre.'}),
    c(Q(T1,`crée une <mark>route par défaut</mark> vers Internet via <mark>${NA_ISP}</mark>`),
      [`ip route 0.0.0.0 0.0.0.0 ${NA_ISP}`],
      {img:I1,h:R,at:'cfg',cfg:[`ip route 0.0.0.0 0.0.0.0 ${NA_ISP}`],why:'0.0.0.0 0.0.0.0 correspond à n’importe quelle destination : route de dernier recours vers l’opérateur, pour joindre le client.'})
  ];

  /* ---------- 2. NAT statique avec port ---------- */
  const I2='nat-port.png',T2='NAT statique avec port';
  const s2=[
    c(Q(T2,`traduis le <mark>port TCP ${NA_PIN}</mark> du serveur <mark>${NA_LOC}</mark> en <mark>${NA_PUB}</mark> port <mark>${NA_POUT}</mark>`),
      [`ip nat inside source static tcp ${NA_LOC} ${NA_PIN} ${NA_PUB} ${NA_POUT}`],
      {img:I2,h:R,at:'cfg',v:[NA_LOC,NA_PUB],cfg:['! ===== R2 : NAT statique avec port =====',`ip nat inside source static tcp ${NA_LOC} ${NA_PIN} ${NA_PUB} ${NA_POUT}`],why:'La traduction relie une adresse locale interne + un port à une adresse globale interne + un port : le client tape http://www.example.com:8080 et atteint le port 80 du serveur.'}),
    enter(I2,T2,'0/0/0','inside','cfg','S0/0/0 est l’interface série qui mène au réseau interne.'),
    side(I2,T2,'inside',WHY_IN),
    exit(I2,T2),
    enter(I2,T2,'0/1/0','outside','cfg','S0/1/0 est l’interface série qui mène à Internet (adresse 209.165.200.225/27).'),
    side(I2,T2,'outside',WHY_OUT)
  ];

  /* ---------- 3. NAT dynamique ---------- */
  const I3='nat-dyn.png',T3='NAT dynamique';
  const s3=[
    c(Q(T3,`crée le <mark>pool d’adresses publiques</mark> <mark>${NA_P1}</mark> : de <mark>${NA_PF}</mark> à <mark>${NA_PL}</mark>, masque <mark>${NA_PM}</mark>`),
      [`ip nat pool ${NA_P1} ${NA_PF} ${NA_PL} netmask ${NA_PM}`],
      {img:I3,h:R,at:'cfg',v:[NA_P1],cfg:['! ===== R2 : NAT dynamique =====',`ip nat pool ${NA_P1} ${NA_PF} ${NA_PL} netmask ${NA_PM}`],why:'Le pool est la plage d’adresses publiques que R2 peut attribuer aux hôtes internes ; le netmask est le masque du réseau public (/27).'}),
    acl(I3,T3),
    c(Q(T3,`associe l’<mark>ACL 1</mark> au pool <mark>${NA_P1}</mark> : traduction dynamique des adresses internes`),
      [`ip nat inside source list 1 pool ${NA_P1}`],
      {img:I3,h:R,at:'cfg',v:[NA_P1],cfg:[`ip nat inside source list 1 pool ${NA_P1}`],why:'Chaque hôte de l’ACL reçoit, à sa première sortie, une adresse libre du pool (1 pour 1). Si le pool est épuisé, les hôtes suivants sont refusés.'}),
    enter(I3,T3,'0/1/0','inside','cfg','S0/1/0 est l’interface qui mène au réseau interne (R1 et les PC).'),
    side(I3,T3,'inside',WHY_IN),
    enter(I3,T3,'0/1/1','outside','if','S0/1/1 est l’interface qui mène à Internet et au serveur 209.165.200.254.'),
    side(I3,T3,'outside',WHY_OUT)
  ];

  /* ---------- 4. PAT avec un pool d’adresses ---------- */
  const I4='nat-pat.png',T4='PAT avec pool';
  const s4=[
    c(Q(T4,`crée le <mark>pool d’adresses publiques</mark> <mark>${NA_P2}</mark> : de <mark>${NA_PF}</mark> à <mark>${NA_PL}</mark>, masque <mark>${NA_PM}</mark>`),
      [`ip nat pool ${NA_P2} ${NA_PF} ${NA_PL} netmask ${NA_PM}`],
      {img:I4,h:R,at:'cfg',v:[NA_P2],cfg:['! ===== R2 : PAT avec pool =====',`ip nat pool ${NA_P2} ${NA_PF} ${NA_PL} netmask ${NA_PM}`],why:'Même principe que le NAT dynamique : une plage d’adresses publiques, ici nommée NAT-POOL2.'}),
    acl(I4,T4),
    c(Q(T4,`associe l’<mark>ACL 1</mark> au pool <mark>${NA_P2}</mark> avec <mark>overload</mark> : le PAT`),
      [`ip nat inside source list 1 pool ${NA_P2} overload`],
      {img:I4,h:R,at:'cfg',v:[NA_P2],cfg:[`ip nat inside source list 1 pool ${NA_P2} overload`],why:'overload = PAT : plusieurs hôtes partagent une même adresse publique, distingués par leur numéro de port source. Une nouvelle adresse du pool n’est utilisée que quand les ports sont épuisés.'}),
    enter(I4,T4,'0/1/0','inside','cfg','S0/1/0 est l’interface qui mène au réseau interne.'),
    side(I4,T4,'inside',WHY_IN),
    enter(I4,T4,'0/1/1','outside','if','S0/1/1 est l’interface qui mène à Internet (adresse .225 du réseau 209.165.200.224/27).'),
    side(I4,T4,'outside',WHY_OUT)
  ];

  /* ---------- 5. PAT avec une seule adresse ---------- */
  const T5='PAT avec une adresse';
  const s5=[
    c(Q(T5,'configure le <mark>PAT</mark> avec l’adresse de l’<mark>interface S0/1/1</mark> : utilise l’<mark>ACL 1</mark> et le mot clé <mark>overload</mark>'),
      naSerIf('0/1/1'),
      {img:I4,h:R,at:'cfg',cfg:['! ===== R2 : PAT avec une seule adresse =====','ip nat inside source list 1 interface Serial0/1/1 overload'],why:'Tous les hôtes internes partagent l’unique adresse publique de S0/1/1 (209.165.200.225), distingués par le numéro de port : c’est le cas de la table NAT du schéma.'}),
    acl(I4,T5),
    enter(I4,T5,'0/1/0','inside','cfg','S0/1/0 est l’interface qui mène au réseau interne.'),
    side(I4,T5,'inside',WHY_IN),
    exit(I4,T5),
    enter(I4,T5,'0/1/1','outside','cfg','S0/1/1 est l’interface qui mène à Internet ; son adresse sert de seule adresse publique.'),
    side(I4,T5,'outside',WHY_OUT)
  ];

  /* ---------- 6. Vérification (à la fin) ---------- */
  const I6='nat-table.png',T6='Vérification';
  const s6=[
    c(Q(T6,'affiche les <mark>traductions NAT</mark> actives'),
      naPre('translations',5).flatMap(t=>shw(`ip nat ${t}`)),
      {img:I6,h:R,at:'priv',why:'show ip nat translations affiche pour chaque traduction : Inside Global, Inside Local, Outside Local et Outside Global (avec les ports en PAT, comme dans la table du schéma).'}),
    c(Q(T6,'affiche les <mark>statistiques NAT</mark> (traductions, interfaces inside et outside)'),
      naPre('statistics',4).flatMap(t=>shw(`ip nat ${t}`)),
      {img:I6,h:R,at:'priv',why:'show ip nat statistics indique le nombre de traductions, les interfaces inside et outside, et le nombre de succès (hits) et d’échecs (misses).'})
  ];

  return[...s1,...s2,...s3,...s4,...s5,...s6];
}

registerModule({
  id:'nat',build:buildNat,mode:'cfg',host:NA_R,img:'nat.png',
  chips:['ip nat ','inside ','outside ','pool ','overload','show ']
});
