const blockedDates = ['2026-09-21', '2026-09-28', '2026-10-05'];
let bookings = { 
  '2026-09-18': ['09:00', '14:30'],
  '2026-09-19': ['10:30', '15:30'],
  '2026-09-20': ['09:00','10:30','14:30','15:30']
};
const allTimes = ['09:00','10:30','12:00','14:30','15:30','16:30'];

let current = new Date();
let selectedDateStr = null;

function renderCalendar(){
  const year = current.getFullYear(), month = current.getMonth();
  document.getElementById('monthLabel').innerText = current.toLocaleString('default',{month:'long', year:'numeric'});
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  let html = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="day-name">${d}</div>`).join('');
  for(let i=0;i<firstDay;i++) html+=`<div></div>`;
  for(let d=1; d<=daysInMonth; d++){
    let date = new Date(year, month, d);
    let str = date.toISOString().split('T')[0];
    let isPast = str < todayStr;
    let isBlocked = blockedDates.includes(str) || date.getDay()===0;
    let cls = 'day';
    if(isPast || isBlocked) cls+=' disabled';
    if(str===todayStr) cls+=' today';
    if(str===selectedDateStr) cls+=' selected';
    html+=`<div class="${cls}" onclick="${isPast||isBlocked?'':'selectDate(\''+str+'\')'}">${d}</div>`;
  }
  document.getElementById('cal').innerHTML=html;
}

function selectDate(str){
  selectedDateStr=str;
  document.getElementById('chosenDate').innerText=str;
  renderCalendar();
  let taken = bookings[str] || [];
  document.getElementById('timeSlots').innerHTML = allTimes.map(t=>{
    let booked = taken.includes(t);
    return `<div class="time ${booked?'booked':''}" onclick="${booked?'':'selectTime(this,\''+t+'\')'}">${t}${booked?' (Booked)':''}</div>`
  }).join('');
}
let selectedTime=null;
function selectTime(el,t){
  document.querySelectorAll('.time').forEach(x=>x.classList.remove('selected'));
  el.classList.add('selected'); selectedTime=t;
}
function changeMonth(n){ current.setMonth(current.getMonth()+n); renderCalendar(); }
function confirmBooking(){
  if(!selectedDateStr ||!selectedTime) return alert('Please choose date and time');
  if(!bookings[selectedDateStr]) bookings[selectedDateStr]=[];
  bookings[selectedDateStr].push(selectedTime);
  localStorage.setItem('bubbleBookings', JSON.stringify(bookings));
  document.getElementById('msg').innerText=`booked ${selectedDateStr} at ${selectedTime} - ${document.getElementById('service').value}`;
  selectDate(selectedDateStr);
}

let saved = localStorage.getItem('bubbleBookings');
if(saved) bookings = JSON.parse(saved);
renderCalendar();

function handleSignup()
{
 let n=document.getElementById('name').value, s=document.getElementById('surname').value, num=document.getElementById('number').value, e=document.getElementById('email').value, p=document.getElementById('pass').value, c=document.getElementById('confirm').value;
 if(p!==c)
    {document.getElementById('passError').style.display='block';return;}
 if(!p||!e){alert('Please fill Email and Password');return;}
 localStorage.setItem('user', JSON.stringify({name:n, surname:s, number:num, email:e}));
 window.location.href='home.html';
}