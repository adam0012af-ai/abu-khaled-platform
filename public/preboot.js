(function(){
  try{
    var lang=localStorage.getItem('acm_language')==='en'?'en':'ar';
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='en'?'ltr':'rtl';
  }catch(_){}
})();
