'use strict';
/* Dépend de catalog.js : pick, rnd, pad, M3, registerModule */
/* ---------- Module « Configuration de base » : valeurs aléatoires ---------- */
/* Toutes les abréviations valides de « configure terminal » : conf t, config t, conf ter, configure term... */
function cfgTermVariants(){
  const a='configure',b='terminal',out=[];
  for(let i=4;i<=a.length;i++)for(let j=1;j<=b.length;j++)out.push(a.slice(0,i)+' '+b.slice(0,j));
  return out;
}
function buildBase(){
  const ep=pick(['1234','cisco123','Admin2027','netpass9']),es=pick(['class','Secret77','cisco456','R0uter2027']),
        cp=pick(['console1','Cons0le','lab2027','ligne5']),msg='bienvenue sur R1',
        CT=cfgTermVariants(),
        m=rnd(12),d=1+rnd(28),t=pad(rnd(24))+':'+pad(rnd(60))+':'+pad(rnd(60));
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  return[
    c('Passe en <mark>mode privilégié</mark>',['enable'],{go:'priv',why:'enable ouvre le mode privilégié (#) : on peut voir et sauvegarder la configuration.'}),
    c('Entre en <mark>configuration globale</mark>',CT,{go:'cfg',why:'configure terminal ouvre le mode (config)# pour modifier le routeur.'}),
    c('Renomme le routeur en <mark>R1</mark>',['hostname R1'],{host:'R1',v:['R1'],cfg:['hostname R1'],why:'Le hostname identifie l’équipement dans le prompt, les logs et SSH.'}),
    c(`Définis le mot de passe non chiffré <mark>${ep}</mark> pour le mode privilégié`,[`enable password ${ep}`],{v:[ep],cfg:[`enable password ${ep}`],why:'Protège le mode privilégié, mais reste lisible en clair dans la config.'}),
    c(`Définis le mot de passe secret <mark>${es}</mark> pour le mode privilégié`,[`enable secret ${es}`],{v:[es],cfg:[`enable secret ${es}`],why:'Haché (MD5), et prioritaire sur enable password. À préférer.'}),
    c('Désactive la résolution DNS',['no ip domain-lookup','no ip domain lookup'],{cfg:['no ip domain-lookup'],why:'Sans cela, une faute de frappe fait attendre le DNS pendant de longues secondes.'}),
    c(`Configure la bannière MOTD : <mark>${msg}</mark> (délimiteur #)`,[`banner motd #${msg}#`],{v:[msg],cfg:[`banner motd ^C${msg}^C`],why:'Message d’avertissement légal affiché avant la connexion.'}),
    c('Entre dans la configuration de la <mark>console</mark> (ligne 0)',['line console 0'],{go:'line',cfg:['line con 0'],why:'Les paramètres de la console se règlent dans ce sous-mode.'}),
    c(`Définis le mot de passe de la console : <mark>${cp}</mark>`,[`password ${cp}`],{v:[cp],cfg:[` password ${cp}`],why:'Protège l’accès physique par câble console.'}),
    c('Empêche les messages système d’interrompre ta saisie',['logging synchronous'],{cfg:[' logging synchronous'],why:'Les messages syslog ne coupent plus la commande en cours de frappe.'}),
    c('Exige le mot de passe à la connexion console',['login'],{cfg:[' login'],why:'login active la demande de mot de passe sur la ligne.'}),
    c('Quitte la ligne et reviens en <mark>configuration globale</mark>',['exit'],{go:'cfg',why:'exit remonte d’un niveau.'}),
    c('Chiffre tous les mots de passe en clair',['service password-encryption'],{cfg:['service password-encryption'],why:'Chiffrement de type 7 : réversible, mais cache les mots de passe aux regards.'}),
    c('Reviens directement au <mark>mode privilégié</mark>',['end','exit'],{go:'priv',why:'end ramène au mode privilégié (#) depuis n’importe quel sous-mode.'}),
    c(`Règle l’horloge : <mark>${t}</mark> · mois <mark>${M3[m]}</mark> · jour <mark>${d}</mark> · année <mark>2027</mark>`,[`clock set ${t} ${M3[m]} ${d} 2027`,`clock set ${t} ${d} ${M3[m]} 2027`],{why:'L’heure correcte est essentielle pour les logs. Cette commande se tape en mode privilégié.'}),
    c('Sauvegarde la configuration dans la NVRAM',['write memory','copy running-config startup-config'],{why:'La running-config est en RAM : sans sauvegarde, tout est perdu au redémarrage.'})
  ];
}

registerModule({id:'base',build:buildBase,mode:'user',host:'Router',chips:['#','enable','service','password','bienvenue']});
