import { supabase } from '../js/supabase-config.js';

// ============================================
//  DOM Elements
// ============================================
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const loginBtn = document.getElementById('login-btn');
const loginBtnText = loginBtn.querySelector('.btn-text');
const loginLoader = document.getElementById('login-loader');
const logoutBtn = document.getElementById('logout-btn');

// ============================================
//  AUTHENTICATION STATE
// Always force sign-out on page load so the admin
// must log in fresh every visit (no cached sessions).
// ============================================

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    loadStats();
}

function showLogin() {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
}

// On every page load: clear any persisted session, force login
(async function init() {
    // Always start with login screen visible
    showLogin();
    // Sign out any lingering session silently
    await supabase.auth.signOut();
})();

// ============================================
//  LOGIN LOGIC
// ============================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    // UI Loading state
    loginBtn.disabled = true;
    loginBtnText.style.display = 'none';
    loginLoader.style.display = 'block';

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Manually show dashboard (no onAuthStateChange listener)
        showDashboard();

    } catch (error) {
        errorMsg.textContent = error.message || 'Invalid credentials. Please check your email and password.';
        errorMsg.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'block';
        loginLoader.style.display = 'none';
    }
});

// ============================================
//  LOGOUT LOGIC
// ============================================
logoutBtn.addEventListener('click', async () => {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Error signing out: ", error);
    } finally {
        // Always return to login screen
        showLogin();
    }
});

// ============================================
//  DASHBOARD STATS
// ============================================
window.loadStats = async function() {
    try {
        const [{ count: blogCount }, { count: projectCount }] = await Promise.all([
            supabase.from('blogs').select('*', { count: 'exact', head: true }),
            supabase.from('projects').select('*', { count: 'exact', head: true })
        ]);
        const blogEl = document.getElementById('stat-blogs');
        const projectEl = document.getElementById('stat-projects');
        if (blogEl) blogEl.textContent = blogCount ?? 0;
        if (projectEl) projectEl.textContent = projectCount ?? 0;
    } catch (e) {
        console.error('Stats load error:', e);
    }
}

// ============================================
//  SIDEBAR NAVIGATION
// ============================================
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Load data if needed
        if (targetId === 'manage-blogs') loadBlogs();
        if (targetId === 'manage-projects') loadProjects();
        if (targetId === 'dashboard') loadStats();
    });
});

// ============================================
//  IMAGE PREVIEW LOGIC
// ============================================
function setupImagePreview(inputId, previewImgId, previewTextId) {
    const input = document.getElementById(inputId);
    const previewImg = document.getElementById(previewImgId);
    const previewText = document.getElementById(previewTextId);

    input.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                previewText.style.display = 'none';
            }
            reader.readAsDataURL(file);
        } else {
            previewImg.style.display = 'none';
            previewImg.src = '';
            previewText.style.display = 'block';
        }
    });
}

setupImagePreview('blog-image', 'blog-preview', 'blog-preview-text');
setupImagePreview('project-image', 'project-preview', 'project-preview-text');

// ============================================
//  HELPER: SHOW STATUS MESSAGE
// ============================================
function showStatus(elementId, type, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `status-msg status-${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============================================
//  HELPER: UPLOAD IMAGE TO SUPABASE STORAGE
// ============================================
async function uploadImage(bucketName, file) {
    // Create a unique filename to avoid conflicts
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

    if (error) throw error;

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
}

// ============================================
//  ADD BLOG LOGIC
// ============================================
const blogForm = document.getElementById('blog-form');
const blogBtn = document.getElementById('blog-submit-btn');
const blogBtnText = blogBtn.querySelector('.btn-text');
const blogLoader = document.getElementById('blog-loader');

blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    blogBtn.disabled = true;
    blogBtnText.style.display = 'none';
    blogLoader.style.display = 'block';

    try {
        const title = document.getElementById('blog-title').value;
        const desc = document.getElementById('blog-desc').value;
        const content = document.getElementById('blog-content').value;
        const file = document.getElementById('blog-image').files[0];

        // 1. Upload Image only if one was selected (it's optional)
        let imageUrl = null;
        if (file) {
            imageUrl = await uploadImage('blog-images', file);
        }

        // 2. Save Blog Data to Supabase Database
        const { error } = await supabase
            .from('blogs')
            .insert({
                title: title,
                description: desc,
                content: content,
                image_url: imageUrl
            });

        if (error) throw error;

        showStatus('blog-status', 'success', 'Blog published successfully!');
        blogForm.reset();
        document.getElementById('blog-preview').style.display = 'none';
        document.getElementById('blog-preview-text').style.display = 'block';

    } catch (error) {
        console.error("Error adding blog: ", error);
        showStatus('blog-status', 'error', `Error: ${error.message}`);
    } finally {
        blogBtn.disabled = false;
        blogBtnText.style.display = 'block';
        blogLoader.style.display = 'none';
    }
});

// ============================================
//  ADD PROJECT LOGIC
// ============================================
const projectForm = document.getElementById('project-form');
const projectBtn = document.getElementById('project-submit-btn');
const projectBtnText = projectBtn.querySelector('.btn-text');
const projectLoader = document.getElementById('project-loader');

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    projectBtn.disabled = true;
    projectBtnText.style.display = 'none';
    projectLoader.style.display = 'block';

    try {
        const name = document.getElementById('project-name').value;
        const url = document.getElementById('project-url').value;
        const file = document.getElementById('project-image').files[0];

        // 1. Upload Logo to Supabase Storage
        const logoUrl = await uploadImage('project-logos', file);

        // 2. Save Project Data to Supabase Database
        const { error } = await supabase
            .from('projects')
            .insert({
                name: name,
                project_url: url,
                logo_url: logoUrl
            });

        if (error) throw error;

        showStatus('project-status', 'success', 'Project added successfully!');
        projectForm.reset();
        document.getElementById('project-preview').style.display = 'none';
        document.getElementById('project-preview-text').style.display = 'block';

    } catch (error) {
        console.error("Error adding project: ", error);
        showStatus('project-status', 'error', `Error: ${error.message}`);
    } finally {
        projectBtn.disabled = false;
        projectBtnText.style.display = 'block';
        projectLoader.style.display = 'none';
    }
});

// ============================================
//  MANAGE BLOGS LOGIC
// ============================================
window.loadBlogs = async function() {
    const list = document.getElementById('manage-blogs-list');
    list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Loading blogs...</p>';

    try {
        const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (data.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No blogs found.</p>';
            return;
        }

        list.innerHTML = '';
        data.forEach(blog => {
            const item = document.createElement('div');
            item.className = 'manage-list-item';
            
            const imgHtml = blog.image_url ? `<img src="${blog.image_url}" alt="Cover">` : `<div style="width:50px;height:50px;background:rgba(255,255,255,0.05);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:0.7rem;">Text</div>`;
            const date = new Date(blog.created_at).toLocaleDateString();

            item.innerHTML = `
                <div class="item-info">
                    ${imgHtml}
                    <div>
                        <h4>${blog.title}</h4>
                        <p>${date}</p>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteBlog('${blog.id}')">Delete</button>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading blogs:", error);
        list.innerHTML = '<p style="color: #ef4444; text-align: center;">Error loading blogs.</p>';
    }
}

window.deleteBlog = async function(id) {
    if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) return;
    
    try {
        const { error } = await supabase.from('blogs').delete().eq('id', id);
        if (error) throw error;
        loadBlogs(); // refresh list
    } catch (error) {
        alert('Failed to delete blog: ' + error.message);
    }
}

// ============================================
//  MANAGE PROJECTS LOGIC
// ============================================
window.loadProjects = async function() {
    const list = document.getElementById('manage-projects-list');
    list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Loading projects...</p>';

    try {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (data.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No projects found.</p>';
            return;
        }

        list.innerHTML = '';
        data.forEach(project => {
            const item = document.createElement('div');
            item.className = 'manage-list-item';
            
            const date = new Date(project.created_at).toLocaleDateString();

            item.innerHTML = `
                <div class="item-info">
                    <img src="${project.logo_url}" alt="Logo">
                    <div>
                        <h4>${project.name}</h4>
                        <p>${date}</p>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteProject('${project.id}')">Delete</button>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading projects:", error);
        list.innerHTML = '<p style="color: #ef4444; text-align: center;">Error loading projects.</p>';
    }
}

window.deleteProject = async function(id) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    try {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        loadProjects(); // refresh list
    } catch (error) {
        alert('Failed to delete project: ' + error.message);
    }
}

