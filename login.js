/* ============================================================
   JARCADE LOGIN — login.js
   Orchestrates the full 4-stage boot animation using GSAP
   ============================================================ */

(function () {
  'use strict';

  // ── DOM refs ──
  const canvas      = document.getElementById('particleCanvas');
  const ctx         = canvas.getContext('2d');
  const panel       = document.getElementById('panel');
  const scene       = document.getElementById('scene');
  const svg         = document.getElementById('constructSvg');
  const cRect       = document.getElementById('constructRect');
  const shockwave   = document.getElementById('shockwave');
  const shockwave2  = document.getElementById('shockwave2');

  // Elements animated by GSAP (login face)
  const elLogo    = document.getElementById('elLogo');
  const elHeading = document.getElementById('elHeading');
  const elField1  = document.getElementById('elField1');
  const elField2  = document.getElementById('elField2');
  const elOptions = document.getElementById('elOptions');
  const elBtn     = document.getElementById('elBtn');
  const elDivider = document.getElementById('elDivider');
  const elGoogleBtn = document.getElementById('elGoogleBtn');
  const elSwitch  = document.getElementById('elSwitch');

  /* ============================================================
     STAGE 0 — PARTICLES
     Lightweight canvas particles — 40 max, GPU composited
     ============================================================ */
  const PARTICLE_COUNT = 45;
  const particles = [];

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x  = Math.random() * canvas.width;
      this.y  = initial ? Math.random() * canvas.height : canvas.height + 10;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.5 + 0.15);
      this.r  = Math.random() * 1.5 + 0.4;
      this.life = 1;
      this.decay = Math.random() * 0.002 + 0.0008;
      // colour: mix of gold, cyan, purple
      const pallete = ['255,204,0', '0,200,255', '123,47,255', '0,255,157'];
      this.col = pallete[Math.floor(Math.random() * pallete.length)];
    }
    update() {
      this.x    += this.vx;
      this.y    += this.vy;
      this.life -= this.decay;
      if (this.life <= 0 || this.y < -10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.col},${this.life * 0.8})`;
      ctx.fill();
    }
  }

  function initParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
  }

  function animParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animParticles);
  }

  resizeCanvas();
  initParticles();
  animParticles();
  window.addEventListener('resize', resizeCanvas, { passive: true });


  /* ============================================================
     STAGE 1 → 4 — MAIN BOOT SEQUENCE
     ============================================================ */
  window.addEventListener('load', () => {
    setTimeout(bootSequence, 600);
  });

  // True when viewport is mobile-width (matches the CSS breakpoint)
  function isMobile() {
    return window.innerWidth <= 520;
  }

  function bootSequence() {
    prepareLoginPanelLayout();
    if (isMobile()) {
      mobileFallbackSequence();
    } else {
      desktopSequence();
    }
  }

  /* ── MOBILE FALLBACK: skip trace + shockwave, just materialize ── */
  function mobileFallbackSequence() {
    // Panel is already visible via CSS neon border — just make it opacity 1 fast
    const tl = gsap.timeline();

    gsap.set([elLogo, elHeading, elField1, elField2, elOptions, elBtn, elDivider, elGoogleBtn], {
      y: 14,
      filter: 'blur(5px)'
    });
    gsap.set(elSwitch, { y: 0, filter: 'blur(0px)' });

    tl
      .to(panel, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      .to(elLogo,    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power3.out' }, '-=0.1')
      .to(elHeading, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power2.out' }, '-=0.18')
      .to([elField1, elField2], {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.3, stagger: 0.08, ease: 'power2.out'
      }, '-=0.14')
      .to(elOptions, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out' }, '-=0.1')
      .to(elBtn, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'back.out(1.4)',
        onComplete: () => gsap.set([elLogo, elHeading, elField1, elField2, elOptions, elBtn, elDivider, elGoogleBtn], { clearProps: 'filter,y' })
      }, '-=0.08')
      .to(elDivider, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.24, ease: 'power2.out' }, '-=0.12')
      .to(elGoogleBtn, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out' }, '-=0.18')
      .to(elSwitch, { opacity: 1, duration: 0.25, ease: 'power1.out' }, '-=0.05')
      .add(lockSliderHeight);
  }

  /* ── DESKTOP SEQUENCE: full trace + shockwave ── */
  function desktopSequence() {
    prepareLoginPanelLayout();
    positionConstructRect();
    const perimeter = getPerimeter();
    const tl = gsap.timeline();

    gsap.set(cRect, {
      strokeDasharray: perimeter,
      strokeDashoffset: perimeter,
      opacity: 1
    });

    tl
      .to(cRect, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' })
      .add(() => { emitShockwave(); }, '-=0.05')
      .to(cRect, { opacity: 0, duration: 0.4, ease: 'power2.out' }, '+=0.3')
      .to(panel, { opacity: 1, duration: 0.01 }, '-=0.35')
      .to(elLogo,    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out' }, '-=0.1')
      .to(elHeading, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4,  ease: 'power2.out' }, '-=0.2')
      .to([elField1, elField2], {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.38, stagger: 0.1, ease: 'power2.out'
      }, '-=0.15')
      .to(elOptions, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power2.out' }, '-=0.1')
      .to(elBtn, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.38, ease: 'back.out(1.4)',
        onComplete: () => gsap.set([elLogo, elHeading, elField1, elField2, elOptions, elBtn, elDivider, elGoogleBtn], { clearProps: 'filter,y' })
      }, '-=0.05')
      .to(elDivider, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out' }, '-=0.12')
      .to(elGoogleBtn, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power2.out' }, '-=0.18')
      .to(elSwitch, { opacity: 1, duration: 0.3, ease: 'power1.out' }, '-=0.05')
      .add(() => { initTiltEffect(); lockSliderHeight(); }, '+=0.1');

    gsap.set([elLogo, elHeading, elField1, elField2, elOptions, elBtn, elDivider, elGoogleBtn], {
      y: 18, filter: 'blur(6px)'
    });
    gsap.set(elSwitch, { y: 0, filter: 'blur(0px)' });
  }

  /* ── Position SVG rect precisely over the panel ── */
  function positionConstructRect() {
    const pr = panel.getBoundingClientRect();
    const pad = 4;
    gsap.set(cRect, {
      attr: {
        x:      pr.left   - pad,
        y:      pr.top    - pad,
        width:  pr.width  + pad * 2,
        height: pr.height + pad * 2
      }
    });
    // Also update shockwave centres
    const cx = pr.left + pr.width  / 2;
    const cy = pr.top  + pr.height / 2;
    gsap.set([shockwave, shockwave2], { attr: { cx, cy } });
  }

  function getPerimeter() {
    const pr = panel.getBoundingClientRect();
    const r  = 20; // border-radius
    return 2 * ((pr.width + pr.height) - (4 - Math.PI) * r);
  }

  /* ── Shockwave ── */
  function emitShockwave() {
    const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 0.55;

    // Wave 1 — cyan
    gsap.fromTo(shockwave,
      { attr: { r: 0 }, opacity: 0.9 },
      { attr: { r: maxR }, opacity: 0, duration: 0.9, ease: 'power2.out' }
    );
    // Wave 2 — gold, slight delay
    gsap.fromTo(shockwave2,
      { attr: { r: 0 }, opacity: 0.7 },
      { attr: { r: maxR * 0.85 }, opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.08 }
    );
  }


  /* ============================================================
     3D TILT — removed per user request
     ============================================================ */
  function initTiltEffect() {
    // tilt removed
  }

  /* ── Recalculate SVG rect on resize ── */
  window.addEventListener('resize', () => {
    if (cRect.getAttribute('opacity') !== '0') positionConstructRect();
  }, { passive: true });


  /* ============================================================
     LOGIN ↔ SIGNUP SWITCH
     ============================================================ */
  const sliderWrap = document.getElementById('sliderWrap');
  const sliderClip = document.querySelector('.slider-clip');
  let isSignup = false;

  function lockSliderHeight() {
    if (!sliderClip) return;
    const face = isSignup
      ? document.getElementById('signupFace')
      : document.getElementById('loginFace');
    if (!face) return;
    sliderClip.style.height = `${face.offsetHeight}px`;
  }

  function prepareLoginPanelLayout() {
    isSignup = false;
    sliderWrap?.classList.remove('show-signup');
    lockSliderHeight();
  }

  prepareLoginPanelLayout();

  window.addEventListener('resize', () => {
    window.requestAnimationFrame(lockSliderHeight);
  }, { passive: true });

  window.switchToSignup = function () {
    if (isSignup) return;
    isSignup = true;
    sliderWrap.classList.add('show-signup');

    window.requestAnimationFrame(() => {
      lockSliderHeight();

      const signupFace = document.getElementById('signupFace');
      const fields = signupFace.querySelectorAll('.field-group, .form-heading, .cta-btn, .auth-divider, .google-btn, .switch-text');
      gsap.fromTo(fields,
        { opacity: 0, y: 14, filter: 'blur(4px)' },
        {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.35,
          onComplete: lockSliderHeight,
        }
      );
    });
  };

  window.switchToLogin = function () {
    if (!isSignup) return;
    isSignup = false;
    sliderWrap.classList.remove('show-signup');
    window.requestAnimationFrame(lockSliderHeight);
  };

  window.signInWithGoogle = function () {
    JarcadeAuth.showAuthError('Google sign-in is coming soon. Use email and password for now.');
  };


  /* ============================================================
     AUTH — register / login
     ============================================================ */
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('elBtn');
      const login = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const remember = document.getElementById('rememberMe')?.checked;

      if (!login || !password) {
        JarcadeAuth.showAuthError('Please enter your email and password.');
        return;
      }

      JarcadeAuth.setButtonLoading(btn, true, 'Entering…');
      try {
        await JarcadeAuth.login({ email: login, password });
        JarcadeAuth.showAuthSuccess('Welcome back, player!');
        setTimeout(() => { window.location.href = 'index.html'; }, 400);
      } catch (err) {
        JarcadeAuth.showAuthError(err.message);
      } finally {
        JarcadeAuth.setButtonLoading(btn, false);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('signupBtn');
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('signupConfirm').value;

      if (!email || !password) {
        JarcadeAuth.showAuthError('Please fill in email and password.');
        return;
      }

      if (password !== confirmPassword) {
        JarcadeAuth.showAuthError('Passwords do not match.');
        return;
      }

      JarcadeAuth.setButtonLoading(btn, true, 'Creating…');
      try {
        await JarcadeAuth.signup({ email, password, confirmPassword });
        JarcadeAuth.showAuthSuccess('Account created! Welcome to JARCADE.');
        setTimeout(() => { window.location.href = 'index.html'; }, 400);
      } catch (err) {
        JarcadeAuth.showAuthError(err.message);
      } finally {
        JarcadeAuth.setButtonLoading(btn, false);
      }
    });
  }


  /* ============================================================
     PASSWORD TOGGLE
     ============================================================ */
  window.togglePassword = function (inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-regular fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-regular fa-eye';
    }
  };

}());
