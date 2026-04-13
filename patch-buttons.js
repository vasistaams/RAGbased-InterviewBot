const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// Fix startInterview
code = code.replace(
  /async function startInterview\(\) \{\s+try \{/g,
  `async function startInterview() {
  console.log('Button clicked: Start Interview');
  const btn = document.getElementById('btn-start-interview');
  let originalHtml = '';
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Starting...';
  }
  try {`
);

code = code.replace(
  /showPage\('interview'\);\s*\} catch \(e\) \{ console\.error\(e\); \}/g,
  `showPage('interview');
  } catch (e) {
    console.error('API error (/start-session):', e);
    showToast('Failed to start session. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }`
);

// Fix uploadResume
code = code.replace(
  /async function uploadResume\(file\) \{\s+const form/g,
  `async function uploadResume(file) {
  console.log('Action initiated: Upload Resume');
  const form`
);

// Fix btn-logout
code = code.replace(
  /document\.getElementById\('btn-logout'\)\.addEventListener\('click', async \(\) => \{\s+await authFetch\('\/api\/auth\/logout', \{ method: 'POST' \}\);/g,
  `document.getElementById('btn-logout').addEventListener('click', async () => {
    console.log('Button clicked: Logout');
    const btn = document.getElementById('btn-logout');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging out...'; }
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });`
);

code = code.replace(
  /switchAuthPanel\('login'\);\s+\}\);/g,
  `switchAuthPanel('login');
    } catch (err) {
      console.error('API error (/api/auth/logout):', err);
      showToast('Logout failed', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Logout'; }
    }
  });`
);

// Fix beginMCQTest alert -> showToast
code = code.replace(
  /alert\('Max 25 questions allowed for a single test session.'\);/g,
  `showToast('Max 25 questions allowed for a single test session.', 'error');`
);

code = code.replace(
  /alert\('Failed to start interview.'\);/g,
  `showToast('Failed to start interview.', 'error');`
);

fs.writeFileSync('public/js/app.js', code);
console.log('Patches applied successfully!');
