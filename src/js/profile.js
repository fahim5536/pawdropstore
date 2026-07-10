import './main.js';
import { auth, logoutUser } from './firebase.js';
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
  const avatarInitials = document.getElementById('avatarInitials');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  
  const updateNameInput = document.getElementById('updateName');
  const updateEmailInput = document.getElementById('updateEmail');
  const profileUpdateForm = document.getElementById('profileUpdateForm');
  const updateMsg = document.getElementById('updateMsg');
  
  const passwordUpdateForm = document.getElementById('passwordUpdateForm');
  const pwdMsg = document.getElementById('pwdMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  // Tab switching
  const navLinks = document.querySelectorAll('.profile-nav a[data-target]');
  const sections = document.querySelectorAll('.profile-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Remove active from all
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Add active to clicked
      link.classList.add('active');
      const target = link.getAttribute('data-target');
      document.getElementById('section-' + target).classList.add('active');
    });
  });

  let currentUser = null;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      
      // Populate sidebar
      const name = user.displayName || 'Me';
      profileName.textContent = name;
      profileEmail.textContent = user.email;
      avatarInitials.textContent = name.substring(0, 2).toUpperCase();

      // Populate forms
      updateNameInput.value = user.displayName || '';
      updateEmailInput.value = user.email;
    } else {
      // Redirect to home if not logged in
      window.location.href = '/';
    }
  });

  // Logout
  function showLogoutModal(onConfirm) {
    // Backdrop overlay
    const overlay = document.createElement('div');
    overlay.id = 'logout-confirm-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.25s ease'
    });

    // Content box
    const modalBox = document.createElement('div');
    Object.assign(modalBox.style, {
      background: '#0a0a0a',
      border: '1px solid #222222',
      borderRadius: '16px',
      padding: '36px 32px',
      maxWidth: '420px',
      width: '90%',
      textAlign: 'center',
      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(221, 255, 0, 0.05)',
      transform: 'scale(0.9)',
      transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
    });

    // Icon or decorative element
    const icon = document.createElement('div');
    icon.innerHTML = '🐾';
    icon.style.fontSize = '42px';
    icon.style.marginBottom = '20px';
    icon.style.filter = 'drop-shadow(0 0 10px rgba(221, 255, 0, 0.2))';
    
    // Title
    const title = document.createElement('h3');
    title.innerText = 'LOGOUT FROM PAWDROP?';
    title.style.fontFamily = 'var(--font-display, "Space Grotesk"), sans-serif';
    title.style.fontSize = '20px';
    title.style.fontWeight = '800';
    title.style.color = '#ffffff';
    title.style.letterSpacing = '1.5px';
    title.style.marginBottom = '10px';
    title.style.textTransform = 'uppercase';

    // Description text
    const desc = document.createElement('p');
    desc.innerHTML = 'Are you sure you want to log out?<br><span style="color: #666666; font-size: 12px; margin-top: 4px; display: inline-block;">নিশ্চিত আপনি লগআউট করতে চান?</span>';
    desc.style.fontSize = '14px';
    desc.style.color = '#aaaaaa';
    desc.style.lineHeight = '1.6';
    desc.style.marginBottom = '28px';

    // Buttons wrapper
    const buttonRow = document.createElement('div');
    Object.assign(buttonRow.style, {
      display: 'flex',
      gap: '14px',
      justifyContent: 'center'
    });

    // Cancel Button
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'CANCEL';
    Object.assign(cancelBtn.style, {
      flex: '1',
      padding: '14px 20px',
      background: 'transparent',
      border: '1px solid #333333',
      color: '#ffffff',
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: 'var(--font-display, "Space Grotesk"), sans-serif',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '1px',
      transition: 'all 0.2s ease'
    });
    cancelBtn.onmouseenter = () => {
      cancelBtn.style.borderColor = '#ffffff';
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.03)';
    };
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.borderColor = '#333333';
      cancelBtn.style.background = 'transparent';
    };

    // Confirm Logout Button
    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = 'LOG OUT';
    Object.assign(confirmBtn.style, {
      flex: '1',
      padding: '14px 20px',
      background: '#ff4d4d',
      border: 'none',
      color: '#ffffff',
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: 'var(--font-display, "Space Grotesk"), sans-serif',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '1px',
      boxShadow: '0 0 20px rgba(255, 77, 77, 0.3)',
      transition: 'all 0.2s ease'
    });
    confirmBtn.onmouseenter = () => {
      confirmBtn.style.background = '#ff3333';
      confirmBtn.style.boxShadow = '0 0 30px rgba(255, 51, 51, 0.5)';
    };
    confirmBtn.onmouseleave = () => {
      confirmBtn.style.background = '#ff4d4d';
      confirmBtn.style.boxShadow = '0 0 20px rgba(255, 77, 77, 0.3)';
    };

    // Construct DOM
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(confirmBtn);
    modalBox.appendChild(icon);
    modalBox.appendChild(title);
    modalBox.appendChild(desc);
    modalBox.appendChild(buttonRow);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);

    // Apply animation entry
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modalBox.style.transform = 'scale(1)';
    });

    const closeOverlay = () => {
      overlay.style.opacity = '0';
      modalBox.style.transform = 'scale(0.9)';
      setTimeout(() => {
        overlay.remove();
      }, 250);
    };

    cancelBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) closeOverlay();
    });

    confirmBtn.addEventListener('click', () => {
      closeOverlay();
      onConfirm();
    });
  }

  // Logout Button handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLogoutModal(async () => {
        try {
          await logoutUser();
          window.location.href = '/';
        } catch (error) {
          console.error("Logout failed:", error);
          showMessage(updateMsg, "Error logging out: " + error.message, true);
        }
      });
    });
  }

  // Update Profile Name
  if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = updateNameInput.value.trim();
      
      try {
        await updateProfile(currentUser, { displayName: newName });
        showMessage(updateMsg, "Profile updated successfully!", false);
        profileName.textContent = newName;
        avatarInitials.textContent = newName.substring(0, 2).toUpperCase();
      } catch (err) {
        showMessage(updateMsg, "Error updating profile: " + err.message, true);
      }
    });
  }

  // Update Password
  if (passwordUpdateForm) {
    passwordUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPwd = document.getElementById('currentPassword').value;
      const newPwd = document.getElementById('newPassword').value;
      const confirmPwd = document.getElementById('confirmNewPassword').value;

      if (newPwd !== confirmPwd) {
        showMessage(pwdMsg, "New passwords do not match.", true);
        return;
      }

      try {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(currentUser.email, currentPwd);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPwd);
        showMessage(pwdMsg, "Password updated successfully!", false);
        passwordUpdateForm.reset();
      } catch (err) {
        showMessage(pwdMsg, "Error: " + err.message, true);
      }
    });
  }

  function showMessage(el, text, isError) {
    el.textContent = text;
    el.style.color = isError ? 'red' : 'var(--neon)';
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 4000);
  }
});
