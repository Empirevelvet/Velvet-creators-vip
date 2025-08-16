(function(){
  var KEY='velvet_cookies_accepted_v1';
  var banner=document.getElementById('cookie-banner');
  if(!banner) return;
  if(localStorage.getItem(KEY)!=='true'){
    banner.hidden=false;
    document.body.classList.add('has-cookie-banner');
    requestAnimationFrame(function(){ banner.classList.add('show'); });
  }
  var btn=document.getElementById('cookie-accept');
  if(btn){
    btn.addEventListener('click', function(){
      localStorage.setItem(KEY,'true');
      banner.classList.remove('show');
      setTimeout(function(){
        banner.hidden=true;
        document.body.classList.remove('has-cookie-banner');
      }, 250);
    });
  }
})();