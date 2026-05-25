(function(){
  const q=(s,p=document)=>p.querySelector(s);
  const qa=(s,p=document)=>Array.from(p.querySelectorAll(s));

  qa('[data-tab-group]').forEach(group=>{
    const tabs=qa('[data-tab]',group);
    const panes=qa('[data-pane]',group.parentElement);
    tabs.forEach(btn=>btn.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      const key=btn.dataset.tab;
      panes.forEach(p=>p.hidden=p.dataset.pane!==key);
    }));
  });

  const openBtn=q('[data-open-drawer]');
  const closeBtn=q('[data-close-drawer]');
  const drawer=q('.drawer');
  const scrim=q('.scrim');
  function toggleDrawer(next){
    if(!drawer||!scrim) return;
    drawer.classList.toggle('open',next);
    scrim.classList.toggle('open',next);
  }
  if(openBtn) openBtn.addEventListener('click',()=>toggleDrawer(true));
  if(closeBtn) closeBtn.addEventListener('click',()=>toggleDrawer(false));
  if(scrim) scrim.addEventListener('click',()=>toggleDrawer(false));

  qa('[data-filter-input]').forEach(input=>{
    input.addEventListener('input',()=>{
      const target=document.getElementById(input.dataset.filterInput);
      if(!target) return;
      const term=input.value.trim().toLowerCase();
      qa('[data-filter-item]',target).forEach(row=>{
        row.hidden=!row.textContent.toLowerCase().includes(term);
      });
    });
  });

  const form=q('[data-validate=form]');
  const alert=q('[data-validate=message]');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const required=qa('[required]',form);
      const missing=required.filter(el=>!el.value.trim());
      if(missing.length){
        alert.textContent='Please fill all required fields before creating the item.';
        alert.className='badge danger';
        return;
      }
      alert.textContent='Saved and routed to approvals workflow.';
      alert.className='badge ok';
      form.reset();
    });
  }
})();
