const express = require('express');
const router = express.Router();
const request = require("request");

// Environment variables should be used to handle sensitive data securely.
const token = 'mytokenvalue'; // Make sure to keep your actual token secure
const baseURL = 'https://apitest.myfatoorah.com';

router.get('/', function(req, res) {
    res.render('main/index', { currentPath: req.path });
});

router.get('/features', function(req, res) {
    res.render('main/features', { currentPath: req.path });
});

router.get('/benefits', function(req, res) {
    res.render('main/benefits', { currentPath: req.path });
});

router.get('/prices', function(req, res) {
    const pricesData = require('../data/prices-main.json');
    res.render('main/prices', { currentPath: req.path, pricesData });
});

router.get('/register', function(req, res) {
    res.render('main/register', { currentPath: req.path });
});

router.post('/register', function(req, res) {
    const { name, email, phone, password } = req.body;
    
    // Validate input (server-side validation)
    if (!name || !email || !phone || !password) {
        return res.status(400).send('All fields are required');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email format');
    }
    
    // Phone validation
    if (phone.length !== 8 || !/^\d+$/.test(phone)) {
        return res.status(400).send('Phone must be 8 digits');
    }
    
    // Password validation
    if (password.length < 6) {
        return res.status(400).send('Password must be at least 6 characters');
    }
    
    // Process registration (placeholder - integrate with your user model)
    // For now, just redirect to home page
    res.redirect('/');
});


// Route to initiate payment
router.post('/initiate-payment', (req, res) => {
  const options = {
    method: 'POST',
    url: `${baseURL}/v2/InitiatePayment`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      InvoiceAmount: req.body.InvoiceAmount,
      CurrencyIso: req.body.CurrencyIso
    },
    json: true
  };

  request(options, function (error, response, body) {
    if (error) {
      console.error('InitiatePayment Error:', error);
      return res.status(500).json({error: 'Internal Server Error'});
    }
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json(body);
    }
    res.json(body); // Sending the response back to the client
  });
});

// Route to execute payment
router.post('/execute-payment', (req, res) => {
  const options = {
    method: 'POST',
    url: `${baseURL}/v2/ExecutePayment`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: req.body, // Pass the entire body received from the client
    json: true
  };

  request(options, function (error, response, body) {
    if (error) {
      console.error('ExecutePayment Error:', error);
      return res.status(500).json({error: 'Internal Server Error'});
    }
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json(body);
    }
    res.json(body); // Redirect or send back the response as needed
  });
});

module.exports = router;