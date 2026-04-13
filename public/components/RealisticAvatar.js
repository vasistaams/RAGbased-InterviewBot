/**
 * Realistic Talking Avatar Component
 * Simulates lifelike breathing, blinking, and active lip-sync
 */

const RealisticAvatar = {
  render: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="position: relative; width: 140px; margin: 0 auto 24px auto;">
        <div id="ai-thinking-indicator" style="display: none; position: absolute; top: -20px; left: 50%; transform: translateX(-50%); background: var(--bg-card, #fff); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: var(--text-1, #333); box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; border: 1px solid var(--border-light, #eee); white-space: nowrap;">Thinking<span style="animation: ai_blink 1.5s infinite;">...</span></div>
        <div id="ai-realistic-avatar" style="width: 140px; height: 140px; filter: drop-shadow(0 10px 25px rgba(139, 92, 246, 0.3)); transition: filter 0.3s ease;">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
            <defs>
            <linearGradient id="ai-skin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="100%" stop-color="#8b5cf6" />
            </linearGradient>
            <linearGradient id="ai-skin-speaking" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f472b6" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
            <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#c4b5fd" />
              <stop offset="100%" stop-color="transparent" />
            </radialGradient>
          </defs>

          <style>
            /* Idle Breathing / Floating */
            .head-idle { animation: ai_breathe 4s ease-in-out infinite; transform-origin: center bottom; }
            @keyframes ai_breathe {
              0%, 100% { transform: translateY(0) scaleY(1); }
              50% { transform: translateY(-4px) scaleY(1.02); }
            }
            
            /* Organic Blinking */
            .eye-blink { animation: ai_blink 6s infinite; }
            @keyframes ai_blink {
              0%, 45%, 55%, 100% { opacity: 1; transform: scaleY(1); }
              48%, 52% { opacity: 0; transform: scaleY(0.1); }
            }

            /* Responsive Lip Sync */
            .mouth-base { fill: #c4b5fd; transition: transform 0.1s ease-in-out; transform-origin: 50px 65px; }
            .speaking-mouth { animation: lip_sync 0.2s infinite alternate; }
            @keyframes lip_sync {
              0% { transform: scaleY(0.2); }
              100% { transform: scaleY(2.5) scaleX(0.8); border-radius: 40%;}
            }

            /* Head Tilt & Thinking */
            .head-tilt { animation: ai_tilt 2s ease-in-out infinite alternate; transform-origin: center bottom; }
            @keyframes ai_tilt {
              0% { transform: rotate(-4deg) translateY(-2px); }
              100% { transform: rotate(4deg) translateY(-2px); }
            }
            .speaking-face { fill: url(#ai-skin-speaking) !important; }
          </style>

          <g id="avatar-head-group" class="head-idle">
            <!-- Sleek Android Faceplate -->
            <rect id="avatar-faceplate" x="20" y="15" width="60" height="70" rx="20" fill="url(#ai-skin)" style="transition: fill 0.3s ease;" />
            <rect x="25" y="30" width="50" height="45" rx="12" fill="#1e1b4b" />
            
            <!-- Eyes -->
            <g class="eye-blink" transform-origin="50 45">
              <circle cx="37" cy="45" r="4" fill="#a78bfa" />
              <circle cx="63" cy="45" r="4" fill="#a78bfa" />
              <!-- Glow -->
              <circle cx="37" cy="45" r="8" fill="url(#eye-glow)" opacity="0.6"/>
              <circle cx="63" cy="45" r="8" fill="url(#eye-glow)" opacity="0.6"/>
            </g>

            <!-- Adaptive Mouth Area -->
            <ellipse id="avatar-anim-mouth" class="mouth-base" cx="50" cy="63" rx="8" ry="1.5" />
          </g>
        </svg>
        </div>
      </div>
    `;
  },

  setIsSpeaking: function(isSpeaking) {
    const mouth = document.getElementById('avatar-anim-mouth');
    const faceplate = document.getElementById('avatar-faceplate');
    const avatarContainer = document.getElementById('ai-realistic-avatar');
    if (!mouth) return;

    if (isSpeaking) {
      mouth.classList.add('speaking-mouth');
      if (faceplate) faceplate.classList.add('speaking-face');
      // Subtle pulse on the gradient container to indicate active voice with new color
      if (avatarContainer) avatarContainer.style.filter = 'drop-shadow(0 15px 35px rgba(236, 72, 153, 0.6))';
    } else {
      mouth.classList.remove('speaking-mouth');
      if (faceplate) faceplate.classList.remove('speaking-face');
      if (avatarContainer) avatarContainer.style.filter = 'drop-shadow(0 10px 25px rgba(139, 92, 246, 0.3))';
    }
  },

  setIsThinking: function(isThinking) {
    const indicator = document.getElementById('ai-thinking-indicator');
    const headGroup = document.getElementById('avatar-head-group');
    if (!indicator) return;

    if (isThinking) {
      indicator.style.display = 'block';
      if (headGroup) {
        headGroup.classList.remove('head-idle');
        headGroup.classList.add('head-tilt');
      }
    } else {
      indicator.style.display = 'none';
      if (headGroup) {
        headGroup.classList.remove('head-tilt');
        headGroup.classList.add('head-idle');
      }
    }
  }
};

window.RealisticAvatar = RealisticAvatar;
