
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mid = require('../../middleware');
const { admins } = require('../../config/admins');

// GET /admin/login
router.get('/login', mid.loggedOut, function(req, res, next) {
  console.log('Admin logging page');
  return res.render('admin/login', { title: 'Admin Login' });
});

// POST /admin/login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = admins.find(a => a.username === email);

    if (!admin) {
      console.log('Admin not found');
      return res.status(401).send('Invalid credentials');
    }

    // For testing - remove in production
    if (password === 'admin123') {
      req.session.admin = {
        email: admin.username
      };
      return res.redirect('/admin');
    }
    
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).send('Invalid credentials');
    }

    // Store admin data in session
    req.session.admin = {
      email: admin.username
    };

    res.redirect('/admin');
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out.');
    }
    res.redirect('/admin/login');
  });
});

const Merchant = require('../../models/merchant');
// POST /admin/change-password
// POST /admin/change-subscription/:id
router.post('/change-subscription/:id', async function(req, res) {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { type, newDate } = req.body;
    const updateField = type === 'pos' ? 'subscription.posEndDate' : 'subscription.websiteEndDate';
    await Merchant.findByIdAndUpdate(req.params.id, { 
      [updateField]: new Date(newDate) 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-password/:id', async function(req, res) {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { newPassword } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await Merchant.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin - Main admin dashboard with merchants list
router.get('/', async function(req, res, next) {
  console.log('Accessing admin route, session:', req.session);
  if (!req.session.admin) {
    console.log('Admin not logged in, redirecting to login');
    return res.redirect('/admin/login');
  }
  try {
    const merchants = await Merchant.find({}, 'name email projectName phoneNumber subscription');
    console.log('Admin logged in, rendering dashboard with merchants');
    return res.render('admin/index', { 
      title: 'Admin Dashboard',
      merchants: merchants
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return res.status(500).send('Error fetching merchants');
  }
});

module.exports = router;
