const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const DATA_FILE = path.join(__dirname, '..', 'data', 'posts.json');
const ADMIN_PASS = 'moonbase2028';

app.use(express.json());

// ── Read / Write helpers ─────────────────
// Note: On Vercel, serverless functions are read-only. We use fs for local dev,
// but acknowledge it won't persist across cold starts in production without a real DB.
function readPosts() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch (e) { return []; }
}
function writePosts(posts) {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 4), 'utf8'); }
    catch (e) { console.error("Cannot write to file system in Vercel. Use a DB for persistence."); }
}

// ── Auth middleware ──────────────────────
function requireAuth(req, res, next) {
    var pass = req.headers['x-admin-password'] || req.body._password;
    if (pass === ADMIN_PASS) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// ── Endpoints ──────────────────────────

app.get('/api/posts', function (req, res) {
    var posts = readPosts();
    posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    res.json(posts);
});

app.get('/api/posts/:id', function (req, res) {
    var posts = readPosts();
    var post = posts.find(function (p) { return p.id === req.params.id || p.slug === req.params.id; });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
});

app.post('/api/posts', requireAuth, function (req, res) {
    var posts = readPosts();
    var post = {
        id: String(Date.now()),
        title: req.body.title || 'Untitled',
        slug: (req.body.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        excerpt: req.body.excerpt || '',
        content: req.body.content || '',
        category: req.body.category || 'General',
        author: req.body.author || 'Moonbase Staff',
        date: req.body.date || new Date().toISOString().split('T')[0],
        image: req.body.image || 'images/habitat.png',
        readTime: req.body.readTime || '5 min',
        featured: req.body.featured || false
    };
    posts.push(post);
    writePosts(posts);
    res.status(201).json(post);
});

app.put('/api/posts/:id', requireAuth, function (req, res) {
    var posts = readPosts();
    var idx = posts.findIndex(function (p) { return p.id === req.params.id; });
    if (idx === -1) return res.status(404).json({ error: 'Post not found' });
    var post = posts[idx];
    if (req.body.title !== undefined) {
        post.title = req.body.title;
        post.slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (req.body.excerpt !== undefined) post.excerpt = req.body.excerpt;
    if (req.body.content !== undefined) post.content = req.body.content;
    if (req.body.category !== undefined) post.category = req.body.category;
    if (req.body.author !== undefined) post.author = req.body.author;
    if (req.body.date !== undefined) post.date = req.body.date;
    if (req.body.image !== undefined) post.image = req.body.image;
    if (req.body.readTime !== undefined) post.readTime = req.body.readTime;
    if (req.body.featured !== undefined) post.featured = req.body.featured;
    posts[idx] = post;
    writePosts(posts);
    res.json(post);
});

app.delete('/api/posts/:id', requireAuth, function (req, res) {
    var posts = readPosts();
    var idx = posts.findIndex(function (p) { return p.id === req.params.id; });
    if (idx === -1) return res.status(404).json({ error: 'Post not found' });
    posts.splice(idx, 1);
    writePosts(posts);
    res.json({ success: true });
});

module.exports = app;
