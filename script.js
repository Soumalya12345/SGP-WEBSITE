document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  const navLinks = document.getElementById('navLinks');
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  /* ---------- Toast ---------- */
  function showToast(msg){
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ---------- Auth modal ---------- */
  const authModal = document.getElementById('authModal');

  function openModal(tab){
    authModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    switchAuthTab(tab || 'login');
  }
  function closeModal(){
    authModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  function closeOnBackdrop(e){
    if(e.target === authModal) closeModal();
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  function switchAuthTab(tab){
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');

    document.getElementById('loginMsg').textContent = '';
    document.getElementById('signupMsg').textContent = '';

    if(tab === 'login'){
      loginForm.classList.add('active'); signupForm.classList.remove('active');
      loginTabBtn.classList.add('active'); signupTabBtn.classList.remove('active');
    } else {
      signupForm.classList.add('active'); loginForm.classList.remove('active');
      signupTabBtn.classList.add('active'); loginTabBtn.classList.remove('active');
    }
  }

  function togglePw(id, btn){
    const input = document.getElementById(id);
    if(input.type === 'password'){ input.type = 'text'; btn.textContent = 'HIDE'; }
    else { input.type = 'password'; btn.textContent = 'SHOW'; }
  }

  function isValidEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setMsg(id, text, type){
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'form-msg ' + (type || '');
  }

  /* "Logged in" state, set after the server confirms a real account */
  let currentUser = null;

  async function handleLogin(e){
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if(!isValidEmail(email)){ setMsg('loginMsg','Please enter a valid email address.','error'); return; }
    if(password.length < 6){ setMsg('loginMsg','Password must be at least 6 characters.','error'); return; }

    setMsg('loginMsg','Checking your details...','');

    try{
      const res = await fetch('/api/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if(!data.success){
        setMsg('loginMsg', data.message || 'Login failed.', 'error');
        return;
      }

      currentUser = data.user;
      setMsg('loginMsg','Logged in! Redirecting...','success');
      setTimeout(() => {
        closeModal();
        updateNavForUser(currentUser);
        showToast('Welcome back, ' + currentUser.name + '!');
        document.getElementById('loginForm').reset();
      }, 500);
    } catch(err){
      setMsg('loginMsg','Could not reach the server. Make sure server.js is running.','error');
    }
  }

  async function handleSignup(e){
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if(!name){ setMsg('signupMsg','Please enter your name.','error'); return; }
    if(!isValidEmail(email)){ setMsg('signupMsg','Please enter a valid email address.','error'); return; }
    if(password.length < 6){ setMsg('signupMsg','Password must be at least 6 characters.','error'); return; }
    if(password !== confirm){ setMsg('signupMsg','Passwords do not match.','error'); return; }

    setMsg('signupMsg','Creating your account...','');

    try{
      const res = await fetch('/api/signup', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if(!data.success){
        setMsg('signupMsg', data.message || 'Signup failed.', 'error');
        return;
      }

      currentUser = data.user;
      setMsg('signupMsg','Account created!','success');
      setTimeout(() => {
        closeModal();
        updateNavForUser(currentUser);
        showToast('Welcome, ' + currentUser.name + '!');
        document.getElementById('signupForm').reset();
      }, 500);
    } catch(err){
      setMsg('signupMsg','Could not reach the server. Make sure server.js is running.','error');
    }
  }

  function updateNavForUser(user){
    const navRight = document.getElementById('navRight');
    const authTrigger = document.getElementById('authTrigger');
    authTrigger.style.display = 'none';

    const chip = document.createElement('div');
    chip.className = 'user-chip';
    chip.id = 'userChip';
    chip.innerHTML = `<span>Hi, ${user.name}</span> <button onclick="logOut()">Log out</button>`;
    navRight.insertBefore(chip, document.getElementById('hamburgerBtn'));
  }

  function logOut(){
    currentUser = null;
    const chip = document.getElementById('userChip');
    if(chip) chip.remove();
    document.getElementById('authTrigger').style.display = '';
    showToast('Logged out.');
  }

  /* ---------- Contact form (front-end only demo) ---------- */
  function submitContactForm(e){
    e.preventDefault();
    const name = document.getElementById('cName').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const msg = document.getElementById('cMsg').value.trim();

    if(!name || !isValidEmail(email) || !msg){
      setMsg('contactMsg','Please fill in all required fields with a valid email.','error');
      return;
    }
    setMsg('contactMsg','Message sent! We will get back to you soon.','success');
    showToast('Message sent successfully!');
    document.getElementById('contactForm').reset();
  }

  /* ---------- Reveal-on-scroll for course cards ---------- */
  const cards = document.querySelectorAll('.course-card');
  cards.forEach(c => { c.style.opacity = 0; c.style.transform = 'translateY(16px)'; c.style.transition='opacity .5s ease, transform .5s ease'; });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.style.opacity = 1; en.target.style.transform='translateY(0)'; } });
  }, { threshold:0.15 });
  cards.forEach(c => obs.observe(c));
