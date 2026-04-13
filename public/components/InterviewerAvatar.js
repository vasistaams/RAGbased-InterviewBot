/**
 * Interviewer Avatar Component
 * Simulated as a module to maintain separation of concerns without requiring a React rewrite.
 */

const InterviewerAvatar = {
  render: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Component mounts into the DOM
    container.innerHTML = `
      <div id="ai-avatar" class="interviewer-avatar" style="width:120px; height:120px; border-radius:50%; background: linear-gradient(135deg, var(--accent), var(--primary)); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(139,92,246,0.3); transition: transform 0.15s ease, box-shadow 0.15s ease; margin: 0 auto 24px auto;">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
          <path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="22"></line>
          <line x1="8" y1="22" x2="16" y2="22"></line>
        </svg>
      </div>
    `;
  },

  setIsSpeaking: function(isSpeaking) {
    const avatar = document.getElementById('ai-avatar');
    if (!avatar) return;

    if (isSpeaking) {
      avatar.classList.add('speaking');
    } else {
      avatar.classList.remove('speaking');
    }
  }
};

window.InterviewerAvatar = InterviewerAvatar;
