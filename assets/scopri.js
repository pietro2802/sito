
const track=document.getElementById('track'),counter=document.getElementById('counter'),bar=document.getElementById('bar');
let slides=[...track.querySelectorAll('.slide')];
function update(){if(!slides.length)return;let i=0,center=track.scrollLeft+track.clientWidth*.35;slides.forEach((s,n)=>{if(s.offsetLeft<=center)i=n});counter.textContent=`${slides.length} articoli · ${i+1} / ${slides.length}`;bar.style.width=((i+1)/slides.length*100)+'%'}
function move(d){if(!slides.length)return;let step=slides[0].getBoundingClientRect().width+16;track.scrollBy({left:d*step,behavior:'smooth'})}
document.getElementById('prev').addEventListener('click',()=>move(-1));document.getElementById('next').addEventListener('click',()=>move(1));track.addEventListener('scroll',update,{passive:true});
fetch('/data/articoli.json').then(r=>r.ok?r.json():null).then(data=>{
  if(!data||!Array.isArray(data.articles)||!data.articles.length)return;
  const sorted=[...data.articles].sort((a,b)=>b.date.localeCompare(a.date));
  const frag=document.createDocumentFragment();
  sorted.forEach(a=>{
    const art=document.createElement('article');art.className='slide';
    const cov=document.createElement('a');cov.className='cover';cov.href=a.url;
    const img=document.createElement('img');img.src=a.image;img.alt=a.imageAlt||a.title;img.loading='lazy';cov.append(img);
    const body=document.createElement('div');body.className='body';
    const tag=document.createElement('span');tag.className='tag';tag.textContent=a.category;
    const h2=document.createElement('h2');const al=document.createElement('a');al.href=a.url;al.textContent=a.title;h2.append(al);
    const p=document.createElement('p');p.textContent=a.description;
    const open=document.createElement('a');open.className='open';open.href=a.url;open.textContent='Apri articolo ↗';
    body.append(tag,h2,p,open);art.append(cov,body);frag.append(art);
  });
  track.replaceChildren(frag);
  slides=[...track.querySelectorAll('.slide')];
  update();
}).catch(()=>{update();});
update();
