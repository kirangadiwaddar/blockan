(function(){try{
  var t=localStorage.getItem('theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.classList.add('dark');}
  var palette={
    zinc:  {p:'oklch(0.205 0 0)',      f:'oklch(0.985 0 0)',r:'oklch(0.205 0 0)'},
    blue:  {p:'oklch(0.546 0.245 262.881)',f:'oklch(0.985 0 0)',r:'oklch(0.546 0.245 262.881)'},
    violet:{p:'oklch(0.558 0.288 302.3)',  f:'oklch(0.985 0 0)',r:'oklch(0.558 0.288 302.3)'},
    rose:  {p:'oklch(0.596 0.232 16.053)', f:'oklch(0.985 0 0)',r:'oklch(0.596 0.232 16.053)'},
    orange:{p:'oklch(0.646 0.222 41.116)', f:'oklch(0.985 0 0)',r:'oklch(0.646 0.222 41.116)'},
    green: {p:'oklch(0.527 0.154 162.487)',f:'oklch(0.985 0 0)',r:'oklch(0.527 0.154 162.487)'},
    indigo:{p:'oklch(0.511 0.262 276.966)',f:'oklch(0.985 0 0)',r:'oklch(0.511 0.262 276.966)'},
    teal:  {p:'oklch(0.533 0.126 185.842)',f:'oklch(0.985 0 0)',r:'oklch(0.533 0.126 185.842)'}
  };
  var a=localStorage.getItem('accentColor');
  var c=palette[a]||palette.zinc;
  var d=document.documentElement;
  d.style.setProperty('--primary',c.p);
  d.style.setProperty('--primary-foreground',c.f);
  d.style.setProperty('--ring',c.r);
}catch(e){}})();
