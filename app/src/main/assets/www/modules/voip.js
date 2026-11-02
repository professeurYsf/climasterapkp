'use strict';
/* Dépend de catalog.js : registerModule et ifOk().  Image : voip.png  (id catalogue : voip)  Nécessite app.js avec « chips » par étape.
   Topologie : Router (Fa0/0) — Switch (Fa0/1 trunk · Fa0/2 et Fa0/3 : IP Phone0 / IP Phone1, chacun avec un PC derrière)
   VLAN 10 VOICE : 172.16.0.0/16 (Fa0/0.10 : 172.16.0.1) · VLAN 20 DATA : 192.168.0.0/24 (Fa0/0.20 : 192.168.0.1)
   4 parties (les indices changent à chaque partie) : 1. VLAN + trunk sur le commutateur · 2. sous-interfaces dot1Q sur le routeur
                                                       3. DHCP du réseau voix · 4. Routeur 2811 en tant que CME (Call Manager Express)
   Si le cours change, modifier seulement ces constantes : */
const VP_SW  ='Switch';              /* nom du commutateur */
const VP_R   ='Router';              /* nom du routeur */
const VP_V   ='VOICE';               /* nom du VLAN 10 et du pool DHCP (sensible à la casse) */
const VP_D   ='DATA';                /* nom du VLAN 20 (sensible à la casse) */
const VP_IPV ='172.16.0.1';          /* Fa0/0.10 : passerelle voix */
const VP_MV  ='255.255.0.0';
const VP_IPD ='192.168.0.1';         /* Fa0/0.20 : passerelle données */
const VP_MD  ='255.255.255.0';
const VP_NET ='172.16.0.0';          /* réseau voix */
const VP_DOM ='ofppt.ma';            /* domaine */
const VP_DNS ='172.16.0.5';          /* serveur DNS */
const VP_X1  ='172.16.0.1', VP_X2='172.16.0.5';   /* adresses exclues : les 5 premières */
const VP_PORT='2000';                /* port SCCP des téléphones */

/* indices (chips) de chaque partie : [libellé, valeur écrite] ; une adresse IP s’écrit avec son masque en partie 2 */
const VP_CH1=['vlan 10','vlan 20','switchport ','access '];
const VP_CH2=['encapsulation ',[VP_IPV,`${VP_IPV} ${VP_MV}`],[VP_IPD,`${VP_IPD} ${VP_MD}`],['int F0/0','interface F0/0']];
const VP_CH3=['ip dhcp ',VP_IPV,VP_DOM,'dns-server '];
const VP_CH4=[VP_IPV,VP_PORT,'101','102','max-'];

/* préfixes acceptés : excluded-add… · address / add… · no shutdown / no sh */
const vpPre=(full,min)=>{const o=[];for(let i=full.length;i>=min;i--)o.push(full.slice(0,i));return o};
/* sous-interface « int F0/0.n » : forme courte en premier (c’est elle que l’indice affiche) */
function vpSub(n){const o=new Set([`int Fa0/0.${n}`]);for(const k of['int','interface'])for(const t of['Fa0/0','F0/0','FastEthernet0/0','Fa 0/0','F 0/0','FastEthernet 0/0'])o.add(`${k} ${t}.${n}`);return[...o]}

function buildVoip(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const S=VP_SW,R=VP_R;
  const QS=(tag,txt)=>`<mark>${tag}</mark> · Sur <mark>${S}</mark> : ${txt}`;
  const QR=(tag,txt)=>`<mark>${tag}</mark> · Sur <mark>${R}</mark> : ${txt}`;
  const ipOk=(a,m)=>vpPre('address',3).map(x=>`ip ${x} ${a} ${m}`);

  /* ---------- Partie 1 : VLAN et agrégation (commutateur) ---------- */
  const T1='VLAN',k1={chips:VP_CH1,h:S};
  const p1=[
    c(QS(T1,'crée le <mark>VLAN 10</mark>'),['vlan 10'],
      {...k1,at:'cfg',go:'vlan',cfg:['! ===== Switch =====','vlan 10'],why:'vlan 10 crée le VLAN et ouvre son mode de configuration (config-vlan).'}),
    c(QS(T1,`donne au VLAN 10 le nom <mark>${VP_V}</mark>`),[`name ${VP_V}`],
      {...k1,at:'vlan',v:[VP_V],cfg:[` name ${VP_V}`],why:'Le nom est facultatif mais il rend le réseau lisible : le VLAN 10 transporte la voix.'}),
    c(QS(T1,'crée le <mark>VLAN 20</mark>'),['vlan 20'],
      {...k1,at:'vlan',go:'vlan',cfg:['vlan 20'],why:'On peut créer un autre VLAN directement depuis le mode config-vlan.'}),
    c(QS(T1,`donne au VLAN 20 le nom <mark>${VP_D}</mark>`),[`name ${VP_D}`],
      {...k1,at:'vlan',v:[VP_D],cfg:[` name ${VP_D}`],why:'Le VLAN 20 transporte les données (les PC).'}),
    c(QS(T1,'sélectionne les interfaces <mark>Fa0/2 et Fa0/3</mark> avec <mark>interface range</mark>'),ifOk(2,3),
      {...k1,at:'cfg',go:'ifr',cfg:['interface range FastEthernet0/2 - 3'],why:'Fa0/2 et Fa0/3 relient les deux téléphones IP : on les configure ensemble.'}),
    c(QS(T1,'configure ces ports en <mark>mode accès</mark>'),['switchport mode access'],
      {...k1,at:'ifr',cfg:[' switchport mode access'],why:'Ce sont des ports d’accès : un téléphone (avec un PC branché derrière) se connecte à chacun.'}),
    c(QS(T1,'affecte le <mark>VLAN 10</mark> à la <mark>voix</mark> (<mark>voice vlan</mark>)'),['switchport voice vlan 10'],
      {...k1,at:'ifr',cfg:[' switchport voice vlan 10'],why:'Le téléphone envoie ses trames de voix étiquetées dans le VLAN 10 (VOICE).'}),
    c(QS(T1,'affecte le <mark>VLAN 20</mark> aux <mark>données</mark> (<mark>access vlan</mark>)'),['switchport access vlan 20'],
      {...k1,at:'ifr',cfg:[' switchport access vlan 20'],why:'Le PC branché derrière le téléphone envoie ses trames non étiquetées dans le VLAN 20 (DATA).'}),
    c(QS(T1,'entre dans la configuration de l’interface <mark>Fa0/1</mark> (vers le routeur)'),ifOk(1),
      {...k1,at:'cfg',go:'if',cfg:['interface FastEthernet0/1'],why:'Fa0/1 est le lien vers le routeur : il doit transporter plusieurs VLAN.'}),
    c(QS(T1,'configure Fa0/1 en <mark>mode agrégation</mark> (trunk)'),['switchport mode trunk'],
      {...k1,at:'if',cfg:[' switchport mode trunk'],why:'Un port trunk transporte plusieurs VLAN, étiquetés 802.1Q, sur un seul lien.'}),
    c(QS(T1,'autorise sur le trunk uniquement les <mark>VLAN 10 et 20</mark>'),['switchport trunk allowed vlan 10,20'],
      {...k1,at:'if',cfg:[' switchport trunk allowed vlan 10,20'],why:'allowed vlan limite les VLAN transportés : les autres VLAN ne traversent pas le lien.'})
  ];

  /* ---------- Partie 2 : sous-interfaces dot1Q (routeur) ---------- */
  const T2='Sous-interfaces',k2={chips:VP_CH2,h:R};
  const sub=(n,ip,mask,vl)=>[
    c(QR(T2,`crée la sous-interface <mark>Fa0/0.${n}</mark> (VLAN ${n} · ${vl})`),vpSub(n),
      {...k2,at:'cfg',go:'subif',cfg:[`interface FastEthernet0/0.${n}`],why:`Une sous-interface est une interface logique : une par VLAN (routage inter-VLAN « router-on-a-stick »).`}),
    c(QR(T2,`active l’encapsulation <mark>dot1Q</mark> du VLAN <mark>${n}</mark> (${vl})`),[`encapsulation dot1Q ${n}`],
      {...k2,at:'subif',cfg:[` encapsulation dot1Q ${n}`],why:`dot1Q ${n} associe la sous-interface au VLAN ${n} : elle ne traite que les trames étiquetées ${n}.`}),
    c(QR(T2,`attribue l’adresse <mark>${ip}</mark> et le masque <mark>${mask}</mark> à cette sous-interface`),ipOk(ip,mask),
      {...k2,at:'subif',cfg:[` ip address ${ip} ${mask}`],why:`${ip} devient la passerelle par défaut des appareils du VLAN ${n}.`})
  ];
  const p2=[
    c(QR(T2,'entre dans la configuration de l’interface <mark>Fa0/0</mark>'),ifOk(0),
      {...k2,at:'cfg',go:'if',cfg:['! ===== Router =====','interface FastEthernet0/0'],why:'Fa0/0 est l’interface physique reliée au commutateur ; les sous-interfaces en dépendent.'}),
    c(QR(T2,'<mark>active</mark> cette interface'),['no shutdown','no shut','no sh'],
      {...k2,at:'if',cfg:[' no shutdown'],why:'Une interface de routeur est désactivée par défaut : no shutdown la met en service (les sous-interfaces aussi).'}),
    ...sub(10,VP_IPV,VP_MV,'voix'),
    ...sub(20,VP_IPD,VP_MD,'données')
  ];

  /* ---------- Partie 3 : DHCP du réseau voix ---------- */
  const T3='DHCP voix',k3={chips:VP_CH3,h:R};
  const p3=[
    c(QR(T3,`<mark>exclus les 5 premières adresses</mark> : de <mark>${VP_X1}</mark> à <mark>${VP_X2}</mark>`),
      vpPre('excluded-address',12).map(x=>`ip dhcp ${x} ${VP_X1} ${VP_X2}`),
      {...k3,at:'cfg',v:[VP_X1,VP_X2],cfg:['! ===== Router : DHCP voix =====',`ip dhcp excluded-address ${VP_X1} ${VP_X2}`],why:'Ces adresses (dont la passerelle .1 et le DNS .5) ne seront jamais distribuées. On donne la première et la dernière de la plage.'}),
    c(QR(T3,`crée le pool DHCP nommé <mark>${VP_V}</mark>`),[`ip dhcp pool ${VP_V}`],
      {...k3,at:'cfg',go:'dhcp',v:[VP_V],cfg:[`ip dhcp pool ${VP_V}`],why:'ip dhcp pool crée le pool et ouvre son mode de configuration (dhcp-config).'}),
    c(QR(T3,`définis le réseau <mark>${VP_NET}</mark> avec le masque <mark>${VP_MV}</mark> (/16)`),
      vpPre('network',3).map(x=>`${x} ${VP_NET} ${VP_MV}`),
      {...k3,at:'dhcp',cfg:[` network ${VP_NET} ${VP_MV}`],why:'Le pool distribue les adresses du réseau voix 172.16.0.0/16.'}),
    c(QR(T3,`définis la <mark>passerelle</mark> <mark>${VP_IPV}</mark>`),[`default-router ${VP_IPV}`],
      {...k3,at:'dhcp',cfg:[` default-router ${VP_IPV}`],why:'C’est l’adresse de la sous-interface Fa0/0.10, passerelle des téléphones.'}),
    c(QR(T3,`définis le <mark>nom de domaine</mark> <mark>${VP_DOM}</mark>`),[`domain-name ${VP_DOM}`],
      {...k3,at:'dhcp',v:[VP_DOM],cfg:[` domain-name ${VP_DOM}`],why:'Le nom de domaine est transmis aux clients avec leur configuration.'}),
    c(QR(T3,`définis le <mark>serveur DNS</mark> <mark>${VP_DNS}</mark>`),[`dns-server ${VP_DNS}`],
      {...k3,at:'dhcp',cfg:[` dns-server ${VP_DNS}`],why:'Les clients utiliseront ce serveur pour résoudre les noms.'}),
    c(QR(T3,`définis l’<mark>option 150</mark> avec l’adresse <mark>${VP_IPV}</mark>`),[`option 150 ip ${VP_IPV}`],
      {...k3,at:'dhcp',cfg:[` option 150 ip ${VP_IPV}`],why:'L’option 150 indique aux téléphones Cisco l’adresse du serveur TFTP/CME qui leur fournit leur configuration.'})
  ];

  /* ---------- Partie 4 : le routeur 2811 en tant que CME ---------- */
  const T4='CME',k4={chips:VP_CH4,h:R};
  const p4=[
    c(QR(T4,'<mark>active le service téléphonique</mark> (CME)'),['telephony-service'],
      {...k4,at:'cfg',go:'tel',cfg:['! ===== Router : CME =====','telephony-service'],why:'telephony-service active Cisco Unified Communications Manager Express et ouvre son mode de configuration.'}),
    c(QR(T4,'définis le nombre maximal d’<mark>ephones</mark> à <mark>3</mark>'),['max-ephones 3'],
      {...k4,at:'tel',cfg:[' max-ephones 3'],why:'Un ephone est un téléphone physique ; 3 téléphones au maximum pourront s’enregistrer.'}),
    c(QR(T4,'définis le nombre maximal de <mark>phone-dn</mark> (lignes) à <mark>3</mark>'),['max-dn 3'],
      {...k4,at:'tel',cfg:[' max-dn 3'],why:'Un ephone-dn est une ligne téléphonique (un numéro) ; 3 lignes au maximum.'}),
    c(QR(T4,`identifie l’adresse <mark>${VP_IPV}</mark> et le port <mark>${VP_PORT}</mark> par lesquels les téléphones communiquent avec Manager Express`),
      [`ip source-address ${VP_IPV} port ${VP_PORT}`],
      {...k4,at:'tel',cfg:[` ip source-address ${VP_IPV} port ${VP_PORT}`],why:'Les téléphones s’enregistrent auprès de cette adresse, sur le port TCP 2000 (protocole SCCP).'}),
    c(QR(T4,'crée le premier <mark>ephone-dn 1</mark>'),['ephone-dn 1'],
      {...k4,at:'cfg',go:'edn',cfg:['ephone-dn 1'],why:'ephone-dn crée une ligne téléphonique numérotée et ouvre son mode de configuration.'}),
    c(QR(T4,'attribue à cette ligne le numéro <mark>101</mark>'),['number 101'],
      {...k4,at:'edn',cfg:[' number 101'],why:'101 est le numéro de téléphone du premier poste.'}),
    c(QR(T4,'crée le deuxième <mark>ephone-dn 2</mark>'),['ephone-dn 2'],
      {...k4,at:'edn',go:'edn',cfg:['ephone-dn 2'],why:'Deuxième ligne téléphonique.'}),
    c(QR(T4,'attribue à cette ligne le numéro <mark>102</mark>'),['number 102'],
      {...k4,at:'edn',cfg:[' number 102'],why:'102 est le numéro de téléphone du deuxième poste.'})
  ];

  return[...p1,...p2,...p3,...p4];
}

registerModule({
  id:'voip',build:buildVoip,mode:'cfg',host:VP_SW,img:'voip.png',
  modes:{
    dhcp:['(dhcp-config)#','Configuration du pool DHCP'],
    tel:['(config-telephony)#','Configuration du service de téléphonie'],
    edn:['(config-ephone-dn)#','Configuration d’un ephone-dn']
  },
  chips:VP_CH1
});
