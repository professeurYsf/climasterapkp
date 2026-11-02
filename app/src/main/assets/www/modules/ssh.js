'use strict';
/* Dépend de catalog.js : pick, rnd, pad, M3, registerModule */
/* ---------- Module « SSH » : R1 puis PC Admin ---------- */
function buildSsh(){
  const pw=pick(['random1','Ssh2027','remote7','cisco789','secret42','Sshkey99','R0uter77','class2027']),
        sec=Math.random()<.5,dom=pick(['ofppt.local','ista.local']);
  const c=(q,ok,o)=>Object.assign({q,ok},o);
  const user=sec
    ?c(`Crée l’utilisateur <mark>admin</mark> avec le mot de passe secret <mark>${pw}</mark>`,[`username admin secret ${pw}`],{v:[pw],cfg:[`username admin secret ${pw}`],why:'Avec secret, le mot de passe est haché : à préférer à password.'})
    :c(`Crée l’utilisateur <mark>admin</mark> avec le mot de passe <mark>${pw}</mark>`,[`username admin password ${pw}`],{v:[pw],cfg:[`username admin password ${pw}`],why:'Crée un compte local ; le mot de passe reste lisible en clair dans la configuration.'});
  return[
    user,
    c(`Configure le domaine <mark>${dom}</mark>`,[`ip domain-name ${dom}`,`ip domain name ${dom}`],{v:[dom],cfg:[`ip domain-name ${dom}`],why:'SSH a besoin d’un nom d’hôte et d’un domaine pour générer la clé RSA.'}),
    c('Accède aux lignes <mark>VTY de 0 à 4</mark>',['line vty 0 4'],{go:'line',cfg:['line vty 0 4'],why:'Les lignes VTY reçoivent les connexions à distance (Telnet et SSH).'}),
    c('Active l’<mark>authentification locale</mark> sur les lignes VTY',['login local'],{cfg:[' login local'],why:'login local utilise les comptes créés avec la commande username.'}),
    c('Autorise <mark>uniquement SSH</mark> sur les lignes VTY',['transport input ssh'],{cfg:[' transport input ssh'],why:'Telnet est refusé : seules les connexions SSH (chiffrées) sont acceptées.'}),
    c('Génère une clé RSA de <mark>1024 bits</mark>',['crypto key generate rsa modulus 1024','crypto key generate rsa general-keys modulus 1024'],{go:'cfg',
      then:{pre:['crypto key generate rsa','crypto key generate rsa general-keys'],pr:'Modulus [512]:',ok:['1024'],
        info:'The name for the keys will be: R1.'+dom+'\nChoose the size of the key modulus in the range of 512 to 4096.\nHow many bits in the modulus [512]:',
        err:'Entre la taille demandée : 1024 bits.'},
      why:'La clé RSA sert à chiffrer la session SSH. Elle n’apparaît pas dans la running-config. Tu reviens en configuration globale.'}),
    c('Active <mark>SSH version 2</mark>',['ip ssh version 2'],{cfg:['ip ssh version 2'],why:'La version 2 est plus sûre que la version 1.'}),
    c('Depuis le PC <mark>Admin</mark> : connecte-toi en SSH à <mark>192.168.1.1</mark> avec l’utilisateur <mark>admin</mark>',['ssh -l admin 192.168.1.1'],{dev:'pc',why:'R1 demande maintenant le mot de passe de l’utilisateur admin.'})
  ];
}

registerModule({id:'ssh',build:buildSsh,mode:'cfg',host:'R1',img:'ssh.png',pcp:'C:\\>',chips:['192.168.1.1',['ssh -l','ssh -l '],'1024']});
