/**
 * Schema Markup Automatico - Horizonte Exclusivo
 * Genera JSON-LD correcto segun el tipo de pagina.
 */
(function(){
var B={name:"Horizonte Exclusivo",url:"https://www.horizonteexclusivo.es",email:"viajes@horizonteexclusivo.es",telephone:"+34633077401",logo:"https://www.horizonteexclusivo.es/images/logo.png",description:"Agencia de viajes de lujo a medida en Molins de Rei, Barcelona. Viajes exclusivos y 100% personalizados a mas de 55 destinos.",lat:41.4118429,lng:2.0181454,street:"Carrer Major, 37",city:"Molins de Rei",region:"Barcelona",zip:"08750",country:"ES",mapCid:"18012363284776329308",founder:"Endeis Prieto",founderTitle:"Fundadora y CEO",rating:"5.0",reviewCount:"2"};
var D={"albania":"Albania","alaska":"Alaska","alemania":"Alemania","argentina":"Argentina","aruba":"Aruba","bahamas":"Bahamas","bali":"Bali","belgica":"Belgica","botsuana":"Botsuana","brasil":"Brasil","camboya":"Camboya","canada":"Canada","chicago-nueva-orleans":"Chicago y Nueva Orleans","china":"China","colombia":"Colombia","costa-oeste-usa":"Costa Oeste USA","costa-rica":"Costa Rica","croacia":"Croacia","cuba":"Cuba","disneyland-paris":"Disneyland Paris","dubai-abu-dhabi-maldivas":"Dubai Abu Dhabi y Maldivas","ecuador":"Ecuador","egipto":"Egipto","escocia":"Escocia","filipinas":"Filipinas","florida":"Florida","francia":"Francia","grecia":"Grecia","hawai":"Hawai","india":"India","islandia":"Islandia","italia":"Italia","jamaica":"Jamaica","japon":"Japon","kenia-zanzibar":"Kenia y Zanzibar","madagascar":"Madagascar","malasia":"Malasia","maldivas":"Maldivas","malta":"Malta","marruecos":"Marruecos","mauricio":"Mauricio","namibia":"Namibia","noruega":"Noruega","peru":"Peru","polinesia-francesa":"Polinesia Francesa","portugal":"Portugal","praga-viena-budapest":"Praga Viena y Budapest","seychelles":"Seychelles","singapur":"Singapur","sri-lanka":"Sri Lanka","sudafrica":"Sudafrica","suiza":"Suiza","tailandia":"Tailandia","tanzania":"Tanzania","turquia":"Turquia","uganda":"Uganda","vietnam":"Vietnam"};
var CT={"albania":"Europa","alemania":"Europa","belgica":"Europa","croacia":"Europa","disneyland-paris":"Europa","escocia":"Europa","francia":"Europa","grecia":"Europa","islandia":"Europa","italia":"Europa","malta":"Europa","noruega":"Europa","portugal":"Europa","praga-viena-budapest":"Europa","suiza":"Europa","turquia":"Europa","bali":"Asia","camboya":"Asia","china":"Asia","dubai-abu-dhabi-maldivas":"Asia","filipinas":"Asia","india":"Asia","japon":"Asia","malasia":"Asia","maldivas":"Asia","singapur":"Asia","sri-lanka":"Asia","tailandia":"Asia","vietnam":"Asia","botsuana":"Africa","egipto":"Africa","kenia-zanzibar":"Africa","madagascar":"Africa","marruecos":"Africa","mauricio":"Africa","namibia":"Africa","seychelles":"Africa","sudafrica":"Africa","tanzania":"Africa","uganda":"Africa","alaska":"America","argentina":"America","aruba":"America","bahamas":"America","brasil":"America","canada":"America","chicago-nueva-orleans":"America","colombia":"America","costa-oeste-usa":"America","costa-rica":"America","cuba":"America","ecuador":"America","florida":"America","hawai":"America","jamaica":"America","peru":"America","polinesia-francesa":"Oceania"};
var p=window.location.pathname.replace(/\/$/,"").replace(/^\//,"");
var pt=document.title;
var pd=(document.querySelector('meta[name="description"]')||{}).content||"";
var cu=(document.querySelector('link[rel="canonical"]')||{}).href||window.location.href;
function inj(d){var s=document.createElement("script");s.type="application/ld+json";s.textContent=JSON.stringify(d);document.head.appendChild(s);}
function org(){return{"@type":"TravelAgency","@id":B.url+"/#organization","name":B.name};}
function bc(items){return{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items.map(function(it,i){return{"@type":"ListItem","position":i+1,"name":it.name,"item":it.url};})};}

// HOMEPAGE
if(p===""||p==="index.html"){
document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){s.remove();});
inj({"@context":"https://schema.org","@type":["TravelAgency","LocalBusiness"],"@id":B.url+"/#organization","name":B.name,"alternateName":"Horizonte Exclusivo - Agencia de Viajes de Lujo","url":B.url,"logo":B.logo,"image":B.url+"/images/og-image.jpg","description":B.description,"email":B.email,"telephone":B.telephone,"priceRange":"$$$","currenciesAccepted":"EUR","paymentAccepted":"Cash, Credit Card, Bank Transfer","foundingDate":"2025","founder":{"@type":"Person","@id":B.url+"/#founder","name":B.founder,"jobTitle":B.founderTitle,"url":B.url+"/quien-hay-detras/"},"address":{"@type":"PostalAddress","streetAddress":B.street,"addressLocality":B.city,"addressRegion":B.region,"postalCode":B.zip,"addressCountry":B.country},"geo":{"@type":"GeoCoordinates","latitude":B.lat,"longitude":B.lng},"hasMap":"https://www.google.com/maps?cid="+B.mapCid,"openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"09:30","closes":"13:30"},{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Wednesday","Thursday","Friday"],"opens":"16:00","closes":"19:00"}],"areaServed":[{"@type":"City","name":"Molins de Rei"},{"@type":"AdministrativeArea","name":"Baix Llobregat"},{"@type":"City","name":"Barcelona"},{"@type":"AdministrativeArea","name":"Cataluna"}],"hasOfferCatalog":{"@type":"OfferCatalog","name":"Servicios de viajes de lujo","itemListElement":[{"@type":"Offer","itemOffered":{"@type":"Service","name":"Viajes de lujo a medida"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Lunas de miel a medida"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Viajes familiares a medida"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Viajes corporativos e incentivos"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Diseno de itinerarios personalizados"}}]},"sameAs":["https://www.google.com/maps?cid="+B.mapCid]});
inj(bc([{name:"Inicio",url:B.url+"/"}]));}

// DESTINOS
else if(D[p]){var dn=D[p],ct=CT[p]||"";
inj({"@context":"https://schema.org","@type":"TouristTrip","name":pt.split("|")[0].trim(),"description":pd,"url":cu,"touristType":["Luxury","Cultural","Adventure"],"itinerary":{"@type":"ItemList","name":"Itinerario de viaje a "+dn,"description":"Itinerario personalizado de lujo en "+dn},"provider":org(),"offers":{"@type":"Offer","availability":"https://schema.org/InStock","priceCurrency":"EUR","url":B.url+"/contacto/"}});
var bcs=[{name:"Inicio",url:B.url+"/"},{name:"Destinos",url:B.url+"/destinos/"}];if(ct){bcs.push({name:ct,url:B.url+"/"+ct.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")+"/"});}bcs.push({name:dn,url:cu});inj(bc(bcs));}

// CONTINENTES
else if(["europa","asia","africa","america","paraisos"].indexOf(p)>=0){
var cn={"europa":"Europa","asia":"Asia","africa":"Africa","america":"America","paraisos":"Paraisos Insulares"};
inj({"@context":"https://schema.org","@type":"CollectionPage","name":"Destinos de Lujo en "+(cn[p]||p),"url":cu,"description":pd,"provider":org()});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Destinos",url:B.url+"/destinos/"},{name:cn[p]||p,url:cu}]));}

// QUIEN HAY DETRAS
else if(p==="quien-hay-detras"){
inj({"@context":"https://schema.org","@type":"AboutPage","name":"Quien hay detras de Horizonte Exclusivo","url":cu,"mainEntity":{"@type":"Person","@id":B.url+"/#founder","name":B.founder,"jobTitle":B.founderTitle,"worksFor":org(),"knowsAbout":["Viajes de lujo","Viajes a medida","Luna de miel","Safaris","Viajes corporativos","Turismo exclusivo"]}});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Quien hay detras",url:cu}]));}

// CONTACTO
else if(p==="contacto"){
inj({"@context":"https://schema.org","@type":"ContactPage","name":"Contacto - Horizonte Exclusivo","url":cu,"mainEntity":{"@type":"TravelAgency","@id":B.url+"/#organization","name":B.name,"telephone":B.telephone,"email":B.email,"address":{"@type":"PostalAddress","streetAddress":B.street,"addressLocality":B.city,"addressRegion":B.region,"postalCode":B.zip,"addressCountry":B.country}}});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Contacto",url:cu}]));}

// BLOG
else if(p==="blog"){
inj({"@context":"https://schema.org","@type":"Blog","name":"Blog de Viajes de Lujo - Horizonte Exclusivo","url":cu,"description":pd,"publisher":org()});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Blog",url:cu}]));}

// BLOG POSTS
else if(p.indexOf("blog/")===0){
inj({"@context":"https://schema.org","@type":"BlogPosting","headline":pt.split("|")[0].trim(),"description":pd,"url":cu,"author":{"@type":"Person","@id":B.url+"/#founder","name":B.founder},"publisher":{"@type":"Organization","@id":B.url+"/#organization","name":B.name,"logo":{"@type":"ImageObject","url":B.logo}},"mainEntityOfPage":{"@type":"WebPage","@id":cu}});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Blog",url:B.url+"/blog/"},{name:pt.split("|")[0].trim(),url:cu}]));}

// DESTINOS INDEX
else if(p==="destinos"){
inj({"@context":"https://schema.org","@type":"CollectionPage","name":"Destinos de Lujo - Horizonte Exclusivo","url":cu,"description":pd,"provider":org()});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Destinos",url:cu}]));}

// LUNA DE MIEL
else if(p==="luna-de-miel-a-medida"){
inj({"@context":"https://schema.org","@type":"Service","name":"Lunas de Miel a Medida","url":cu,"description":pd,"provider":org(),"areaServed":{"@type":"Country","name":"Espana"},"serviceType":"Luna de miel a medida"});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Luna de Miel a Medida",url:cu}]));}

// MONEY PAGES — SERVICIO + CIUDAD
else if(p==="viajes-a-medida-barcelona"){
inj({"@context":"https://schema.org","@type":"Service","name":"Viajes a Medida en Barcelona","url":cu,"description":pd,"provider":org(),"areaServed":[{"@type":"City","name":"Barcelona"},{"@type":"AdministrativeArea","name":"Baix Llobregat"},{"@type":"City","name":"Molins de Rei"}],"serviceType":"Viajes a medida"});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Viajes a Medida Barcelona",url:cu}]));}
else if(p==="agencia-viajes-lujo-barcelona"){
inj({"@context":"https://schema.org","@type":"TravelAgency","name":"Horizonte Exclusivo - Agencia de Viajes de Lujo en Barcelona","url":cu,"description":pd,"telephone":B.telephone,"email":B.email,"address":{"@type":"PostalAddress","streetAddress":B.street,"addressLocality":B.city,"addressRegion":B.region,"postalCode":B.zip,"addressCountry":B.country},"geo":{"@type":"GeoCoordinates","latitude":B.lat,"longitude":B.lng},"areaServed":[{"@type":"City","name":"Barcelona"},{"@type":"AdministrativeArea","name":"Baix Llobregat"},{"@type":"AdministrativeArea","name":"Cataluna"}]});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Agencia Viajes Lujo Barcelona",url:cu}]));}
else if(p==="luna-de-miel-barcelona"){
inj({"@context":"https://schema.org","@type":"Service","name":"Luna de Miel desde Barcelona","url":cu,"description":pd,"provider":org(),"areaServed":[{"@type":"City","name":"Barcelona"},{"@type":"AdministrativeArea","name":"Baix Llobregat"},{"@type":"City","name":"Molins de Rei"}],"serviceType":"Luna de miel a medida"});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Luna de Miel Barcelona",url:cu}]));}

// PRO-TIPS
else if(p.indexOf("pro-tips-")===0){
var ps=p.replace("pro-tips-",""),pn=D[ps]||ps;
inj({"@context":"https://schema.org","@type":"Article","headline":pt.split("|")[0].trim(),"description":pd,"url":cu,"author":{"@type":"Person","@id":B.url+"/#founder","name":B.founder},"publisher":{"@type":"Organization","@id":B.url+"/#organization","name":B.name,"logo":{"@type":"ImageObject","url":B.logo}},"mainEntityOfPage":{"@type":"WebPage","@id":cu}});
// FAQPage schema from H2 sections
var faqItems=[];var sections=document.querySelectorAll(".tips-section-title");
sections.forEach(function(h2){var q="";var a="";var title=h2.textContent.trim();
if(title==="Antes de viajar"){q="¿Qué necesito saber antes de viajar a "+pn+"?";}
else if(title==="Dinero y pagos"){q="¿Cómo funcionan el dinero y los pagos en "+pn+"?";}
else if(title==="Transporte"){q="¿Cómo moverse por "+pn+"?";}
else if(title==="Seguridad y estafas"){q="¿Es seguro viajar a "+pn+"?";}
else if(title==="Salud y clima"){q="¿Qué clima tiene "+pn+" y qué precauciones de salud tomar?";}
else if(title==="Cultura y etiqueta"){q="¿Cuáles son las costumbres y normas culturales en "+pn+"?";}
else if(title==="Comida y experiencias"){q="¿Qué comer y qué experiencias hacer en "+pn+"?";}
if(q){var sec=h2.closest(".tips-section")||h2.parentElement.parentElement;var tips=sec.querySelectorAll(".tip-item p, .top5-card p");var texts=[];tips.forEach(function(t){texts.push(t.textContent.trim());});a=texts.join(" ");if(a.length>0){faqItems.push({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}});}}});
if(faqItems.length>0){inj({"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqItems});}
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Destinos",url:B.url+"/destinos/"},{name:pn,url:B.url+"/"+ps+"/"},{name:"Travel Hacks",url:cu}]));}

// EDUCATIVAS
else if(["antes-de-reservar-viaje-grande","como-planifico-un-gran-viaje","viaje-a-medida-que-es"].indexOf(p)>=0){
inj({"@context":"https://schema.org","@type":"Article","headline":pt.split("|")[0].trim(),"description":pd,"url":cu,"author":{"@type":"Person","@id":B.url+"/#founder","name":B.founder},"publisher":{"@type":"Organization","@id":B.url+"/#organization","name":B.name,"logo":{"@type":"ImageObject","url":B.logo}}});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:pt.split("|")[0].trim(),url:cu}]));}

// MOLINS DE REI
else if(p==="molins-de-rei"){
inj({"@context":"https://schema.org","@type":"TravelAgency","name":"Horizonte Exclusivo - Agencia de Viajes de Lujo en Molins de Rei","url":cu,"description":pd,"telephone":B.telephone,"email":B.email,"address":{"@type":"PostalAddress","streetAddress":B.street,"addressLocality":B.city,"addressRegion":B.region,"postalCode":B.zip,"addressCountry":B.country},"geo":{"@type":"GeoCoordinates","latitude":B.lat,"longitude":B.lng},"hasMap":"https://www.google.com/maps?cid="+B.mapCid,"areaServed":[{"@type":"City","name":"Molins de Rei"},{"@type":"AdministrativeArea","name":"Baix Llobregat"},{"@type":"City","name":"Sant Feliu de Llobregat"},{"@type":"City","name":"Sant Joan Despi"},{"@type":"City","name":"Esplugues de Llobregat"},{"@type":"City","name":"Cornella de Llobregat"},{"@type":"City","name":"Sant Boi de Llobregat"},{"@type":"City","name":"Barcelona"}]});
inj(bc([{name:"Inicio",url:B.url+"/"},{name:"Molins de Rei",url:cu}]));}

// FALLBACK
else{inj(bc([{name:"Inicio",url:B.url+"/"},{name:pt.split("|")[0].trim(),url:cu}]));}
})();
