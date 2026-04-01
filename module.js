//const link = document.getElementById('download'); link.href = durl; link.addEventListener('click', () => alert('Downloading...'));
const navi = document.querySelector('.navi');
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('.menu-trigger').addEventListener('click',()=>{
    navi.classList.toggle('active');
  });
  const fileID = '1OSjjzI2i35zuu42Lk3HMyhtV1nhg12RJ'; const durl = `https://drive.google.com/uc?id=${fileID}&export=download`;
  const dlButton = document.getElementById('download');
  if (dlButton){dlButton.href=durl; dlButton.addEventListener('click',()=>alert('Downloading...'));}
});