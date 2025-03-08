const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const keys = require("../../config/keys");
const multer = require('multer');
const path = require('path');

const Merchant = require("../../models/merchant");
const Category = require("../../models/category");
const Product = require("../../models/product");
const Branch = require("../../models/branch");
const Customer = require("../../models/customer");
const Order = require("../../models/order");
const Offer = require('../../models/offer');
const CashTransaction = require('../../models/CashTransaction'); // Import the CashTransaction model
const Balance = require('../../models/Balance'); // Adjust path to your Balance model
const Subuser = require('../../models/Subuser');
const Purchase = require('../../models/purchase');

const mongoose = require('mongoose');
var nodemailer = require("nodemailer");

const axios = require("axios");


// Import the orders router
const orderRoutes = require('./orders');
const purchasesRoutes = require('./purchases');
const productsRoutes = require('./products');

router.use('/orders', orderRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/products', productsRoutes);






router.get('/inventory/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Calculate average FIFO
    const inventory = product.inventory;
    const totalCost = inventory.reduce((sum, batch) => sum + batch.purchasePrice * batch.quantity, 0);
    const totalQuantity = inventory.reduce((sum, batch) => sum + batch.quantity, 0);
    const averageFIFO = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    // Log and return the result
    console.log("Fetched Inventory:", inventory);
    console.log("Average FIFO:", averageFIFO);

    res.status(200).json({ 
      success: true, 
      inventory, 
      average_FIFO: averageFIFO.toFixed(3) // Return as a string with 2 decimals
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ success: false, message: 'Error fetching inventory' });
  }
});







// Replace these with your WhatsApp configuration
const WHATSAPP_ACCESS_TOKEN = 'EAAW2ewCJWu0BO6iZBOyrhgaouPF3KLaT1ybcZCIEUaxsPjUMp0dn9FGC7beiD8cTZCJ2P8fiBjQz9z2iGYjyxjZBBr8t48fHoxBkpS3fGPMhm04YZCuVQiFUzq0B5ZBwJX1j8CXPRAJd0sUOLwhEq6rr27rYlzzIc3Ca4D3fYGt3PCPHNsqy24cJyCO2JsvFXhhbiMzQfkELYYQg46GAytZA2nbikSkMixNbFeY2yB5';
const WHATSAPP_PHONE_NUMBER_ID = '516336674889791';
// const RECIPIENT_PHONE_NUMBER = '+96555559294'; // Example phone number in international format
// const RECIPIENT_PHONE_NUMBER = '+96555559294'; // Example phone number in international format


// Set up storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/img/upload/'); // Save files to this directory
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

// const upload = multer({ storage: storage });



const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, SVG, and WEBP are allowed.'));
    }
  },
});



// Webhook verification endpoint
router.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'h'; // Replace with your verify token

  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === VERIFY_TOKEN
  ) {
    console.log('Webhook verified!');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('Webhook verification failed.');
    res.sendStatus(403);
  }
});


router.post('/webhook1', (req, res) => {
  const body = req.body;

  console.log('Received webhook event:');

  if (body.object === 'whatsapp_business_account') {
    const changes = body.entry?.[0]?.changes;

    changes?.forEach((change) => {
     // console.log('Change field:', change.field);

      if (change.field === 'messages') {
        const messages = change.value?.messages;

        messages?.forEach((message) => {
         // console.log('Received message:');
         // console.log('From:', message.from); // Customer's phone number
         // console.log('Message:', message.text.body); // Message content

          // Call sendthank_you_itc instead of sendReply
            sendthank_you_itc();
        });
      } else if (change.field === 'account_alerts') {
       // console.log('Received account alert:');
       // console.log('Alert Type:', change.value.alert_type);
       // console.log('Description:', change.value.alert_description);
      } else {
       // console.log('Unhandled change field:', change.field);
      }
    });
  } else {
    console.warn('Unexpected object type received:', body.object);
  }

  res.sendStatus(200); // Acknowledge receipt of the webhook
});

router.post('/webhook', (req, res) => {
  const body = req.body;

  console.log('Received webhook event:');

  if (body.object === 'whatsapp_business_account') {
    const changes = body.entry?.[0]?.changes;

    changes?.forEach((change) => {
     // console.log('Change field:', change.field);

      if (change.field === 'messages') {
        const messages = change.value?.messages;

        messages?.forEach((message) => {
         // console.log('Received message:');
         // console.log('From:', message.from); // Customer's phone number
         // console.log('Message:', message.text.body); // Message content

          // Auto-reply with a link to contact customer service
          sendReply(
            message.from, // Reply to the sender's number
            'شكراً لتواصلكم معنا! للتواصل مع خدمة العملاء، يرجى الضغط على الرابط التالي:\n\nhttps://itcstore.net/contactW'
          );
        });
      } else if (change.field === 'account_alerts') {
       // console.log('Received account alert:');
       // console.log('Alert Type:', change.value.alert_type);
       // console.log('Description:', change.value.alert_description);
      } else {
       // console.log('Unhandled change field:', change.field);
      }
    });
  } else {
    console.warn('Unexpected object type received:', body.object);
  }

  res.sendStatus(200); // Acknowledge receipt of the webhook
});



// Function to send a reply
const sendReply = async (to, message) => {
  // const WHATSAPP_PHONE_NUMBER_ID = 'your-phone-number-id'; // Replace with your phone number ID
  // const WHATSAPP_ACCESS_TOKEN = 'your-access-token'; // Replace with your access token

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v16.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Reply sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending reply:', error.response?.data || error.message);
  }
};




const sendthank_you_itc = async () => {
  try {
    console.log("Sending 'thank_you_itc' Template...");

    // WhatsApp Message Data
    const messageData = {
      messaging_product: "whatsapp",
      to: "96555559294", // Recipient's phone number
      type: "template",
      template: {
        name: "thank_you_itc", // WhatsApp-approved template name
        language: {
          code: "ar", // Language code of the template
        },
        components: [
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: "https://example.com/customer-service", // URL for the button
              },
            ],
          },
        ],
      },
    };

    console.log("Prepared Message Data:", JSON.stringify(messageData, null, 2));

    // Send WhatsApp Message
    const whatsappResponse = await axios.post(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp 'thank_you_itc' template sent successfully:", whatsappResponse.data);
    return { success: true, data: whatsappResponse.data };
  } catch (error) {
    console.error("Error sending WhatsApp 'thank_you_itc' template:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};




// router.post('/webhook', (req, res) => {
//   const body = req.body;

//   console.log('Received webhook event:');
//   // console.log('body.object:', body.object);
//   // console.log('body:', JSON.stringify(body, null, 2));

//   // Check if the event is from WhatsApp Business Account
//   if (body.object === 'whatsapp_business_account') {
//     const changes = body.entry?.[0]?.changes;

//     changes?.forEach((change) => {
//      // console.log('Change field:', change.field);

//       if (change.field === 'messages') {
//         const messages = change.value?.messages;

//         messages?.forEach((message) => {
//          // console.log('Received message:');
//          // console.log('From:', message.from); // Customer's phone number
//          // console.log('Message:', message.text.body); // Message content
//         });
//       } else if (change.field === 'account_alerts') {
//        // console.log('Received account alert:');
//        // console.log('Alert Type:', change.value.alert_type);
//        // console.log('Description:', change.value.alert_description);
//       } else {
//        // console.log('Unhandled change field:', change.field);
//       }
//     });
//   } else {
//     console.warn('Unexpected object type received:', body.object);
//   }

//   res.sendStatus(200); // Acknowledge receipt of the webhook
// });

















// POST Endpoint: Create a new cash transaction
router.post('/cashTransactions/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  const { amount, description, type } = req.body;

  console.log("sss");

  try {
    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero." });
    }

    if (!type || !['inflow', 'outflow'].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid transaction type. Use 'inflow' or 'outflow'." });
    }

    // Fetch the merchant's current balance
    const balance = await Balance.findOne({ merchant: merchantId });
    if (!balance || balance.bankBalance === undefined || balance.bankBalance === null) {
      return res.status(404).json({ success: false, message: "Merchant balance not found or bank balance is undefined." });
    }

    const currentBankBalance = balance.bankBalance; // Use the existing bankBalance without defaulting to 0
    const adjustment = type === 'inflow' ? parseFloat(amount) : -parseFloat(amount);
    const newBankBalance = currentBankBalance + adjustment;

    // Log the transaction
    const newTransaction = new CashTransaction({
      merchant: merchantId,
      amount: Math.abs(adjustment),
      description: description + "[تعديل Manager]" || `Bank balance adjustment logged.`,
      type,
      method: 'manager', // Fixed as 'manager'
      source: 'shop', // Fixed as 'shop'
      status: 'completed', // Default to completed
    });

    await newTransaction.save();

    // Update the bank balance
    balance.bankBalance = newBankBalance;
    await balance.save();

    console.log("Transaction created and balance updated successfully.")

    res.status(201).json({
      success: true,
      message: "Transaction created and balance updated successfully.",
      transaction: newTransaction,
      newBalance: newBankBalance,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ success: false, message: "Server error. Unable to create transaction.", error });
  }
});







router.post("/login", async (req, res) => {
  try {
    
    const { emailorphone, password } = req.body;
    let merchant;

    // Determine if the identifier is an email or phone number and fetch the merchant
    if (emailorphone.includes("@")) {
      merchant = await Merchant.findOne({ email: emailorphone.toLowerCase() });
    } else {
      merchant = await Merchant.findOne({ phoneNumber: emailorphone });
    }

    if (!merchant) {
      return res
        .status(401)
        .json({ message: "Login failed: Merchant not found." });
    }

    // Check if the provided password is correct
    const isMatch = await bcrypt.compare(password, merchant.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Login failed: Incorrect password." });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: merchant._id }, keys.jwtSecret, {
      expiresIn: "1h",
    });

    // Respond with merchant data and token
    res.status(200).json({
      success: true,
      message: "Login successful 02",
      token: token,
      merchant: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phoneNumber,
        projectName: merchant.projectName,
          paymentMethods: merchant.paymentMethods,
        logo: merchant.logo,
        isMerchantLogin: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});




router.post("/subuser-login", async (req, res) => {
  try {

    // console.log("subuser-login");
    // console.log("subuser-login2");
    const { email, password } = req.body;

      // console.log("req.body: ", req.body);
      // console.log("email: ", email);
      // console.log("password: ", password);
    
    const subuser = await Subuser.findOne({ email: email.toLowerCase() });
    if (!subuser) {
      return res.status(401).json({ message: "Login failed: Subuser not found" });
    }

    console.log("req.body: ", req.body);

    const isMatch = await bcrypt.compare(password, subuser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Login failed: Incorrect password" });
    }
    console.log("subuser-login3");

    const merchant = await Merchant.findById(subuser.merchant);
    if (!merchant) {
      return res.status(401).json({ message: "Login failed: Associated merchant not found" });
    }

    const token = jwt.sign(
      { id: subuser._id, role: subuser.role, merchantId: merchant._id },
      keys.jwtSecret,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful 03",
      token: token,
      merchant: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email,
        paymentMethods: merchant.paymentMethods,
        phone: merchant.phoneNumber,
        projectName: merchant.projectName,
        logo: merchant.images.logo,
        invoiceOptions: merchant.invoiceOptions,
        
      
        subuser: {
          id: subuser._id,
          name: subuser.name,
          email: subuser.email,
          isActive: subuser.isActive,
          permissions: subuser.permissions,
          role: subuser.role
        }
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// module.exports = router;

// GET /merchant/:id - Retrieve merchant and associated data
router.get("/merchant/:id", async (req, res) => {
  try {
    console.log("merchant");
    
    const merchantId = req.params.id;
    const merchant = await Merchant.findById(merchantId);

    // console.log("merchant ID: " + merchantId );

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    const categories = await Category.find({ merchant: merchantId }).sort({ sort: 1 });
    // const products = await Product.find({ merchant: merchantId });
    // const branches = await Branch.find({ merchant: merchantId });
    // const customers = await Customer.find({ merchant: merchantId });

    res.status(200).json({
      success: true,
      merchant,
      categories,
      // products,
      // branches,
      // customers,
    });
  } catch (error) {
    console.error("Error fetching merchant data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.get("/merchant/:id/payment-methods", async (req, res) => {
  try {
    
    const merchantId = req.params.id;
    console.log("merchant ID: " + merchantId );
    const merchant = await Merchant.findById(merchantId).select('paymentMethods');

    

    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    res.status(200).json({ success: true, paymentMethods: merchant.paymentMethods });
  } catch (error) {
    console.error("Error fetching merchant payment methods:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




// GET /merchant/:id/categories - Retrieve minimal category data for the merchant
router.get("/merchantPOS/:id/categories", async (req, res) => {
  try {
    const merchantId = req.params.id;

    // Fetch only necessary fields for categories, sorted by 'sort'
    const categories = await Category.find({ merchant: merchantId })
      .sort({ sort: 1 })
      .select("category_number EnglishName ArabicName imgsrc"); // Select only the fields used in the UI

    // Handle case where no categories are found
    if (!categories || categories.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No categories found for this merchant" });
    }

    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Route to handle customer sign-up
router.post("/customers", async (req, res) => {
  const { country, phone, name, email, password } = req.body;

  try {
    // console.log("Plain password during registration:", password); // Log the plain password

    // Hash the password here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // console.log("Hashed password during registration:", hashedPassword); // Log the hashed password

    const newCustomer = new Customer({
      country,
      phone,
      name,
      email,
      password: hashedPassword, // Save the hashed password
      merchant: "662625076d3391f5ad60c243", // Replace with actual merchant ID
    });

    await newCustomer.save();

    const token = jwt.sign({ id: newCustomer._id }, keys.jwtSecret, {
      expiresIn: "1h",
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      token: token,
      customer: {
        id: newCustomer._id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        country: newCustomer.country,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while creating the customer",
      });
  }
});


// Route to handle customer login
router.post("/Customerlogin", async (req, res) => {
  const { emailorphone, password } = req.body;

  try {
    // console.log("Login request received:", { emailorphone, password });

    let customer;

    // Determine if the identifier is an email or phone number and fetch the customer
    if (emailorphone.includes("@")) {
      customer = await Customer.findOne({ email: emailorphone.toLowerCase() });
    } else {
      customer = await Customer.findOne({ phone: emailorphone });
    }

    if (!customer) {
      // console.log("Customer not found");
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid email or phone number or password",
        });
    }

    // console.log("Plain password:", password);
    // console.log("Stored hashed password:", customer.password);

    const isMatch = await bcrypt.compare(password, customer.password);
    // console.log("Password match result:", isMatch); // Log the result of password comparison

    if (!isMatch) {
      // console.log("Password does not match");
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid email or phone number or password",
        });
    }

    const token = jwt.sign({ id: customer._id }, keys.jwtSecret, {
      expiresIn: "1h",
    });

    // console.log("Login successful, generating token");
    res.status(200).json({
      success: true,
      message: "Login successful 04",
      token: token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        country: customer.country,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ success: false, message: "An error occurred during login" });
  }
});






router.post("/Merchantlogin", async (req, res) => {
  const { emailorphone, password } = req.body;

  try {
    let merchant;

    // Determine if the identifier is an email or phone number and fetch the merchant
    if (emailorphone.includes("@")) {
      merchant = await Merchant.findOne({ email: emailorphone.toLowerCase() });
    } else {
      merchant = await Merchant.findOne({ phoneNumber: emailorphone });
    }

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or phone number or password",
      });
    }

    const isMatch = await bcrypt.compare(password, merchant.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or phone number or password",
      });
    }

    const token = jwt.sign({ id: merchant._id }, keys.jwtSecret, {
      expiresIn: "1h",
    });

    console.log("merchant: " + merchant);

    res.status(200).json({
      success: true,
      message: "Login successful 05",
      token: token,
      merchant: {
        id: merchant._id,
        name: merchant.name,
        projectName: merchant.projectName,
        email: merchant.email,
        paymentMethods: merchant.paymentMethods,
        phoneNumber: merchant.phoneNumber,
        logo: merchant.images.logo,
        companyName: merchant.companyName,
        invoiceText: merchant.invoiceText,
        subscription: merchant.subscription.posEndDate,
        isMerchantLogin: true,
        
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: "An error occurred during login" });
  }
});


// Middleware to verify token
const verifyToken = (req, res, next) => {
  // console.log("Verifying token...");
  const token = req.headers["authorization"];

  // console.log(token);
  if (!token) {
    // console.log("No token provided");
    return res
      .status(403)
      .json({ success: false, message: "No token provided" });
  }
  jwt.verify(token, keys.jwtSecret, (err, decoded) => {
    if (err) {
      // console.log("Failed to authenticate token");
      return res
        .status(500)
        .json({ success: false, message: "Failed to authenticate token" });
    }
    req.userId = decoded.id;
    // console.log("req.userId from verifyToken: ", req.userId);
    next();
  });
};

router.post("/customer/address1", verifyToken, async (req, res) => {
  // console.log("you Reached /api/customer/address1 ");
});

// Route to get customer addresses
router.get("/customer/addresses", verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.userId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Endpoint to update customer profile
router.post("/customer/update", verifyToken, async (req, res) => {
  try {
    if (req.userId !== req.body.id) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized action" });
    }

    const { id, name, email, country, phone } = req.body;
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        name,
        email,
        country,
        phone,
      },
      { new: true },
    ).select("-password"); // Exclude password from response

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Endpoint to change customer password
router.post("/customer/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const customer = await Customer.findById(req.userId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // Hash the new password here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    customer.password = hashedPassword;
    await customer.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add address route
router.post("/customer/address", verifyToken, async (req, res) => {
  try {
    const {
      country,
      region,
      addressType,
      street,
      block,
      house,
      district,
      avenue,
      road,
      extraDescription,
      isDefault,
    } = req.body;

    

    const customer = await Customer.findById(req.userId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const newAddress = {
      country,
      region,
      addressType,
      street,
      block,
      house,
      district,
      avenue,
      road,
      extraDescription,
      isDefault,
    };

    // Add new address to customer's addresses array
    if (!customer.addresses) {
      customer.addresses = [];
    }
    customer.addresses.push(newAddress);

    // Save the updated customer document
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add this to your existing backend routes
// Add this endpoint to handle address update
router.post("/customer/update-address", verifyToken, async (req, res) => {
  try {
    const { _id, city, block, street, house, region, isDefault } = req.body;

    const address = await Address.findByIdAndUpdate(
      _id,
      { city, block, street, house, region, isDefault },
      { new: true },
    );

    if (isDefault) {
      // If the updated address is set as default, unset the default flag for other addresses
      await Address.updateMany(
        { _id: { $ne: _id }, customer: address.customer },
        { isDefault: false },
      );
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Address updated successfully",
        address,
      });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Delete address of customer
// POST request to delete an address
router.post("/customer/address/:addressId", verifyToken, async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.userId);

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    customer.addresses.pull(addressId); // Use pull to remove the address
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// // Route to get products by category number
// router.get("/categories/:categoryNumber/products", async (req, res) => {
//   try {
//     // console.log("Reached /api/categories/:categoryNumber/products");
//     const categoryNumber = req.params.categoryNumber;
//     // console.log("Category Number: ", categoryNumber);

//     const products = await Product.find({ category_number: categoryNumber }).sort({ order_command: 1 });

//     // console.log("Products found: ", products);

//     if (!products || products.length === 0) {
//       return res.status(404).json({ success: false, message: "No products found for this category" });
//     }

//     res.status(200).json({ success: true, products });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });


// Route to get products by category number
router.get("/categories/:categoryNumber/products/:YOUR_MERCHANT_ID", async (req, res) => {
  try {

    console.log("ggg");
    // console.log("Reached /api/categories/:categoryNumber/products");
    const categoryNumber = req.params.categoryNumber;
    const YOUR_MERCHANT_ID = req.params.YOUR_MERCHANT_ID;
    // console.log("Category Number: ", categoryNumber);

    // Find the category by categoryNumber
    const category = await Category.findOne({ category_number: categoryNumber });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }


    // Use category._id to find offers associated with this category
    // const offers = await Offer.find({
    //   merchant: YOUR_MERCHANT_ID,
    //   categories: category._id
    // });


    // console.log("offers: ", offers);
    

    const products = await Product.find(
      { category_number: categoryNumber , merchant: YOUR_MERCHANT_ID }
    ,
      {
        product_number: 1,
        product_name_en: 1,
        product_name_ar: 1,
        product_image: 1,
        sale_price: 1,
        purchase_price: 1,
        Stock: 1,
        latest_FIFO: 1,
        variations: 1,
        order_command: 1,
        category: 1 // Fetch the category field
      }
    ).sort({ order_command: 1 });

    // console.log("Products found: ", products);

    if (!products || products.length === 0) {
      console.log("category:" + category);
      return res.status(400).json({ success: true, message: "No products found for this category", offers:{}, products:{},  category});
    }
      // console.log("products: ", products);
    res.status(200).json({ success: true, products, category });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.get("/categoriesPOS/:categoryNumber/products/:YOUR_MERCHANT_ID", async (req, res) => {
  try {
    const { categoryNumber, YOUR_MERCHANT_ID } = req.params;

    // Fetch products for the given categoryNumber and merchant
    const products = await Product.find(
      { category_number: categoryNumber, merchant: YOUR_MERCHANT_ID },
      {
        product_number: 1,
        product_name_en: 1,
        product_name_ar: 1,
        product_image: 1,
        sale_price: 1,
        purchase_price: 1,
        Stock: 1,
        latest_FIFO: 1,
        variations: 1,
        order_command: 1,
        category: 1 // Fetch the category field
      }
    ).sort({ order_command: 1 });

    // If no products are found, return null for products and offers
    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found for this category" });
    }

    // Safely determine the category for offers (only if the first product has a valid category)
    const categoryForOffers = products[0]?.category || null;

    // Fetch offers only if categoryForOffers is valid
    let offers = [];
    if (categoryForOffers) {
      offers = await Offer.find(
        {
          merchant: YOUR_MERCHANT_ID,
          categories: categoryForOffers // Use only the product's category
        },
        {
          offer_name_ar: 1,
          offer_name_en: 1,
          discounted_price: 1
        }
      );
    }

    // Return the products and offers
    res.status(200).json({ success: true, products, offers });
  } catch (error) {
    console.error("Error fetching products and offers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});








// router.post("/submit-order", async (req, res) => {
//   const myWebsite = req.headers.host;
//   const referer = req.headers.referer || 'No referer';

//   // console.log("myWebsite: ", myWebsite);
//   // console.log("Referer: ", referer);

//   try {
//     // console.log("Reached /submit-order");
//     res.redirect(`/payment/pay`);
//     // res.redirect(`/payment/pay?b=5`);
//     // Post to /pay endpoint with a fixed amount of 5
//     // const paymentResponse = await axios.post(`http://${myWebsite}/payment/pay`, {
//     //   amount: 5
//     // });

//     // const redirectUrl = paymentResponse.data.paymentUrl;
//     // // console.log("Payment URL: ", redirectUrl);

//     // res.status(200).json({ redirectUrl: redirectUrl });
//   } catch (error) {
//     console.error("Error processing payment: ", error);
//     res.status(500).json({ success: false, message: "Error processing payment" });
//   }
  
// });







router.post("/submit-order", async (req, res) => {
  try {
    console.log("/submit-order");

    const myWebsite = req.headers.referer || '';
    const { customerName, items, address, phone, deliveryFee, discount, total, merchant, paymentMethod, source } = req.body;

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate the grand total
    const calculatedTotal = (subtotal - (discount || 0) + (deliveryFee || 0)).toFixed(2);

    console.log("Calculated total:", calculatedTotal, "Submitted total:", total);

    // Validate the total matches the calculated total
    if (parseFloat(calculatedTotal) !== parseFloat(total)) {
      return res.status(400).json({
        success: false,
        message: "Submitted total does not match calculated total",
        calculatedTotal
      });
    }

    // Create a new order
    const newOrder = new Order({
      customerName,
      items,
      address,
      source,
      phone,
      deliveryFee,
      discount,
      total: parseFloat(calculatedTotal), // Use calculated total
      merchant,
      paymentMethod,
      myWebsite
    });

    console.log("paymentMethod: ", paymentMethod);

    // Save the order to the database
    const savedOrder = await newOrder.save();

    console.log("Order saved:", savedOrder); // Log saved order to check order_number and merchant

    // Call sendWhatsAppMessage directly
    // (async () => {
    //   try {
    //     const send2Response = await sendWhatsAppMessage({
    //       orderNo: savedOrder.order_number, // Order number from the saved order
    //       CustomerPhone: savedOrder.phone, // Customer phone from the saved order
    //       totalBill: savedOrder.total, // Total bill from the saved order
    //       projectName: "Your Project Name", // Replace with your project name
    //       deliveryTime: 'خلال 24 ساعة',
    //       orderLink: `m=${savedOrder.phone}&i=${savedOrder.order_number}`, // Updated order link

    //     });

    //     if (send2Response.success) {
    //      // console.log("WhatsApp message sent successfully:", send2Response.data);
    //     } else {
    //       console.error("Error sending WhatsApp message:", send2Response.error);
    //     }
    //   } catch (error) {
    //     console.error("Error sending WhatsApp message:", error.message);
    //   }
    // })();

    // Handle response based on payment method
    if (paymentMethod === 'cash') {
      const redirectUrl = `/PaymentCash?orderId=${savedOrder._id}`;
     // console.log("Redirect URL:", redirectUrl);
      return res.json({ redirectUrl });
    }

    return res.redirect(`/payment/pay?orderId=${savedOrder._id}`);
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({ success: false, message: "Error submitting order" });
  }
});











router.post("/submit-purchase-order", async (req, res) => {
  try {

    // console.log("req.body:", JSON.stringify(req.body, null, 2));
    
    const { vendorName, items, notes, merchant, paymentMethod, total } = req.body;

    // Calculate subtotal and totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.cost * item.quantity);
    }, 0);

    // Create a new purchase order
    const newPurchase = new Purchase({
      vendorName,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        product_name_en: item.product_name_en,
        product_name_ar: item.product_name_ar,
        variantId: item.variantId,
        variantName: item.variantName,
        v_name_en: item.v_name_en,
        v_name_ar: item.v_name_ar,
        // warranty: item.warranty,
        brandName: item.brandName,
        productImage: item.productImage,
        price: item.price,
          purchase_price: item.purchase_price,
        quantity: item.quantity,
        // note: item.note
      })),
      
      merchant,
      notes,
        totalCost: total,
      // totalCost: subtotal,
      status: 'new',
      paymentStatus: 'notpaid',
      payment_method: paymentMethod || 'cash',
      receivingStatus: 'pending'
    });

    // Save the purchase order
    const savedPurchase = await newPurchase.save();

    // console.log("Purchase order saved:", savedPurchase);
    res.status(201).json({ 
      success: true, 
      message: "Purchase order created successfully",
      purchase: savedPurchase 
    });

  } catch (error) {
    console.error("Error submitting purchase order:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting purchase order",
      error: error.message 
    });
  }
});


















const sendWhatsAppMessage_not_used = async ({ orderNo, projectName, deliveryTime, orderLink, CustomerPhone }) => {
  try {
    console.log("Sending WhatsApp Message...");

    // WhatsApp Message Data
    const messageData = {
      messaging_product: 'whatsapp',
      to: "+965"+CustomerPhone, // Replace with the recipient's phone number
      type: 'template',
      template: {
        name: 'confirm_order_original', // WhatsApp-approved template name
        language: {
          code: 'ar', // Arabic language code
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: projectName }, // Store name
              { type: 'text', text: orderNo }, // Order number
              { type: 'text', text: deliveryTime }, // Delivery info
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: orderLink }, // Order link
            ],
          },
        ],
      },
    };

    console.log("Prepared Message Data:", JSON.stringify(messageData, null, 2));

    // Send WhatsApp Message
    const whatsappResponse = await axios.post(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('WhatsApp message sent successfully:', whatsappResponse.data);
    return { success: true, data: whatsappResponse.data };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};





const sendWhatsAppMessage = async ({ orderNo, projectName, deliveryTime, orderLink, CustomerPhone, totalBill }) => {
  try {
    console.log("Sending WhatsApp Message...");

    // WhatsApp Message Data
    const messageData = {
      messaging_product: 'whatsapp',
      to: `+965${CustomerPhone}`, // Dynamic recipient phone number
      type: 'template',
      template: {
        name: 'confirm_order_', // WhatsApp-approved template name
        language: {
          code: 'ar', // Arabic language code
        },
        components: [
          {
            type: 'header', // Include header with image
            parameters: [
              {
                type: 'image',
                image: {
                  link: 'https://03f000b7-d8ed-4d3f-8662-4083eae156b5-00-2qjrhbuh8kkup.pike.replit.dev/img/banner.jpg', // Replace with your pre-uploaded image link
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: orderNo },       // Dynamic value for {{1}} - Order number
              { type: 'text', text: totalBill }, // Dynamic value for {{2}} - Delivery info
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: orderLink }, // Dynamic URL for the order link button
            ],
          },
        ],
      },
    };

    console.log("Prepared Message Data:", JSON.stringify(messageData, null, 2));

    // Send WhatsApp Message
    const API_URL = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const whatsappResponse = await axios.post(API_URL, messageData, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('WhatsApp message sent successfully:', whatsappResponse.data);
    return { success: true, data: whatsappResponse.data };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};


const sendWhatsAppMessageComplete = async ({ orderNo, projectName, deliveryTime, orderLink, CustomerPhone, totalBill }) => {
  try {
    console.log("Sending WhatsApp Message...");

    // WhatsApp Message Data
    const messageData = {
      messaging_product: 'whatsapp',
      to: `+965${CustomerPhone}`, // Dynamic recipient phone number
      type: 'template',
      template: {
        name: 'complete_order_template', // WhatsApp-approved template name
        language: {
          code: 'ar', // Arabic language code
        },
        components: [
          {
            type: 'header', // Static header without dynamic parameters
            parameters: [],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: orderNo },       // Order number
              { type: 'text', text: `${totalBill} KD` }, // Total bill
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: orderLink }, // Dynamic URL for the order link
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 1,
            parameters: [
              { type: 'text', text: "contactw" }, // Dynamic URL for the customer service link
            ],
          },
        ],
      },
    };

    console.log("Prepared Message Data:", JSON.stringify(messageData, null, 2));

    // Send WhatsApp Message
    const API_URL = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const whatsappResponse = await axios.post(API_URL, messageData, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('WhatsApp message sent successfully:', whatsappResponse.data);
    return { success: true, data: whatsappResponse.data };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};






router.get('/test-send-whatsapp', async (req, res) => {
  try {
    const orderNo = "1";
    const CustomerPhone = "55559294";
    const totalBill = "2";
    const projectName = "Your Project Name"; // Replace with actual project name
    const deliveryTime = 'خلال 24 ساعة';
    const orderLink = `https://${keys.myAPIURL}/manager/order?no=${orderNo}`;

    console.log("orderLink"+ orderLink)

    // Call the sendWhatsAppMessage function
    const send2Response = await sendWhatsAppMessage({
      orderNo,
      CustomerPhone,
      totalBill,
      projectName,
      deliveryTime,
      orderLink,
    });

    // Check if the message was sent successfully
    if (send2Response.success) {
     // console.log('WhatsApp message sent successfully:', send2Response.data);
      res.status(200).send('WhatsApp message sent successfully.');
    } else {
      console.error('Error sending WhatsApp message:', send2Response.error);
      res.status(500).send('Failed to send WhatsApp message.');
    }
  } catch (error) {
    console.error('Error in /test-send-whatsapp route:', error.message);
    res.status(500).send('Internal server error.');
  }
});



router.get('/test-whatsapp', async (req, res) => {
  try {
    const ACCESS_TOKEN = 'EAAW2ewCJWu0BO6iZBOyrhgaouPF3KLaT1ybcZCIEUaxsPjUMp0dn9FGC7beiD8cTZCJ2P8fiBjQz9z2iGYjyxjZBBr8t48fHoxBkpS3fGPMhm04YZCuVQiFUzq0B5ZBwJX1j8CXPRAJd0sUOLwhEq6rr27rYlzzIc3Ca4D3fYGt3PCPHNsqy24cJyCO2JsvFXhhbiMzQfkELYYQg46GAytZA2nbikSkMixNbFeY2yB5';
    const PHONE_NUMBER_ID = '516336674889791';
    const RECIPIENT_PHONE_NUMBER = '+96555559294'; // Replace with recipient phone number
    const API_URL = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

    const messageData = {
      messaging_product: 'whatsapp',
      to: RECIPIENT_PHONE_NUMBER,
      type: 'template',
      template: {
        name: 'confirm_order_', // Use the exact name of your template
        language: {
          code: 'ar', // Language code for Arabic
        },
        components: [
          {
            type: 'header', // Include the header component, no parameters needed for the pre-uploaded image
            parameters: [
              {
                type: 'image',
                image: {
                  link: 'https://arabatapp.replit.app/img/banner_munasabat.jpeg', // Replace with your image link
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: '33' }, // Replace with the actual value for {{1}}
              { type: 'text', text: '3' },  // Replace with the actual value for {{2}}
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: 'https://itcstore.net/order/33' }, // Replace with your dynamic URL
            ],
          },
        ],
      },
    };

    const response = await axios.post(API_URL, messageData, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Message sent successfully:', response.data);
    res.status(200).send('WhatsApp message sent successfully.');
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
    res.status(500).send('Error sending WhatsApp message.');
  }
});



// Reusable function to send emails
async function sendEmail({ merchant, orderNo, baseUrl }) {
  try {
    // Generate notification text and order link inside this function
    const notificationTextAr = merchant.notifications.newOrder.merchantNotification.text.ar
      .replace('[[store_name]]', merchant.projectName)
      .replace('[[order_number]]', orderNo);

    const notificationTextEn = merchant.notifications.newOrder.merchantNotification.text.en
      .replace('[[store_name]]', merchant.projectName)
      .replace('[[order_number]]', orderNo);

    const orderLink = `https://${baseUrl}/manager/order?no=${orderNo}`;

    // Email configuration
    const output = `
      <div style="color: #000000;">
        <h2 style="text-align: center;">New Order: #${orderNo}</h2>
        <p style="direction: rtl; display: block; color: #000000;">${notificationTextAr}</p>
        <p style="color: #000000;">${notificationTextEn}</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'eng.dugaim@gmail.com',
        pass: 'kioxedtstdtierbv', // Use your app password here
      },
    });

    const recipients = [merchant.email, ...merchant.emailRecipients].join(',');
    const mailOptions = {
      from: `"${merchant.projectName} | New Order No: ${orderNo}" <eng.dugaim@gmail.com>`,
      to: recipients,
      subject: `New Order: #${orderNo}`,
      html: output,
    };

    // Send email
    const emailResponse = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', emailResponse.response);
    return { success: true, data: emailResponse.response };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}


// Main route .....
router.get('/send', async function (req, res) {
  try {
    const { orderNo, merchantId, myWebsite, CustomerPhone, totalBill } = req.query;

    console.log(keys.myAPIURL);

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).send('Merchant not found');
    }

    // const emailResponse = await sendEmail({
    //   merchant,
    //   orderNo,
    //   baseUrl: keys.myAPIURL,
    // });

    // if (!emailResponse.success) {
    //   return res.status(500).send('Error sending email: ' + emailResponse.error);
    // }

    const send2Response = await sendWhatsAppMessage({
      orderNo: "1",
      CustomerPhone:"55559294",
      totalBill: "2",
      projectName: merchant.projectName,
      deliveryTime: 'خلال 24 ساعة',
      orderLink: `https://${keys.myAPIURL}/manager/order?no=${orderNo}`,
    });

    if (send2Response.success) {
      res.status(200).send('Email and WhatsApp messages sent successfully.');
    } else {
      res.status(500).send('Email sent but WhatsApp message failed: ' + send2Response.error);
    }
  } catch (error) {
    console.error('Error occurred:', error.message);
    res.status(500).send('Server error: ' + error.message);
  }
});









router.get('/test-whatsapp', async (req, res) => {
  try {
    const ACCESS_TOKEN = 'EAAW2ewCJWu0BO6iZBOyrhgaouPF3KLaT1ybcZCIEUaxsPjUMp0dn9FGC7beiD8cTZCJ2P8fiBjQz9z2iGYjyxjZBBr8t48fHoxBkpS3fGPMhm04YZCuVQiFUzq0B5ZBwJX1j8CXPRAJd0sUOLwhEq6rr27rYlzzIc3Ca4D3fYGt3PCPHNsqy24cJyCO2JsvFXhhbiMzQfkELYYQg46GAytZA2nbikSkMixNbFeY2yB5';
    const PHONE_NUMBER_ID = '516336674889791';
    const RECIPIENT_PHONE_NUMBER = '+96555559294'; // Replace with recipient phone number
    const API_URL = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

    const messageData = {
      messaging_product: 'whatsapp',
      to: RECIPIENT_PHONE_NUMBER,
      type: 'template',
      template: {
        name: 'confirm_order_', // Use the exact name of your template
        language: {
          code: 'ar', // Language code for Arabic
        },
        components: [
          {
            type: 'header', // Include the header component, no parameters needed for the pre-uploaded image
            parameters: [
              {
                type: 'image',
                image: {
                  link: 'https://arabatapp.replit.app/img/banner_munasabat.jpeg', // Replace with your image link
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: '33' }, // Replace with the actual value for {{1}}
              { type: 'text', text: '3' },  // Replace with the actual value for {{2}}
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: 'https://itcstore.net/order/33' }, // Replace with your dynamic URL
            ],
          },
        ],
      },
    };

    const response = await axios.post(API_URL, messageData, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Message sent successfully:', response.data);
    res.status(200).send('WhatsApp message sent successfully.');
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
    res.status(500).send('Error sending WhatsApp message.');
  }
});








router.get('/ordersToday/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));


  console.log("merchantId: ", merchantId)
  
  try {
    // Fetch today's orders
    const orders = await Order.find({
      merchant: merchantId,
      time: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ _id: -1 });

    // Fetch shop balance
    const balance = await Balance.findOne({ merchant: merchantId });
    const merchant = await Merchant.findById(merchantId);

    
    console.log("merchant: ", merchant)
    console.log("merchant.balance: ", merchant.balances)

    res.status(200).json({
      success: true,
      orders,
      balances:merchant.balances,
      shopBalance: balance?.shopBalance || 0
    });
  } catch (error) {
    console.error('Error fetching today\'s orders or balance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});







// Get order by ID
router.get('/order/:id', async (req, res) => {
  try {
    // console.log("Reached /api/orders/:id")
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});





















router.post("/shiftStock", async (req, res) => {
  try {
    const { productId, variantId, quantity, direction } = req.body;

    // Log the data received in the request
    // console.log('Shift Stock Data:', req.body);

    // Validate required fields
    if (!productId || !variantId || !quantity || !direction) {
      return res.status(400).json({ message: 'All fields are required: productId, variantId, quantity, and direction.' });
    }

    // Find the specific variant directly
    const product = await Product.findOne({ _id: productId, 'variations._id': variantId }, { 'variations.$': 1 });

    if (!product) {
      return res.status(404).json({ message: 'Product or variant not found' });
    }

    const variant = product.variations[0];

    // Log the found variant
    // console.log('Found Variant:', variant);

    // Update the stock quantities based on direction
    if (direction === 'toWarehouse') {
      // Shift stock from available quantity to warehouse stock
      await Product.updateOne(
        { _id: productId, 'variations._id': variantId },
        {
          $inc: {
            'variations.$.v_warehouse_stock': quantity,
            'variations.$.v_available_quantity': -quantity
          }
        }
      );
    } else if (direction === 'toShop') {
      // Shift stock from warehouse stock to available quantity
      await Product.updateOne(
        { _id: productId, 'variations._id': variantId },
        {
          $inc: {
            'variations.$.v_warehouse_stock': -quantity,
            'variations.$.v_available_quantity': quantity
          }
        }
      );
    } else {
      return res.status(400).json({ message: 'Invalid direction. Must be "toWarehouse" or "toShop".' });
    }

    // Send a success response
    res.status(200).json({ message: 'Stock shifted successfully' });
  } catch (error) {
    // Handle any errors that occur
    console.error('Error shifting stock:', error);
    res.status(500).json({ message: 'Error shifting stock', error: error.message });
  }
});


router.get('/products/number/:productNumber', (req, res) => {
  const productNumber = req.params.productNumber;
  Product.findOne({ product_number: productNumber })
    .then(product => {
      if (!product) {
        return res.status(404).send({ message: 'Product not found' });
      }
      res.send({ product });
    })
    .catch(error => res.status(500).send({ message: 'Error fetching product', error }));
});





router.get('/products/number/:productNumber/:YOUR_MERCHANT_ID', (req, res) => {
  // console.log('Received request for product with number:', req.params.productNumber);
  // console.log('Merchant ID:', req.params.YOUR_MERCHANT_ID);
  const productNumber = req.params.productNumber;
  const YOUR_MERCHANT_ID = req.params.YOUR_MERCHANT_ID;
  
  Product.findOne({ product_number: productNumber, merchant: YOUR_MERCHANT_ID  })
    .then(product => {
      if (!product) {
        return res.status(404).send({ message: 'Product not found' });
      }
      // console.log('Product found:', product);
      res.send({ product });
      
    })
    .catch(error => res.status(500).send({ message: 'Error fetching product', error }));
});

router.get('/products/barcode/:barcode/:YOUR_MERCHANT_ID', (req, res) => {
  const barcode = req.params.barcode;
  const YOUR_MERCHANT_ID = req.params.YOUR_MERCHANT_ID;

  console.log('Barcode:', barcode);
  console.log('YOUR_MERCHANT_ID:', YOUR_MERCHANT_ID);
  
  Product.findOne({ 
    barcodes: barcode,
    merchant: YOUR_MERCHANT_ID 
  })
    .then(product => {
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.status(200).json({ success: true, product });
    })
    .catch(error => {
      console.error('Status: 500 - Error fetching product:', error);
      res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
    });
});




router.get('/products/id/:productId', (req, res) => {
  const productId = req.params.productId;
  Product.findById(productId)  // Use findById instead of findOne with _id
    .then(product => {
      if (!product) {
        return res.status(404).send({ message: 'Product not found' });
      }
      res.send({ product });
    })
    .catch(error => res.status(500).send({ message: 'Error fetching product', error }));
});






router.get('/offers/number/:offerNumber', async (req, res) => {
  const offerNumber = req.params.offerNumber;

  try {
    console.log("Offer Number: ", offerNumber);

    // Find the offer by offer_number
    const offer = await Offer.findOne({ offer_number: offerNumber });

    if (!offer) {
      return res.status(404).send({ message: 'Offer not found' });
    }

    console.log("Offer found: ", offer);

    // Find the product related to this offer using offer.product
    const product = await Product.findById(offer.product);

    if (!product) {
      return res.status(404).send({ message: 'Product not found for this offer' });
    }

    console.log("Product found: ", product);

    // Send both offer and related product data in the response
    res.send({ offer, product });

  } catch (error) {
    console.error('Error fetching offer or product:', error);
    res.status(500).send({ message: 'Error fetching offer or product', error });
  }
});



// GET all offers for a specific merchant
router.get('/offers/:merchantId', async (req, res) => {
  const { merchantId } = req.params;

  try {
    const offers = await Offer.find({ merchant: merchantId });
    res.json({ offers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});


router.get('/purchase/:merchantId', async (req, res) => {
  const { merchantId } = req.params;

  // console.log("/purchase/")

  try {
    const purchases = await Purchase.find({ merchant: merchantId }).sort({ _id: -1 });
    res.status(200).json({ success: true, purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


router.get('/transactions/:merchantId', async (req, res) => { 
  const { merchantId } = req.params;

  try {
    console.log("transactions")
    // Fetch all transactions for the given merchant
    const transactions = await CashTransaction.find({ merchant: merchantId }).sort({ _id: -1 });

    // Fetch balances for the merchant
    const balance = await Balance.findOne({ merchant: merchantId });

    res.status(200).json({
      success: true,
      transactions,
      shopBalance: balance?.shopBalance || 0,
      bankBalance: balance?.bankBalance || 0
    });
  } catch (error) {
    console.error('Error fetching transactions or balances:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



// Route to handle subuser login
router.post("/subuser/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Received login request with email:", email);
    console.log("Received password:", password);

    let subuser;

    // Check if email or phone is provided
    if (!email || !password) {
     // console.log("Email or password missing in request body.");
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Fetch the subuser by email
    subuser = await Subuser.findOne({ email: email.toLowerCase() });
    if (!subuser) {
     // console.log("Subuser not found for email:", email);
      return res
        .status(401)
        .json({ message: "Login failed: Subuser not found." });
    }

    console.log("Subuser found:", {
      id: subuser._id,
      email: subuser.email,
      role: subuser.role,
    });

    // Check if the provided password is correct
    console.log("Comparing provided password with stored hashed password...");
    const isMatch = await bcrypt.compare(password, subuser.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
     // console.log("Password does not match for email:", email);
      return res
        .status(401)
        .json({ message: "Login failed: Incorrect password." });
    }

    // Generate a JWT token
    console.log("Generating JWT token for subuser...");
    const token = jwt.sign(
      { id: subuser._id, role: subuser.role },
      keys.jwtSecret,
      {
        expiresIn: "1h",
      }
    );

    console.log("JWT token generated successfully for subuser:", subuser._id);

    // Respond with subuser data and token
    console.log("Login successful, sending response...");
    res.status(200).json({
      success: true,
      message: "Login successful 01",
      token: token,
      subuser: {
        id: subuser._id,
        name: subuser.name,
        email: subuser.email,
        role: subuser.role,
        phone: subuser.phone,
        merchant: subuser.merchant,
      },
    });
  } catch (error) {
    console.error("Error during subuser login:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});


router.post('/add-category/:merchantId', upload.single('category_img'), async (req, res) => {
  var { ArabicName, EnglishName, discountPerc, sort, status } = req.body;
  // Modify the path by removing the 'public/' prefix
  const imgsrc = req.file ? req.file.path.replace('public', '') : ''; // Remove 'public/' from the path

  const merchantId = req.params.merchantId;


  // Ensure sort is 0 if it is empty
  if (sort === "") {
      sort = 0;
  }
  if (discountPerc === "") {
        discountPerc = 0;
  }


  try {
    const newCategory = new Category({
      ArabicName,
      EnglishName,
      imgsrc, // Use the modified path
      discountPerc,
      sort,
      status: status === 'on',
      merchant: merchantId  // Adding the Merchant ID to the Category
    });

    await newCategory.save();
    res.redirect('/manager/category');
  } catch (error) {
    console.error('Failed to add category', error);
    res.status(500).send('Error saving category');
  }
});










// 📡 Get balance details by ID
router.get('/balances/:balanceId', async (req, res) => {
  const { balanceId } = req.params;

  if (!balanceId) {
    return res.status(400).json({ success: false, message: "Balance ID is required." });
  }

  try {
    console.log(`🔍 Searching for balance with ID: ${balanceId}`);
    const balance = await Balance.findById(balanceId);

    if (!balance) {
      console.warn(`⚠️ No balance found for ID: ${balanceId}`);
      return res.status(404).json({ success: false, message: "Balance not found." });
    }

    res.status(200).json({ success: true, balance });
  } catch (error) {
    console.error("❌ Error fetching balance details:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});




// ✅ Fetch transactions based on balance ID
router.get('/cashTransactions/:balanceId', async (req, res) => {
  const { balanceId } = req.params;

  if (!balanceId) {
    return res.status(400).json({ success: false, message: 'Balance ID is required' });
  }

  try {
    console.log(`📡 Fetching transactions for balance ID: ${balanceId}`);

    // ✅ Find transactions related to this balance ID
    const transactions = await CashTransaction.find({ balance_id: balanceId })
      .sort({ date: -1 }) // Sort by most recent transactions first
      .lean();

    // ✅ Get balance details from the merchant schema
    const merchant = await Merchant.findOne({ "balances._id": balanceId }, { "balances.$": 1 });

    if (!merchant || merchant.balances.length === 0) {
      return res.status(404).json({ success: false, message: 'Balance not found' });
    }

    const balanceDetails = merchant.balances[0];

    res.status(200).json({
      success: true,
      balance: {
        _id: balanceDetails._id,
        name: balanceDetails.name,
        balance: balanceDetails.balance,
        createdAt: balanceDetails.createdAt,
        updatedAt: balanceDetails.updatedAt
      },
      transactions
    });
  } catch (error) {
    console.error('❌ Error fetching balance transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



// ✅ Route: Process Cash Transaction (Manual Change)
router.post(`/balances/manual-change/:merchantId`, async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { amount, description, type, balanceId, method, method_name } = req.body;

    console.log("req.body: ", req.body);

    if (!amount || !description || !type || !balanceId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // 1️⃣ Fetch Merchant and Specific Balance
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found." });
    }

    const balance = merchant.balances.find(b => b._id.toString() === balanceId);
    if (!balance) {
      return res.status(404).json({ success: false, message: "Balance not found for merchant." });
    }

    // 2️⃣ Calculate New Balance
    const balanceBefore = balance.balance;
    const balanceAfter = type === "inflow" ? balanceBefore + amount : balanceBefore - amount;

    // 3️⃣ Create Cash Transaction Object
    const cashTransaction = new CashTransaction({
      merchant: merchantId,
      amount,
      method_id: method || null,
      method_name: method_name || "يدوي",
      balance_id: balance._id,
      balance_name: balance.name,
      type,
      status: "completed",
      balanceBefore,
      balanceAfter,
      description: `${method_name || 'تعديل يدوي'} - ${description}`
    });

    // 4️⃣ Save Transaction
    await cashTransaction.save();

    // 5️⃣ Update Merchant Balance
    balance.balance = balanceAfter;
    await merchant.save();

    return res.status(200).json({ success: true, message: "Transaction processed successfully", cashTransaction });

  } catch (error) {
    console.error("❌ Error Processing Transaction:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});





/**
 * Get Start & End of Day Timestamps
 */

// const getDayRange = () => {
//     const startTime = new Date();
//     startTime.setDate(startTime.getDate() - 1);
//     startTime.setHours(0, 0, 0, 0);
//     const endTime = new Date(startTime);
//     endTime.setHours(23, 59, 59, 999);
//     return { startOfDay: startTime, endOfDay: endTime };
// };



/**
 * Get Start & End of Day Timestamps
 */
// const getDayRange = () => {
//     const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
//     const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
//     return { startOfDay, endOfDay };
// };


const getDayRange = () => {
    const now = new Date();

    // Get UTC time
    const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

    // Convert to Kuwait time (UTC+3)
    const kuwaitOffset = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const kuwaitNow = new Date(utcNow.getTime() + kuwaitOffset);

    // Set the start and end of the day in Kuwait time
    const startOfDay = new Date(kuwaitNow.setHours(0, 0, 0, 0));
    const endOfDay = new Date(kuwaitNow.setHours(23, 59, 59, 999));

    // Convert back to UTC for correct query filtering
    return {
        startOfDay: new Date(startOfDay.getTime() - kuwaitOffset),
        endOfDay: new Date(endOfDay.getTime() - kuwaitOffset)
    };
};


/**
 * Fetch Orders by Status
 */
const fetchOrders = async (merchantId, startOfDay, endOfDay) => {
    return await Order.find({
        merchant: merchantId,
        time: { $gte: startOfDay, $lte: endOfDay }
    }).select('_id order_number totalCost time items paymentMethod status');
};

/**
 * Calculate Sales, Refunds, Payment Breakdown, and Order Status Breakdown
 */
const calculateSalesAndPayments = (orders) => {
    let totalSales = 0;
    let refundedAmount = 0;
    let paymentBreakdown = { cash: 0, card: 0, online: 0 };
    let orderStatusBreakdown = {
        new: { count: 0, total: 0 },
        completed: { count: 0, total: 0 },
        canceled: { count: 0, total: 0 },
        returned: { count: 0, total: 0 }
    };

    orders = orders.map(order => {
        const orderTotal = order.totalCost || order.items.reduce((acc, item) =>
            acc + ((item.price || 0) * (item.quantity || 0)), 0
        );

        // ✅ Only add to total sales if order is completed
        if (order.status === 'completed') {
            totalSales += orderTotal;
        }

        // ✅ Add returned orders to refundedAmount
        if (order.status === 'returned') {
            refundedAmount += orderTotal;
        }

        // Track order status breakdown
        if (orderStatusBreakdown[order.status]) {
            orderStatusBreakdown[order.status].count += 1;
            orderStatusBreakdown[order.status].total += orderTotal;
        }

        // Track payment methods
        if (order.paymentMethod) {
            paymentBreakdown[order.paymentMethod] = (paymentBreakdown[order.paymentMethod] || 0) + 1;
        }

        return { ...order.toObject(), orderTotal: parseFloat(orderTotal.toFixed(3)) };
    });

    return { totalSales, refundedAmount, paymentBreakdown, orderStatusBreakdown, orders };
};

/**
 * Fetch Top Selling Products
 */
const fetchTopProducts = async (merchantId, startOfDay, endOfDay) => {
    return await Order.aggregate([
        {
            $match: {
                merchant: new mongoose.Types.ObjectId(merchantId),
                time: { $gte: startOfDay, $lte: endOfDay },
                status: 'completed'
            }
        },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.productId",
                name: { $first: "$items.productName" },
                quantity: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
    ]);
};

/**
 * Fetch Recent Transactions
 */
const fetchTransactions = async (merchantId, startOfDay, endOfDay) => {
    return await CashTransaction.find({
        merchant: merchantId,
        date: { $gte: startOfDay, $lte: endOfDay }
    })
        .sort({ date: -1 })
        
        .select('_id amount type date method_name  balance_name ');
};

/**
 * Fetch Payment Methods from Merchant
 */
const fetchPaymentMethods = async (merchantId) => {
    const merchant = await Merchant.findById(merchantId).select('paymentMethods');
    return merchant ? merchant.paymentMethods.map(method => ({
        id: method._id,
        name: method.name
    })) : [];
};

/**
 * Fetch Transactions by Payment Method (Corrected Calculation)
 */
const fetchTransactionsByPaymentMethod = async (merchantId, startOfDay, endOfDay) => {
    const transactions = await CashTransaction.aggregate([
        {
            $match: {
                merchant: new mongoose.Types.ObjectId(merchantId),
                date: { $gte: startOfDay, $lte: endOfDay },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: "$method_id",
                totalIn: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "inflow"] }, "$amount", 0]
                    }
                }, // Sum of inflows
                totalOut: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "outflow"] }, "$amount", 0]
                    }
                }, // Sum of outflows
                methodName: { $first: "$method_name" }
            }
        }
    ]);

    console.log("transactions", transactions)

    return transactions.reduce((acc, transaction) => {
        const totalAmount = transaction.totalIn - transaction.totalOut;
        // Use 'manual' as key for transactions with null _id
        const key = transaction._id ? transaction._id.toString() : 'manual';
        acc[key] = {
            totalAmount,
            totalIn: transaction.totalIn,
            totalOut: transaction.totalOut,
            methodName: transaction.methodName
        };
        return acc;
    }, {});
};


const fetchPurchases = async (merchantId, startOfDay, endOfDay) => {
    return await Purchase.find({
        merchant: merchantId,
        time: { $gte: startOfDay, $lte: endOfDay }
    }).select('_id purchase_number totalCost time items status vendorName paymentStatus receivingStatus'); // ✅ Added paymentStatus and receivingStatus
};


/**
 * 📌 Route: Generate Daily Report (Updated to Include Purchases)
 */
router.get('/reports/daily/:merchantId', async (req, res) => {
    const { merchantId } = req.params;
    const { date } = req.query;
    
    const dateRange = getKuwaitDateRange(date);
    const startOfDay = dateRange.startOfDay;
    const endOfDay = dateRange.endOfDay;

    console.log("Merchant ID:", merchantId);
    console.log("Start of Day:", startOfDay.toISOString());
    console.log("End of Day:", endOfDay.toISOString());

    try {
        // ✅ Fetch Data
        const orders = await fetchOrders(merchantId, startOfDay, endOfDay);
        const purchases = await fetchPurchases(merchantId, startOfDay, endOfDay); // ✅ Added purchases

        const { totalSales, refundedAmount, paymentBreakdown, orderStatusBreakdown, orders: processedOrders } =
            calculateSalesAndPayments(orders);

        const netSales = totalSales - refundedAmount;
        const orderCount = processedOrders.length;
        const averageOrderValue = orderCount > 0 ? netSales / orderCount : 0;
        const topProducts = await fetchTopProducts(merchantId, startOfDay, endOfDay);
        const transactions = await fetchTransactions(merchantId, startOfDay, endOfDay);
        const paymentMethods = await fetchPaymentMethods(merchantId);
        const transactionsByPaymentMethod = await fetchTransactionsByPaymentMethod(merchantId, startOfDay, endOfDay);

        // ✅ Calculate Inflow & Outflow Totals
        let totalInflow = 0;
        let totalOutflow = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'inflow') {
                totalInflow += transaction.amount;
            } else if (transaction.type === 'outflow') {
                totalOutflow += transaction.amount;
            }
        });

        const finalBalance = totalInflow - totalOutflow;

        // ✅ Merge Payment Methods with Transactions
        const paymentMethodSummary = paymentMethods.map(method => ({
            id: method.id,
            name: method.name,
            totalIn: transactionsByPaymentMethod[method.id.toString()]?.totalIn || 0,
            totalOut: transactionsByPaymentMethod[method.id.toString()]?.totalOut || 0,
            totalAmount: (transactionsByPaymentMethod[method.id.toString()]?.totalIn || 0) - 
                         (transactionsByPaymentMethod[method.id.toString()]?.totalOut || 0)
        }));

        // ✅ Send Response
        res.status(200).json({
            success: true,
            reports: {
                totalSales,
                refundedAmount,
                netSales,
                orderCount,
                averageOrderValue,
                paymentBreakdown,
                orderStatusBreakdown,
                orders: processedOrders,
                purchases, // ✅ Added purchases data to response
                topProducts,
                transactions,
                paymentMethodSummary,
                totalInflow,
                totalOutflow,
                finalBalance
            }
        });

    } catch (error) {
        console.error("Error fetching daily reports:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


/**
 * 📌 Route: Generate Daily Small Report (Minimal Data)
 */
// Get Kuwait time range for specific date or today
const getKuwaitDateRange = (date = null) => {
    const kuwaitOffset = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const requestedDate = date ? new Date(date) : new Date();
    
    // Set start of day in Kuwait time
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set end of day in Kuwait time
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
        startOfDay: new Date(startOfDay.getTime() - kuwaitOffset),
        endOfDay: new Date(endOfDay.getTime() - kuwaitOffset)
    };
};

router.get('/reports/dailySmall/:merchantId', async (req, res) => {
    const { merchantId } = req.params;
    const { date } = req.query;
    
    const dateRange = getKuwaitDateRange(date);
    const startOfDay = dateRange.startOfDay;  
    const endOfDay = dateRange.endOfDay;

    console.log("req.params:", JSON.stringify(req.params, null, 2))
    console.log("req.query:", JSON.stringify(req.query, null, 2))

    console.log("Merchant ID:", merchantId);
    console.log("Start of Day:", startOfDay.toISOString());
    console.log("End of Day:", endOfDay.toISOString());

    try {
        // ✅ Fetch Orders & Calculate Sales
        const orders = await fetchOrders(merchantId, startOfDay, endOfDay);
        const { totalSales, refundedAmount, paymentBreakdown, orderStatusBreakdown } =
            calculateSalesAndPayments(orders);

        const netSales = totalSales - refundedAmount;

        // ✅ Fetch Transactions
        const transactions = await fetchTransactions(merchantId, startOfDay, endOfDay);
        const paymentMethods = await fetchPaymentMethods(merchantId);
        const transactionsByPaymentMethod = await fetchTransactionsByPaymentMethod(merchantId, startOfDay, endOfDay);

        console.log("transactionsByPaymentMethod", transactionsByPaymentMethod);

        // ✅ Calculate Inflow & Outflow Totals
        let totalInflow = 0;
        let totalOutflow = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'inflow') {
                totalInflow += transaction.amount;
            } else if (transaction.type === 'outflow') {
                totalOutflow += transaction.amount;
            }
        });

        const finalBalance = totalInflow - totalOutflow;

        // ✅ Merge Payment Methods with Transactions
        const paymentMethodSummary = paymentMethods.map(method => ({
            id: method.id,
            name: method.name,
            totalIn: transactionsByPaymentMethod[method.id.toString()]?.totalIn || 0,
            totalOut: transactionsByPaymentMethod[method.id.toString()]?.totalOut || 0,
            totalAmount: (transactionsByPaymentMethod[method.id.toString()]?.totalIn || 0) - 
                         (transactionsByPaymentMethod[method.id.toString()]?.totalOut || 0)
        }));

        // ✅ Send Response (Minimal Data)
        res.status(200).json({
            success: true,
            reports: {
                totalSales,
                refundedAmount,
                netSales,
                paymentBreakdown,
                orderStatusBreakdown,
                transactions,
                paymentMethodSummary,
                totalInflow,
                totalOutflow,
                finalBalance
            }
        });

    } catch (error) {
        console.error("Error fetching daily small reports:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});




router.get('/server-time', async (req, res) => {
    try {
        // ✅ Get current server time
        const serverTime = new Date();

        // ✅ Fetch the latest transaction timestamp from the database
        const latestTransaction = await CashTransaction.findOne()
            .sort({ date: -1 }) // Sort by latest date
            .select('date');

        const dbTime = latestTransaction ? latestTransaction.date : null;

        res.status(200).json({
            success: true,
            serverTime: serverTime.toISOString(),
            dbTime: dbTime ? dbTime.toISOString() : "No transactions found"
        });
    } catch (error) {
        console.error("Error fetching server time:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});






router.get("/search", async (req, res) => {
  let { query, merchantId, limit } = req.query;

  if (!query || !merchantId) {
    return res.status(400).json({ error: "Query and merchantId are required" });
  }

  try {
    query = decodeURIComponent(query.trim()); // Ensure proper encoding for Arabic and English text
    const isNumberQuery = !isNaN(query); // Check if query is a number
    const resultLimit = Math.min(parseInt(limit) || 8, 10); // Lower limit for faster response

    // Convert merchantId to ObjectId if necessary
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

    let searchQuery = {
      merchant: merchantObjectId, // Match merchant first to reduce search scope
      ...(isNumberQuery
        ? { product_number: parseInt(query) } // Exact match for numbers
        : {
            $or: [
              { product_name_en: { $regex: query, $options: "i" } }, // Case-insensitive English search
              { product_name_ar: { $regex: query, $options: "i" } }, // Case-insensitive Arabic search
            ],
          }),
    };

    const products = await Product.find(searchQuery, {
      product_number: 1,
        product_name_en: 1,
        product_name_ar: 1,
        product_image: 1,
        sale_price: 1,
        purchase_price: 1,
        Stock: 1,
        latest_FIFO: 1,
        variations: 1,
        order_command: 1,
        category: 1 // Fetch the category field
    }).limit(resultLimit);

    res.json(products);
  } catch (error) {
    console.error("MongoDB Search Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
