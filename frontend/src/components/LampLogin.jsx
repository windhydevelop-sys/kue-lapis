import React, { useEffect } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import axios from 'axios';
import './LampLogin.css';

gsap.registerPlugin(Draggable);

const LampLogin = () => {
  useEffect(() => {
    // Ensure code only runs in browser
    if (typeof window === 'undefined') return;


    // We already imported GSAP at the top, so we can use it directly.
    // (don't overwrite it with potentially undefined window.gsap)

    if (window.MorphSVGPlugin) {
      gsap.registerPlugin(window.MorphSVGPlugin);
    }

    // Replicate original animation logic
    const AUDIO = {
      CLICK: new Audio('https://assets.codepen.io/605876/click.mp3'),
    };

    const ON = document.querySelector('#on');
    const OFF = document.querySelector('#off');
    const LOGIN_FORM = document.querySelector('.login-form');

    const PROXY = document.createElement('div');
    let startX, startY;

    const CORDS = gsap.utils.toArray('.cords path');
    const CORD_DURATION = 0.1;
    const HIT = document.querySelector('.lamp__hit');
    const DUMMY_CORD = document.querySelector('.cord--dummy');
    const ENDX = DUMMY_CORD.getAttribute('x2');
    const ENDY = DUMMY_CORD.getAttribute('y2');
    const RESET = () => {
      gsap.set(PROXY, { x: ENDX, y: ENDY });
    };
    RESET();

    const STATE = { ON: false };

    gsap.set(['.cords', HIT], { x: -10 });
    gsap.set('.lamp__eye', { rotate: 180, transformOrigin: '50% 50%', yPercent: 50 });

    const CORD_TL = gsap.timeline({
      paused: true,
      onStart: () => {
        STATE.ON = !STATE.ON;
        gsap.set(document.documentElement, { '--on': STATE.ON ? 1 : 0 });
        const hue = gsap.utils.random(0, 359);
        gsap.set(document.documentElement, { '--shade-hue': hue });
        const glowColor = `hsl(${hue}, 40%, 45%)`;
        const glowColorDark = `hsl(${hue}, 40%, 35%)`;
        gsap.set(document.documentElement, {
          '--glow-color': glowColor,
          '--glow-color-dark': glowColorDark,
        });
        gsap.set('.lamp__eye', { rotate: STATE.ON ? 0 : 180 });
        gsap.set([DUMMY_CORD, HIT], { display: 'none' });
        gsap.set(CORDS[0], { display: 'block' });
        AUDIO.CLICK.play();
        if (STATE.ON) {
          ON.setAttribute('checked', true);
          OFF.removeAttribute('checked');
          LOGIN_FORM.classList.add('active');
        } else {
          ON.removeAttribute('checked');
          OFF.setAttribute('checked', true);
          LOGIN_FORM.classList.remove('active');
        }
      },
      onComplete: () => {
        gsap.set([DUMMY_CORD, HIT], { display: 'block' });
        gsap.set(CORDS[0], { display: 'none' });
        RESET();
      },
    });

    for (let i = 1; i < CORDS.length; i++) {
      CORD_TL.add(
        gsap.to(CORDS[0], {
          morphSVG: CORDS[i],
          duration: CORD_DURATION,
          repeat: 1,
          yoyo: true,
        })
      );
    }

    Draggable.create(PROXY, {
      trigger: HIT,
      type: 'x,y',
      onPress: (e) => {
        startX = e.x;
        startY = e.y;
      },
      onDrag: function () {
        gsap.set(DUMMY_CORD, {
          attr: { x2: this.x, y2: Math.max(400, this.y) },
        });
      },
      onRelease: function (e) {
        const DISTX = Math.abs(e.x - startX);
        const DISTY = Math.abs(e.y - startY);
        const TRAVELLED = Math.sqrt(DISTX * DISTX + DISTY * DISTY);
        gsap.to(DUMMY_CORD, {
          attr: { x2: ENDX, y2: ENDY },
          duration: CORD_DURATION,
          onComplete: () => {
            if (TRAVELLED > 50) {
              CORD_TL.restart();
            } else {
              RESET();
            }
          },
        });
      },
    });

    gsap.set('.lamp', { display: 'block' });

    // Add login form submission handling
    const formElement = document.querySelector('.login-form form');
    if (formElement) {
      formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        if (!username || !password) {
          alert('Silakan isi username dan password');
          return;
        }
        try {
          const response = await axios.post('/api/auth/login-simple', { username, password });
          if (response.data.success && response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            window.location.href = '/dashboard';
          } else {
            alert(response.data.error || 'Login gagal');
          }
        } catch (err) {
          console.error('Login error:', err);
          alert('Terjadi kesalahan saat login');
        }
      });
    }

    // Cleanup on unmount
    return () => {
      CORD_TL.kill();
      if (formElement) {
        formElement.replaceWith(formElement.cloneNode(true)); // remove listener
      }
    };
  }, []);

  const markup = `
    <form class="radio-controls">
      <input type="radio" id="on" name="status" value="on" />
      <label for="on">On</label>
      <input type="radio" id="off" name="status" value="off" />
      <label for="off">Off</label>
    </form>

    <div class="container">
      <svg
        class="lamp"
        viewBox="0 0 333 484"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g class="lamp__shade shade">
          <ellipse class="shade__opening" cx="165" cy="220" rx="130" ry="20" />
          <ellipse class="shade__opening-shade" cx="165" cy="220" rx="130" ry="20" fill="url(#opening-shade)" />
        </g>
        <g class="lamp__base base">
          <path class="base__side" d="M165 464c44.183 0 80-8.954 80-20v-14h-22.869c-14.519-3.703-34.752-6-57.131-6-22.379 0-42.612 2.297-57.131 6H85v14c0 11.046 35.817 20 80 20z" />
          <path d="M165 464c44.183 0 80-8.954 80-20v-14h-22.869c-14.519-3.703-34.752-6-57.131-6-22.379 0-42.612 2.297-57.131 6H85v14c0 11.046 35.817 20 80 20z" fill="url(#side-shading)" />
          <ellipse class="base__top" cx="165" cy="430" rx="80" ry="20" />
          <ellipse cx="165" cy="430" rx="80" ry="20" fill="url(#base-shading)" />
        </g>
        <g class="lamp__post post">
          <path class="post__body" d="M180 142h-30v286c0 3.866 6.716 7 15 7 8.284 0 15-3.134 15-7V142z" />
          <path d="M180 142h-30v286c0 3.866 6.716 7 15 7 8.284 0 15-3.134 15-7V142z" fill="url(#post-shading)" />
        </g>
        <g class="lamp__cords cords">
          <path class="cord cord--rig" d="M124 187.033V347" stroke-width="6" stroke-linecap="round" />
          <path class="cord cord--rig" d="M124 187.023s17.007 21.921 17.007 34.846c0 12.925-11.338 23.231-17.007 34.846-5.669 11.615-17.007 21.921-17.007 34.846 0 12.925 17.007 34.846 17.007 34.846" stroke-width="6" stroke-linecap="round" />
          <path class="cord cord--rig" d="M124 187.017s-21.259 17.932-21.259 30.26c0 12.327 14.173 20.173 21.259 30.26 7.086 10.086 21.259 17.933 21.259 30.26 0 12.327-21.259 30.26-21.259 30.26" stroke-width="6" stroke-linecap="round" />
          <path class="cord cord--rig" d="M124 187s29.763 8.644 29.763 20.735-19.842 13.823-29.763 20.734c-9.921 6.912-29.763 8.644-29.763 20.735S124 269.939 124 269.939" stroke-width="6" stroke-linecap="round" />
          <path class="cord cord--rig" d="M124 187.029s-10.63 26.199-10.63 39.992c0 13.794 7.087 26.661 10.63 39.992 3.543 13.331 10.63 26.198 10.63 39.992 0 13.793-10.63 39.992-10.63 39.992" stroke-width="6" stroke-linecap="round" />
          <path class="cord cord--rig" d="M124 187.033V347" stroke-width="6" stroke-linecap="round" />
          <line class="cord cord--dummy" x1="124" y2="348" x2="124" y1="190" stroke-width="6" stroke-linecap="round" />
        </g>
        <path class="lamp__light" d="M290.5 193H39L0 463.5c0 11.046 75.478 20 165.5 20s167-11.954 167-23l-42-267.5z" fill="url(#light)" />
        <g class="lamp__top top">
          <path class="top__body" fill-rule="evenodd" clip-rule="evenodd" d="M164.859 0c55.229 0 100 8.954 100 20l29.859 199.06C291.529 208.451 234.609 200 164.859 200S38.189 208.451 35 219.06L64.859 20c0-11.046 44.772-20 100-20z" />
          <path class="top__shading" fill-rule="evenodd" clip-rule="evenodd" d="M164.859 0c55.229 0 100 8.954 100 20l29.859 199.06C291.529 208.451 234.609 200 164.859 200S38.189 208.451 35 219.06L64.859 20c0-11.046 44.772-20 100-20z" fill="url(#top-shading)" />
        </g>
        <g class="lamp__face face">
          <g class="lamp__mouth">
            <path d="M165 178c19.882 0 36-16.118 36-36h-72c0 19.882 16.118 36 36 36z" fill="#141414" />
            <clipPath class="lamp__feature" id="mouth" x="129" y="142" width="72" height="36">
              <path d="M165 178c19.882 0 36-16.118 36-36h-72c0 19.882 16.118 36 36 36z" fill="#141414" />
            </clipPath>
            <g clip-path="url(#mouth)">
              <circle class="lamp__tongue" cx="179.4" cy="172.6" r="18" />
            </g>
          </g>
          <g class="lamp__eyes">
            <path class="lamp__eye lamp__stroke" d="M115 135c0-5.523-5.82-10-13-10s-13 4.477-13 10" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path class="lamp__eye lamp__stroke" d="M241 135c0-5.523-5.82-10-13-10s-13 4.477-13 10" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </g>
        </g>
        <defs>
          <linearGradient id="opening-shade" x1="35" y1="220" x2="295" y2="220" gradientUnits="userSpaceOnUse">
            <stop />
            <stop offset="1" stop-color="var(--shade)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="base-shading" x1="85" y1="444" x2="245" y2="444" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--b-1)" />
            <stop offset="0.8" stop-color="var(--b-2)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="side-shading" x1="119" y1="430" x2="245" y2="430" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--b-3)" />
            <stop offset="1" stop-color="var(--b-4)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="post-shading" x1="150" y1="288" x2="180" y2="288" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--b-1)" />
            <stop offset="1" stop-color="var(--b-2)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="light" x1="165.5" y1="218.5" x2="165.5" y2="483.5" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--l-1)" stop-opacity=".2" />
            <stop offset="1" stop-color="var(--l-2)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="top-shading" x1="56" y1="110" x2="295" y2="110" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--t-1)" stop-opacity=".8" />
            <stop offset="1" stop-color="var(--t-2)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <circle class="lamp__hit" cx="124" cy="347" r="66" fill="#C4C4C4" fill-opacity=".1" />
      </svg>

      <div class="login-form">
        <h2>Welcome Back</h2>
        <form onsubmit="return false;">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              required
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" class="login-btn">Login</button>
          <div class="form-footer">
            <a href="#" class="forgot-link">Forgot Password?</a>
          </div>
        </form>
      </div>
    </div>
  `;

  return <div className="lamp-login-wrapper" dangerouslySetInnerHTML={{ __html: markup }} />;
};

export default LampLogin;