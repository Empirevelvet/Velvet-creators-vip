
(function(){
  try{
    var key='velvet_cookie_consent_v1';
    if(localStorage.getItem(key)) return;
    document.body.classList.add('has-cookie-banner');
    var b=document.createElement('div');
    b.id='cookie-banner';
    b.innerHTML='<p>Nous utilisons des cookies techniques (obligatoires) pour assurer le bon fonctionnement du site et des statistiques anonymes. <a href="cgu.html#cookies">En savoir plus</a>.</p><button id="cookie-accept">OK</button>';
    document.body.appendChild(b);
    document.getElementById('cookie-accept').onclick=function(){
      localStorage.setItem(key,'1');
      document.body.classList.remove('has-cookie-banner');
      b.remove();
    };
  }catch(e){console&&console.warn&&console.warn(e);}
})();
