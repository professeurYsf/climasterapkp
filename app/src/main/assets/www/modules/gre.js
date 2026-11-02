'use strict';
/* Dépend de catalog.js : registerModule.  Image : gre.png  (id catalogue : gre)
   Topologie (d’après le schéma) :
     PC3 — R3 (G0/0 172.17.0.1/16) — S0/0/0 20.0.0.2 ══ 20.0.0.0/30 ══ R1 (Se0/0/1 .1 · Se0/0/0 .1) ══ 10.0.0.0/30 ══ S0/0/0 10.0.0.2 — R2 (G0/0 172.16.0.1/16) — PC2
   Tunnel GRE entre R3 et R2 : réseau 192.168.1.0/24 (R3 .1 · R2 .2) ; R1 est le routeur intermédiaire (« Internet »)
   Si le cours change, modifier seulement ces constantes : */
const GR_A    ='R3';                 /* extrémité gauche du tunnel */
const GR_B    ='R2';                 /* extrémité droite du tunnel */
const GR_A_TUN='192.168.1.1';        /* adresse du tunnel de R3 */
const GR_B_TUN='192.168.1.2';        /* adresse du tunnel de R2 */
const GR_MASK ='255.255.255.0';      /* masque du réseau du tunnel */
const GR_A_WAN='20.0.0.2';           /* S0/0/0 de R3 (source du tunnel de R3) */
const GR_B_WAN='10.0.0.2';           /* S0/0/0 de R2 (source du tunnel de R2) */
const GR_A_LAN='172.17.0.0';         /* LAN de R3 */
const GR_B_LAN='172.16.0.0';         /* LAN de R2 */
const GR_LMASK='255.255.0.0';        /* masque des LAN (/16) */

/* écritures acceptées (forme complète en premier : c’est elle que l’indice affiche) */
const grTun=()=>['interface tunnel 0','interface tunnel0','int tunnel 0','int tunnel0'];
function grSrc(ip){const o=[];for(const x of['Serial','Ser','Se','S'])for(const sp of['',' '])o.push(`tunnel source ${x}${sp}0/0/0`);o.push(`tunnel source ${ip}`);return o}

function buildGre(){
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const shw=rest=>['show','sh'].map(x=>`${x} ${rest}`);

  const block=(R,tun,wan,dest,lan,via)=>[
    c(`Sur <mark>${R}</mark> : entre dans la configuration de l’<mark>interface du tunnel 0</mark> (protocole <mark>GRE</mark>)`,
      grTun(),
      {h:R,at:'cfg',go:'if',cfg:[`! ===== ${R} =====`,'interface Tunnel0'],why:'Un tunnel GRE est une interface virtuelle : tunnel 0 est créée et ouvre son mode de configuration.'}),
    c(`Sur <mark>${R}</mark> : attribue l’adresse <mark>${tun}</mark> et le masque <mark>${GR_MASK}</mark> à l’interface du tunnel`,
      ['address','addres','addre','addr','add'].map(x=>`ip ${x} ${tun} ${GR_MASK}`),   /* ip address (forme complète en premier) ou ip add */
      {h:R,at:'if',cfg:[` ip address ${tun} ${GR_MASK}`],why:'Les deux extrémités du tunnel sont dans le même réseau 192.168.1.0/24, comme sur une liaison point à point.'}),
    c(`Sur <mark>${R}</mark> : définis la <mark>source du tunnel</mark> : l’interface <mark>S0/0/0</mark> (${wan})`,
      grSrc(wan),
      {h:R,at:'if',cfg:[' tunnel source Serial0/0/0'],why:'La source est l’interface physique par laquelle les paquets encapsulés sortent du routeur.'}),
    c(`Sur <mark>${R}</mark> : définis la <mark>destination du tunnel</mark> : l’adresse <mark>${dest}</mark> de l’autre extrémité`,
      [`tunnel destination ${dest}`],
      {h:R,at:'if',cfg:[` tunnel destination ${dest}`],why:'C’est l’adresse physique (S0/0/0) de l’autre routeur : le tunnel est établi à travers R1, qui ne voit que des paquets IP ordinaires.'}),
    c(`Sur <mark>${R}</mark> : choisis le <mark>mode</mark> du tunnel : <mark>GRE sur IP</mark>`,
      ['tunnel mode gre ip'],
      {h:R,at:'if',cfg:[' tunnel mode gre ip'],why:'gre ip est le mode par défaut : les paquets sont encapsulés dans GRE puis dans IP.'}),
    c(`Sur <mark>${R}</mark> : crée la <mark>route statique</mark> vers le LAN <mark>${lan}</mark> (masque <mark>${GR_LMASK}</mark>) en passant par le tunnel, via <mark>${via}</mark>`,
      [`ip route ${lan} ${GR_LMASK} ${via}`],
      {h:R,at:'cfg',cfg:[`ip route ${lan} ${GR_LMASK} ${via}`],why:'Le trafic vers le LAN distant doit être dirigé vers l’autre extrémité du tunnel (son adresse 192.168.1.x).'})
  ];

  return[
    ...block(GR_A,GR_A_TUN,GR_A_WAN,GR_B_WAN,GR_B_LAN,GR_B_TUN),
    ...block(GR_B,GR_B_TUN,GR_B_WAN,GR_A_WAN,GR_A_LAN,GR_A_TUN),

    c(`Sur <mark>${GR_A}</mark> : vérifie le fonctionnement du tunnel : affiche l’<mark>état de l’interface tunnel 0</mark>`,
      shw('interfaces tunnel 0').concat(shw('interface tunnel 0'),shw('interfaces tunnel0'),shw('interface tunnel0')),
      {h:GR_A,at:'priv',why:'show interfaces tunnel 0 indique la source, la destination, le mode (GRE/IP) et si l’interface est « up, line protocol is up ».'}),
    c(`Sur <mark>${GR_A}</mark> : affiche le <mark>résumé des interfaces</mark> et leurs adresses IP`,
      shw('ip interface brief').concat(shw('ip int brief')),
      {h:GR_A,at:'priv',why:'show ip interface brief liste toutes les interfaces ; Tunnel0 doit être « up / up » avec l’adresse 192.168.1.1.'}),
    c(`Sur <mark>${GR_A}</mark> : teste le tunnel en faisant un <mark>ping</mark> vers l’autre extrémité <mark>${GR_B_TUN}</mark>`,
      [`ping ${GR_B_TUN}`],
      {h:GR_A,at:'priv',why:'Si les cinq réponses « ! » arrivent, le tunnel fonctionne : les paquets ont traversé R1 encapsulés dans GRE.'})
  ];
}

registerModule({
  id:'gre',build:buildGre,mode:'cfg',host:GR_A,img:'gre.png',
  chips:['tunnel ','source ','destination ','show ',GR_A_TUN]
});
