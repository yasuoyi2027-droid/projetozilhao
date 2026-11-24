// Random name/username/password generator — locale-aware (pl / es-MX).
// Usado para preencher listas fake de followers e animação de "a quebrar palavra-passe".
function __gsLocale(){try{return(typeof localStorage!=="undefined"&&localStorage.getItem("app_locale"))||"pl"}catch(_){return"pl"}}

const NAMES={
  pl:{
    first:["Anna","Maria","Jan","Piotr","Karol","Julia","Magdalena","Łukasz","Gabriel","Marianna","Rafał","Beata","Tomasz","Kamila","Bartosz","Izabela","Laura","Andrzej","Amanda","Zofia","Antoni","Weronika","Benjamin","Helena","Artur","Alicja","Teodor","Dawid","Natalia","Hubert","Melisa","Gustaw","Jagoda","Lorenzo","Eliza","Wiktor","Karolina","Mateusz","Filip","Luiza","Nikolas","Wiktoria","Daniel","Joanna","Henryk","Emilia","Michał","Barbara"],
    last:["Kowalski","Nowak","Wiśniewski","Wójcik","Kowalczyk","Kamiński","Lewandowski","Zieliński","Szymański","Woźniak","Dąbrowski","Kozłowski","Jankowski","Mazur","Kwiatkowski","Krawczyk","Piotrowski","Grabowski","Nowakowski","Pawłowski","Michalski","Król","Wieczorek","Jabłoński","Wróbel","Nowicki","Majewski","Olszewski","Stępień","Malinowski","Jaworski","Adamczyk","Dudek","Zalewski","Górski","Witkowski","Walczak","Sikora","Baran","Rutkowski"],
    pass:["password","haslo123","mojezycie","instagram","mojamiloscc","rodzina","kochamcie","polska","mojehaslo","tajemnica","mojprofil","sekretne","ulubiony","mojacorka","mojsyn"]
  },
  "es-MX":{
    first:["María","José","Juan","Luis","Carlos","Ana","Sofía","Valentina","Fernanda","Daniela","Isabella","Camila","Miguel","Diego","Alejandro","Andrés","Rodrigo","Santiago","Mateo","Sebastián","Gabriel","Emiliano","Nicolás","Lucas","Pablo","Javier","Jorge","Fernando","Ricardo","Eduardo","Antonio","Alberto","Francisco","Guadalupe","Lucía","Paola","Regina","Ximena","Natalia","Victoria","Renata","Mariana","Alejandra","Jimena","Emma","Elena","Patricia","Verónica","Adriana","Gabriela"],
    last:["García","Rodríguez","Martínez","Hernández","López","González","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Gómez","Díaz","Reyes","Morales","Jiménez","Álvarez","Romero","Ortiz","Ruiz","Vargas","Castillo","Mendoza","Guerrero","Chávez","Ramos","Herrera","Medina","Castro","Ortega","Delgado","Aguilar","Vázquez","Vega","Mendez","Cortés","Núñez","Silva","Rojas"],
    pass:["password","contraseña123","miamor","mexico","tequieromucho","familia","mividamx","amordemivida","mihijaa","mihijoo","secreto","instagram","mivida","mireina","mimexico"]
  }
};

function pickTable(){
  const loc=__gsLocale();
  return NAMES[loc]||NAMES.pl;
}

const SEPS=[".","_",""];

function g(){
  const T=pickTable();
  const a=T.first[Math.floor(Math.random()*T.first.length)];
  const o=T.last[Math.floor(Math.random()*T.last.length)];
  return`${a} ${o}`;
}
function S(){
  const T=pickTable();
  const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const a=norm(T.first[Math.floor(Math.random()*T.first.length)]);
  const o=norm(T.last[Math.floor(Math.random()*T.last.length)]);
  const e=SEPS[Math.floor(Math.random()*SEPS.length)];
  const r=Math.random()>.7?Math.floor(Math.random()*99):"";
  return`${a}${e}${o}${r}`;
}
function p(a){return`/images/avatars/fallback/av-fallback-${a!==void 0?a%14+1:Math.floor(Math.random()*14)+1}.jpg`}
function L(a=10){
  const o=[],e=new Set;
  let r=0;const n=a*10;
  for(;o.length<a&&r<n;){
    r++;
    const t=S();
    if(!e.has(t)){
      e.add(t);
      const s=p(o.length);
      o.push({username:t,full_name:g(),profile_pic_url:s,profile_pic_url_hd:s,pk:String(Math.floor(Math.random()*1e9)),id:String(Math.floor(Math.random()*1e9)),follower_count:Math.floor(Math.random()*5e3),following_count:Math.floor(Math.random()*1e3),media_count:Math.floor(Math.random()*500)});
    }
  }
  return o;
}
function A(){
  const T=pickTable();
  const a=T.pass;
  const o=a[Math.floor(Math.random()*a.length)];
  const e=9,r=15,n=o.length;
  const t=Math.max(0,e-n),s=r-n;
  const u=Math.floor(Math.random()*(s-t+1))+t;
  let i="";
  for(let m=0;m<u;m++){
    const f=Math.random();
    f<.5?i+=Math.floor(Math.random()*10):f<.8?i+=String.fromCharCode(97+Math.floor(Math.random()*26)):i+="!@#$%&*"[Math.floor(Math.random()*7)];
  }
  return o+i;
}
function R(a=20){return Array.from({length:a},()=>A())}
export{L as a,R as g};
