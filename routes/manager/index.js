var express = require("express");
var router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const _ = require('lodash'); // Ensure lodash is installed



var Merchant = require("../../models/merchant");
var Category = require("../../models/category");
var Product = require("../../models/product");
var Branch = require("../../models/branch");
const Customer = require('../../models/customer');
const Order = require('../../models/order');
const Offer = require('../../models/offer');
const CashTransaction = require('../../models/CashTransaction'); // Import the CashTransaction model
const Balance = require('../../models/Balance'); // Adjust path to your Balance model
const Subuser = require('../../models/Subuser');


var TransferRequest = require("../../models/transferRequest");
var User = require("../../models/user");
var City = require("../../models/city");
var mid = require("../../middleware");
const keys = require("../../config/keys");
const fs = require("fs");
const ExcelJS = require('exceljs');
const { JSDOM } = require('jsdom');

const sharp = require('sharp');
const PImage = require('pureimage');
const mongoose = require('mongoose');




var nodemailer = require("nodemailer");








// Set up storageLocal engine
const storageLocal = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/img/upload/'); // Save files to this directory
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Unique filename
  }
});



const upload = multer({
  storage: storageLocal,
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




const { Storage } = require('@google-cloud/storage');
const ImageController = require('../../controllers/imageController'); // Ensure this path is correct

const storageGoogleCloud = new Storage({
  projectId: 'arabatapp',
  keyFilename: path.join(__dirname, '../../config/arabatapp-921b727eef5f.json')
});
const imageController = new ImageController(storageGoogleCloud);

const multerStorageGoogleCloud = multer.memoryStorage();
const uploadGoogleCloud = multer({ storage: multerStorageGoogleCloud });




router.post('/add-category', uploadGoogleCloud.single('category_img'), async (req, res) => {
  var { ArabicName, EnglishName, discountPerc, sort, status } = req.body;
  
  let imgsrc = "";

  try {
    const folder = req.session.merchant.merchant_number;

    if (!folder) {
        
      return res.status(500).send('Merchant number is undefined');
    }

    const subfolder = "category";



    // Pass folder and subfolder to the upload function
    const response = await imageController.uploadGoogleCloudAndConvertToWebP(req, res, folder, subfolder);
    console.log('Response from image upload:', response);
    imgsrc = `${folder}/${subfolder}/${response.fileName}`;

    const merchantId = req.session.merchant.id; // Assuming merchant ID is stored in the session

    // Ensure sort is 0 if it is empty
    if (sort === "") {
        sort = 0;
    }
    if (discountPerc === "") {
          discountPerc = 0;
    }

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
    console.error('Error uploading image or saving category:', error);
    res.status(500).send('Error uploading image or saving category');
  }
});



router.get("/category", mid.requiresLogin,  async function (req, res, next) {
  

  try {

    console.log('req.session.merchant:', req.session.merchant);
    const merchantId = req.session.merchant.id;
    const categories = await Category.find({ merchant: merchantId });
    return res.render("manager/category", {
      title: "Category",
      categories: categories // Pass the categories to the Pug template
    });
  } catch (error) {
    console.error('Error retrieving categories:', error);
    return res.status(500).send('Error retrieving categories');
  }
});


// Set up storage engine for saving images in 'public/img/test/'
const storagetest = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/img/test/'); // Save files to this directory
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const uploadtest = multer({ storage: storagetest });







router.post('/overview', upload.fields([
  { name: 'ico', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'logo_additional', maxCount: 1 },
  { name: 'background', maxCount: 1 },
  { name: 'ico_secondary', maxCount: 1 },
]), async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Retrieve the merchant ID from the session
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Update the `images` field with the uploaded file paths
    if (req.files.ico) merchant.images.ico = `/img/upload/${req.files.ico[0].filename}`;
    if (req.files.logo) merchant.images.logo = `/img/upload/${req.files.logo[0].filename}`;
    if (req.files.logo_additional) merchant.images.logoAdditional = `/img/upload/${req.files.logo_additional[0].filename}`;
    if (req.files.background) merchant.images.background = `/img/upload/${req.files.background[0].filename}`;
    if (req.files.ico_secondary) merchant.images.icoSecondary = `/img/upload/${req.files.ico_secondary[0].filename}`;

    await merchant.save();

    res.redirect('/manager/settings'); // Redirect to the settings page after update
  } catch (error) {
    console.error('Error updating merchant images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/invoiceSettings', async (req, res) => {
  const { 
    company_name_ar, 
    company_name_en, 
    invoice_text_en, 
    invoice_text_ar,
    showBrand,
    showWarranty,
    showVariantName
  } = req.body; // Extract form data
  const merchantId = req.session.merchant.id; // Retrieve merchant ID from session

  console.log('Received company_name_ar:', company_name_ar);
  console.log('Received company_name_en:', company_name_en);
  console.log('Received invoice_text_en:', invoice_text_en);
  console.log('Received invoice_text_ar:', invoice_text_ar);

  // Validate form data
  if (!company_name_ar || !company_name_en) {
    console.error('Both company_name_ar and company_name_en are required.');
    return res.status(400).json({ error: 'Both Arabic and English company names are required.' });
  }

  try {
    // Find the merchant
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found.' });
    }

    // Update merchant data
    merchant.companyName = {
      ar: company_name_ar,
      en: company_name_en,
    };
    merchant.invoiceText = {
      en: invoice_text_en || '', // Update invoice text in English
      ar: invoice_text_ar || '', // Update invoice text in Arabic
    };
    merchant.invoiceOptions = {
      showBrand: showBrand === 'on',
      showWarranty: showWarranty === 'on',
      showVariantName: showVariantName === 'on'
    };

    // Save changes
    await merchant.save();

    res.redirect('/manager/settings');
  } catch (error) {
    console.error('Failed to update invoice settings:', error);
    res.status(500).send('Error updating invoice settings');
  }
});




    



// Handle the image upload and product creation
router.post('/createProductAndUploadImages', uploadtest.array('product_images', 10), async (req, res) => {
  try {
    // Access the uploaded files via req.files
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Extract file paths to save in the product_images array
    const filePaths = files.map(file => `/img/test/${file.filename}`);

    // Create a new product with the provided details and uploaded images
    const newProduct = new Product({
      // merchant: req.body.merchant || "", // Assuming merchant ID is provided in the request body
      product_name_en: req.body.product_name_en || 0,
      product_name_ar: req.body.product_name_ar || 0,
      // category: req.body.category || "", // Assuming category ID is provided in the request body
      brand: req.body.brand || 0,
      warranty: req.body.warranty || 0,
      description_ar: req.body.description_ar || 0,
      description_en: req.body.description_en || 0,
      sale_price: req.body.sale_price || 0,
      purchase_price: req.body.purchase_price || 0,
      purchase_limit: req.body.purchase_limit || 0,
      barcode: req.body.barcode || 0,
      product_images: filePaths, // Save the image paths in the product_images field
      // Add more fields as necessary
    });

    // Save the new product to the database
    await newProduct.save();

    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Error creating product', details: error.message });
  }
});








// List all subusers
router.get('/subusers', async (req, res) => {
  try {
    const subusers = await Subuser.find({ merchant: req.session.merchant.id });
    res.render("manager/subusers", { subusers });
  } catch (error) {
    res.status(500).send("Error fetching subusers");
  }
});

// Render form to add a new subuser
router.get('/subusers/new', (req, res) => {
  res.render('manager/subuserForm');
});







// Create or Edit a Subuser
router.post('/subusers/:id?', async (req, res) => {
  const { id } = req.params;
  const { username, name, email, phone, password, role } = req.body;
  
  // Convert checkbox values to booleans
  const permissions = {
    cash: req.body['permissions[cash]'] === 'on',
    knet: req.body['permissions[knet]'] === 'on',
    orders: {
      edit: req.body['permissions[orders][edit]'] === 'on',
      create: req.body['permissions[orders][create]'] === 'on'
    },
    categories: {
      edit: req.body['permissions[categories][edit]'] === 'on',
      create: req.body['permissions[categories][create]'] === 'on'
    },
    products: {
      edit: req.body['permissions[products][edit]'] === 'on',
      create: req.body['permissions[products][create]'] === 'on',
      delete: req.body['permissions[products][delete]'] === 'on',
      seeCostPrice: req.body['permissions[products][seeCostPrice]'] === 'on'
    },
    purchaseOrders: {
      manage: req.body['permissions[purchaseOrders][manage]'] === 'on'
    }
  };
  const isActive = req.body.isActive === 'on';

  console.log(' req.body:', req.body);

  try {
    if (id) {
      // Update subuser
      const updateData = {
        username,
        name,
        email,
        phone,
        role,
        isActive: !!isActive, // Convert checkbox value to boolean
        permissions: {
          cash: !!permissions?.cash,
          knet: !!permissions?.knet,
          orders: {
            edit: !!permissions?.orders?.edit,
            create: !!permissions?.orders?.create
          },
          categories: {
            edit: !!permissions?.categories?.edit,
            create: !!permissions?.categories?.create
          },
          products: {
            edit: !!permissions?.products?.edit,
            create: !!permissions?.products?.create,
            delete: !!permissions?.products?.delete,
            seeCostPrice: !!permissions?.products?.seeCostPrice
          },
          purchaseOrders: {
            manage: !!permissions?.purchaseOrders?.manage
          }
        }
      };

      if (password) {
        updateData.password = password; // Password hashing is handled by the model's pre-save middleware
      }

      await Subuser.findByIdAndUpdate(id, updateData, { 
        runValidators: true,
        new: true 
      });
    } else {
      // Create new subuser
      const subuser = new Subuser({
        username,
        name,
        email,
        phone,
        password, // Password hashing is handled by the model's pre-save middleware
        role,
        isActive: !!isActive,
        permissions,
        merchant: req.session.merchant.id,
      });
      await subuser.save();
    }

    res.redirect('/manager/subusers');
  } catch (error) {
    console.error(error);

    let errorMessage = 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.';
    if (error.code === 11000) {
      // Handle duplicate key errors for phone and email
      if (error.keyPattern?.phone) {
        errorMessage = 'رقم الهاتف مستخدم بالفعل لهذا التاجر.';
      } else if (error.keyPattern?.email) {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل لهذا التاجر.';
      }
    }

    // Data to pre-fill the form on error
    const subuserData = { name, email, phone, role, isActive };

    if (id) {
      // For update (edit) failure
      res.status(400).render('manager/subuserForm', {
        subuser: { ...subuserData, _id: id }, // Pass the subuser with the current data
        error: errorMessage,
      });
    } else {
      // For creation failure
      res.status(400).render('manager/subuserForm', {
        subuser: null, // Ensure it's treated as a new creation
        subuserData, // Pass data to pre-fill the form
        error: errorMessage,
      });
    }
  }
});










router.get('/subusers/edit/:id', async (req, res) => {
  try {
    const subuser = await Subuser.findById(req.params.id);
    if (!subuser) {
      return res.status(404).send('Subuser not found');
    }
    res.render('manager/subuserForm', { subuser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




router.post('/subuser/delete', async (req, res) => {
  const { subuserToDeleteID } = req.body;
  const response = { success: false, messages: { success: [], error: [] } };

  try {
    if (!mongoose.Types.ObjectId.isValid(subuserToDeleteID)) {
      response.messages.error.push('المعرف المرسل غير صالح.');
    } else {
      const subuser = await Subuser.findByIdAndDelete(subuserToDeleteID);
      if (!subuser) {
        response.messages.error.push('المستخدم الفرعي غير موجود.');
      } else {
        response.success = true;
        response.messages.success.push(`تم حذف المستخدم الفرعي (${subuser.name}) بنجاح.`);
        response.deletedId = subuserToDeleteID;
      }
    }
  } catch (error) {
    console.error('Error deleting subuser:', error);
    response.messages.error.push('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.');
  }

  res.json(response);
});























router.post('/products', upload.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'product_images', maxCount: 10 }
]), async (req, res) => {
    try {
        // console.log("Received body: ", JSON.stringify(req.body, null, 2));
        // console.log("Received files: ", JSON.stringify(req.files, null, 2));

        const merchantId = req.session.merchant.id;

        const {
            product_number, product_name_en, product_name_ar, category_number, order_command, weight,
            keywords, youtube_video_id, description_ar, description_en,
            sale_price, purchase_price = 0, purchase_limit = 0, barcode, v_original_id = [],
            pdt_discount_type, pdt_discount, Stock = 0, brand, warranty, warehouse_stock = 0, options, standard_sizes,
            v_name_en = [], v_name_ar = [], v_sale_price = [], v_purchase_price = [],
            v_available_quantity = [], v_warehouse_stock = [], v_purchase_limit = [],
            v_barcode = [], v_brand = [], v_warranty = [], v_show = []
        } = req.body;

        // Define change source and context
        const changeSource = 'Manual Adjustment from contol panel /   تعديل يدوي من واجهة التحكم';
        const context = {
          adjustedBy: "Admin / الادمن", // Example: Admin user making the change
          reason: 'Updated product details / تعديل تفاصيل المنتج',
        };

        // Retrieve the existing product
        let product = await Product.findOne({ product_number, merchant: merchantId });

        // Prepare the updated product data
        const productData = {
            product_number,
            product_name_en,
            product_name_ar,
            category_number,
            brand,
            warranty,
            order_command,
            weight,
            keywords,
            youtube_video_id,
            options,
            standard_sizes,
            description_ar,
            description_en,
            sale_price,
            purchase_price,
            purchase_limit,
            warehouse_stock,
            barcode,
            pdt_discount_type,
            pdt_discount,
            Stock,
            merchant: merchantId
        };

        // Handle main product image (single file)
        if (req.files['product_image'] && req.files['product_image'][0]) {
            productData.product_image = req.files['product_image'][0].path.replace('public', '');
        }

        // Handle additional product images (multiple files)
        if (req.files['product_images'] && req.files['product_images'].length > 0) {
            const newImages = req.files['product_images'].map(file => file.path.replace('public', ''));
            
            // If updating an existing product, append to its images instead of replacing
            if (product && product.product_images) {
                productData.product_images = product.product_images.concat(newImages);
            } else {
                productData.product_images = newImages;
            }
        }

        // Handle variations
        let variations = [];
        if (v_name_en.length > 0) {
            variations = v_name_en.map((_, index) => ({
                v_original_id: mongoose.Types.ObjectId.isValid(v_original_id[index]) ? v_original_id[index] : null,
                v_name_en: v_name_en[index] || '',
                v_name_ar: v_name_ar[index] || '',
                v_sale_price: v_sale_price[index] || 0,
                v_purchase_price: v_purchase_price[index] || 0,
                v_available_quantity: v_available_quantity[index] || 0,
                v_show: v_show[index] || true,
                v_warehouse_stock: v_warehouse_stock[index] || 0,
                v_purchase_limit: v_purchase_limit[index] || 0,
                v_barcode: v_barcode[index] || '',
                v_brand: v_brand[index] || '',
                v_warranty: v_warranty[index] || ''
            }));
        }

        if (product) {
            // Update existing product
            Object.assign(product, productData);

            // Set tempLog for context and change source
            product.tempLog = {
                changeSource,
                context,
            };

            // Update variations
            if (variations.length > 0) {
                product.variations = variations.map(newVar => {
                    // Try to find existing variation
                    const existingVar = product.variations.find(oldVar => 
                        oldVar._id.toString() === (newVar.v_original_id || '').toString()
                    );

                    if (existingVar) {
                        return {
                            ...newVar,
                            _id: existingVar._id,
                            v_original_id: existingVar._id
                        };
                    } else {
                        const newId = new mongoose.Types.ObjectId();
                        return {
                            ...newVar,
                            _id: newId,
                            v_original_id: newId
                        };
                    }
                });
            } else {
                // Clear variations if none are submitted
                product.variations = [];
            }

            // Only update images if they are provided
            if (productData.product_image) {
                product.product_image = productData.product_image;
            }
            if (productData.product_images) {
                product.product_images = productData.product_images;
            }
        } else {
            // Create a new product if it doesn't exist
            const variationsWithIds = variations.map(variation => {
                const newId = new mongoose.Types.ObjectId();
                return {
                    ...variation,
                    _id: newId,
                    v_original_id: newId
                };
            });
            
            product = new Product({
                ...productData,
                variations: variationsWithIds,
                tempLog: {
                    changeSource,
                    context,
                },
            });
        }

        // Save the product (new or updated)
        await product.save();
        res.redirect('/manager/products');
    } catch (error) {
        console.error('Failed to add or update product', error);
        res.status(500).send('Error processing product');
    }
});










router.get("/order", mid.requiresLogin, async function (req, res, next) {
  try {
    const order_number = parseInt(req.query.no); // Ensure order_number is a number
    const merchantId = req.session.merchant.id;

    // Find the current order by order number and merchant ID
    const currentOrder = await Order.findOne({ merchant: merchantId, order_number: order_number });

    if (!currentOrder) {
      return res.status(404).send('Order not found');
    }

    // Find the previous order by order_number (less than current one) and the same merchant
    const previousOrder = await Order.findOne({
      merchant: merchantId,
      order_number: { $lt: order_number }
    }).sort({ order_number: -1 });

    // Find the next order by order_number (greater than current one) and the same merchant
    const nextOrder = await Order.findOne({
      merchant: merchantId,
      order_number: { $gt: order_number }
    }).sort({ order_number: 1 });

    // Render the Pug template and pass previous and next order numbers
    return res.render("manager/order", {
      title: "Order",
      order: currentOrder, // Pass the current order to the Pug template
      previousOrderNo: previousOrder ? previousOrder.order_number : null, // Pass previous order number if exists
      nextOrderNo: nextOrder ? nextOrder.order_number : null // Pass next order number if exists
    });
  } catch (error) {
    console.error('Error retrieving order:', error);
    return res.status(500).send('Error retrieving order');
  }
});

router.get("/orderTools", mid.requiresLogin, async function (req, res, next) {
  try {
    const order_number = parseInt(req.query.no); // Ensure order_number is a number
    const merchantId = req.session.merchant.id;

    // Find the current order by order number and merchant ID
    const currentOrder = await Order.findOne({ merchant: merchantId, order_number: order_number });

    if (!currentOrder) {
      return res.status(404).send('Order not found');
    }

    // Find the previous order by order_number (less than current one) and the same merchant
    const previousOrder = await Order.findOne({
      merchant: merchantId,
      order_number: { $lt: order_number }
    }).sort({ order_number: -1 });

    // Find the next order by order_number (greater than current one) and the same merchant
    const nextOrder = await Order.findOne({
      merchant: merchantId,
      order_number: { $gt: order_number }
    }).sort({ order_number: 1 });

    // Render the Pug template and pass previous and next order numbers
    return res.render("manager/orderTools", {
      title: "order Tools",
      order: currentOrder, // Pass the current order to the Pug template
      previousOrderNo: previousOrder ? previousOrder.order_number : null, // Pass previous order number if exists
      nextOrderNo: nextOrder ? nextOrder.order_number : null // Pass next order number if exists
    });
  } catch (error) {
    console.error('Error retrieving order:', error);
    return res.status(500).send('Error retrieving order');
  }
});













const { ObjectId } = require('mongoose').Types;  // Import ObjectId

router.get("/findOrder", mid.requiresLogin, async function (req, res, next) {
  try {
    const { productId, variantId, index, orderId } = req.query;
    const merchantId = req.session.merchant.id;

    // console.log("Incoming request with parameters:", { productId, variantId, index, orderId });

    // Find the order by its ID and merchant ID
    const order = await Order.findOne({
      _id: orderId,
      merchant: merchantId
    });

    if (!order) {
      console.error("Order not found");
      return res.status(404).send('Order not found');
    }

    // console.log("Order found:", order);

    // Ensure the index is valid
    if (index < 0 || index >= order.items.length) {
      console.error("Invalid index:", index);
      return res.status(400).send('Invalid item index');
    }

    const itemToUpdate = order.items[index];

    // Check if the productId matches the item at the given index
    if (!itemToUpdate.productId.equals(productId)) {
      console.error("Product not matching at index", index);
      return res.status(404).send('Product not found at the given index');
    }

    // console.log("Item found to update:", itemToUpdate);

    let purchasePrice;

    // If variantId is provided (and not null), get the purchase price from the variant
    if (variantId && variantId !== "null") {
      const product = await Product.findOne({
        _id: new ObjectId(productId),
        merchant: new ObjectId(merchantId)
      });

      if (!product) {
        console.error("Product not found");
        return res.status(404).send('Product not found');
      }

      // Find the correct variant manually in the application logic
      const variant = product.variations.find(v => 
        v._id.equals(variantId) || (v.v_original_id && v.v_original_id.equals(variantId))
      );

      if (!variant) {
        console.error("Variant not found");
        return res.status(404).send('Variant not found');
      }

      purchasePrice = variant.v_purchase_price;
      // console.log("Variant found, purchase price:", purchasePrice);
    } else {
      // No variant, get the purchase price from the product directly
      const productWithoutVariant = await Product.findOne({
        _id: productId,
        merchant: merchantId
      });

      if (!productWithoutVariant) {
        console.error("Product not found");
        return res.status(404).send('Product not found');
      }

      purchasePrice = productWithoutVariant.purchase_price;
      // console.log("Product found, purchase price:", purchasePrice);
    }

    // If purchase price was found, update the order item
    if (purchasePrice !== undefined) {
      itemToUpdate.cost = purchasePrice;

      // Save the updated order back to the database
      await order.save();

      // console.log("Order updated successfully");

      // Redirect to the order page after updating the cost
      return res.redirect('back');
    } else {
      console.error("No purchase price found");
      return res.status(400).send('No purchase price found');
    }
  } catch (error) {
    console.error('Error retrieving or updating the order:', error);
    return res.status(500).send('Error retrieving or updating the order');
  }
});











router.get('/send', async function(req, res) {
  try {
    // Extract the ID from the session object
    const merchantId = req.session.merchant.id;

    // Find the merchant in the database using the ID
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).send('Merchant not found');
    }

    // Log the emailRecipients array
    // console.log('Email Recipients:', merchant.emailRecipients);

    // Ensure that the necessary fields exist
    if (!merchant.notifications || !merchant.notifications.newOrder || !merchant.notifications.newOrder.merchantNotification) {
      return res.status(400).send('Merchant notification settings are incomplete or not defined.');
    }

    // Define the order number
    const orderNo = 91;

    // Get the notification texts in Arabic and English
    let notificationTextAr = merchant.notifications.newOrder.merchantNotification.text.ar;
    let notificationTextEn = merchant.notifications.newOrder.merchantNotification.text.en;

    // Replace [[store_name]] and [[order_number]] with the actual values in both languages
    notificationTextAr = notificationTextAr
      .replace('[[store_name]]', merchant.projectName)
      .replace('[[order_number]]', orderNo);

    notificationTextEn = notificationTextEn
      .replace('[[store_name]]', merchant.projectName)
      .replace('[[order_number]]', orderNo);

    // Combine primary email with all email recipients
    const recipients = [merchant.email, ...merchant.emailRecipients].join(',');

    // Email content with a title "New Order" and the order number
    const output = `
      <div style="color: #000000;">
        <h2 style="text-align: center;">New Order: #${orderNo}</h2>
        <p style="direction: rtl; display: block; color: #000000;">${notificationTextAr}</p>
        <p style="color: #000000;">${notificationTextEn}</p>
      </div>
    `;

    // Nodemailer configuration
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'eng.dugaim@gmail.com',
        pass: 'kioxedtstdtierbv' // Use your app password here
      }
    });

    // Mail options with dynamic "from" field
    var mailOptions = {
      from: `"${merchant.projectName} | New Order No: ${orderNo}" <eng.dugaim@gmail.com>`, // sender address
      to: recipients, // recipient addresses (primary email + additional recipients)
      subject: `New Order: #${orderNo}`, // Subject line
      html: output // html body
    };

    // Send mail
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        // console.log(error);
        return res.status(500).send('Error sending email: ' + error.message);
      } else {
        // console.log('Email sent: ' + info.response);
        return res.status(200).send('Dummy email sent successfully to ' + recipients);
      }
    });
  } catch (error) {
    console.error('Error occurred:', error);
    return res.status(500).send('Server error');
  }
});











router.get('/productImageGenerator', (req, res) => {
    res.render('manager/productImageGenerator', { title: 'Product Image Generator' });
});

// Route to generate the image with overlay text
router.get('/generate-image', async (req, res) => {
  const productNumber = req.query.product_number; // Get the product number from the query parameter

  try {
    const product = await Product.findOne({ product_number: productNumber });

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const productData = {
      product_image: `/img/upload/${path.basename(product.product_image)}`,
      product_name: product.product_name_ar,
      price: `${product.sale_price.toFixed(3)} KD`,
      variations: product.variations.map(variation => ({
        name: variation.v_name_ar,
        price: variation.v_sale_price
      }))
    };

    res.render('manager/productImageGenerator', productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).send('Error fetching product data');
  }
});





router.post('/fill-stock', async (req, res) => {
  const { productId, Stock, ...variationsQuantities } = req.body;
  try {
    // console.log('Received form data:', req.body); // Log the received data for debugging

    res.send('Form data received successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




























router.post('/products/create', upload.single('product_image'), async (req, res) => {

  try {
      // console.log("Received body: ", JSON.stringify(req.body, null, 2));

      const merchantId = req.session.merchant.id; // Assuming merchant ID is stored in session

      // Destructuring the basic product info from the request body
      const {
          product_number, product_name_en, product_name_ar, category_number, order_command, weight,
          keywords, youtube_video_id, description_ar, description_en,
          sale_price, purchase_price, purchase_limit, barcode, pdt_discount_type, pdt_discount, Stock, brand, warranty, warehouse_stock, options
      } = req.body;

      // Create a new product
      const newProduct = new Product({
          product_number,
          product_name_en,
          product_name_ar,
          category_number,
          brand,
          warranty,
          order_command,
          weight,
          keywords,
          product_image: req.file ? req.file.path.replace('public', '') : '',
          youtube_video_id,
          options,
          description_ar,
          description_en,
          merchant: merchantId, // Attach the merchant ID as a reference
          sale_price,
          purchase_price: purchase_price || 0,
          Stock: Stock || 0,
          purchase_limit: purchase_limit || 0,
          warehouse_stock: warehouse_stock || 0
      });

      // Handle variations for the new product
      if (Array.isArray(req.body.v_name_en) && req.body.v_name_en.length > 0) {
          newProduct.variations = req.body.v_name_en.map((_, index) => ({
              v_original_id: req.body.v_original_id[index] || '',
              v_name_en: req.body.v_name_en[index] || '',
              v_name_ar: req.body.v_name_ar[index] || '',
              v_sale_price: req.body.v_sale_price[index] || 0,
              v_purchase_price: req.body.v_purchase_price[index] || 0,
              v_available_quantity: req.body.v_available_quantity[index] || 0,
              v_show: req.body.v_show[index] || 0,
              v_warehouse_stock: req.body.v_warehouse_stock[index] || 0,
              v_purchase_limit: req.body.v_purchase_limit[index] || 0,
              v_barcode: req.body.v_barcode[index] || '',
              v_brand: req.body.v_brand[index] || '',
              v_warranty: req.body.v_warranty[index] || ''
          }));
      }

      await newProduct.save(); // Save the new product
      res.redirect('/manager/products'); // Redirect to the product management page
  } catch (error) {
      console.error('Failed to create product', error);
      res.status(500).send('Error creating product');
  }
});


// POST route to update an existing product with variations
router.post('/products/update', upload.single('product_image'), async (req, res) => {
  try {
      // // console.log("Received body: ", JSON.stringify(req.body, null, 2));
      // console.log("update product")

      const merchantId = req.session.merchant.id; // Assuming merchant ID is stored in session

      // Destructuring the basic product info from the request body
      const {
          product_number, product_name_en, product_name_ar, category_number, order_command, weight,
          keywords, youtube_video_id, description_ar, description_en,
          sale_price, purchase_price, purchase_limit, barcode, pdt_discount_type, pdt_discount, Stock, brand, warranty, warehouse_stock, options
      } = req.body;

      // Find the product by product_number and merchantId
      let product = await Product.findOne({ product_number: product_number, merchant: merchantId });

      if (product) {
          // Update existing product fields
          product.product_name_en = product_name_en;
          product.brand = brand;
          product.warranty = warranty;
          product.product_name_ar = product_name_ar;
          product.category_number = category_number;
          product.order_command = order_command;
          product.weight = weight;
          product.keywords = keywords;

          // Update product image only if a new image was uploaded
          if (req.file) {
              product.product_image = req.file.path.replace('public', '');
          }

          product.youtube_video_id = youtube_video_id;
          product.description_ar = description_ar;
          product.options = options;
          product.description_en = description_en;
          product.sale_price = sale_price;
          product.purchase_price = purchase_price || 0;
          product.purchase_limit = purchase_limit || 0;
          product.warehouse_stock = warehouse_stock || 0;
          product.barcode = barcode;
          product.pdt_discount_type = pdt_discount_type;
          product.pdt_discount = pdt_discount;
          product.Stock = Stock || 0;

          // Update variations if provided
          if (Array.isArray(req.body.v_name_en) && req.body.v_name_en.length > 0) {
              product.variations = req.body.v_name_en.map((_, index) => ({
                    v_original_id: req.body.v_original_id[index] || '',
                  v_name_en: req.body.v_name_en[index] || '',
                  v_name_ar: req.body.v_name_ar[index] || '',
                  v_sale_price: req.body.v_sale_price[index] || 0,
                  v_purchase_price: req.body.v_purchase_price[index] || 0,
                  v_available_quantity: req.body.v_available_quantity[index] || 0,
                  v_show: req.body.v_show[index] || 0,
                  v_warehouse_stock: req.body.v_warehouse_stock[index] || 0,
                  v_purchase_limit: req.body.v_purchase_limit[index] || 0,
                  v_barcode: req.body.v_barcode[index] || '',
                  v_brand: req.body.v_brand[index] || '',
                  v_warranty: req.body.v_warranty[index] || ''
              }));
          } else {
              product.variations = []; // Clear variations if none are provided
          }

          await product.save(); // Save the updates
          res.redirect('/manager/products'); // Redirect to the product management page
      } else {
          res.status(404).send('Product not found');
      }
  } catch (error) {
      console.error('Failed to update product', error);
      res.status(500).send('Error updating product');
  }
});














router.post('/product/delete', async (req, res) => {
    const { productToDeleteID } = req.body;
    try {
        const productToDelete = await Product.findById(productToDeleteID);

        if (!productToDelete) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the product belongs to the currently logged in merchant
        if (productToDelete.merchant){
          if (productToDelete.merchant.toString() !== req.session.merchant.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
          }
        } else {
          res.status(500).json({ error: 'No Merchants found for this product' });
        }
      

        const deletedProduct = await Product.findByIdAndDelete(productToDeleteID);

        res.redirect('back');
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to delete a single product image
router.post('/product/image/delete', mid.requiresLogin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { productId, imagePath } = req.body;
        const merchantId = req.session.merchant.id;
        
        // Find the product
        const product = await Product.findOne({ 
            _id: productId, 
            merchant: merchantId 
        });

        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        
        // Remove the image from product_images array
        const imageIndex = product.product_images.indexOf(imagePath);
        if (imageIndex > -1) {
            // Remove from database array
            product.product_images.splice(imageIndex, 1);
            await product.save();
            
            // Delete physical file from server
            try {
                // The image path in the database doesn't include 'public' prefix, but the actual file does
                const fullPath = path.join('public', imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted file: ${fullPath}`);
                } else {
                    console.log(`File not found on server: ${fullPath}`);
                }
            } catch (fileError) {
                console.error('Error deleting physical file:', fileError);
                // Continue even if file deletion fails
            }
            
            return res.status(200).json({ 
                success: true, 
                message: 'Image deleted successfully' 
            });
        } else {
            return res.status(404).json({ 
                success: false, 
                message: 'Image not found in product' 
            });
        }
    } catch (error) {
        console.error('Error deleting product image:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});


// GET /product/view/:product_number
router.get('/product/view/:product_number', async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;
        const productNumber = req.params.product_number;
        const product = await Product.findOne({ product_number: productNumber, merchant: merchantId });

        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // console.log('Logging merchantId:', merchantId);
        // console.log('Logging productNumber:', productNumber);
        // console.log('Logging product:', product);
        
        // Find category based on product.category and return only ArabicName and EnglishName
        const productCategory = await Category.findOne({ category_number: product.category_number }, { ArabicName: 1, EnglishName: 1 });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.render('manager/productView', { title: product.product_name_ar, product, productCategory });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});







// GET /login
router.get("/login", mid.loggedOut, function (req, res, next) {
  return res.render("manager/login", { title: "Log In" });
});


router.post('/categories/delete', async (req, res) => {
    const { categoryToDeleteID } = req.body;
    try {
        const categoryToDelete = await Category.findById(categoryToDeleteID);

        if (!categoryToDelete) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if the category belongs to the currently logged in merchant
        if (categoryToDelete.merchant.toString() !== req.session.merchant.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const deletedCategory = await Category.findByIdAndDelete(categoryToDeleteID);

        res.redirect('back');
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/branch/delete', async (req, res) => {
    const { branchToDeleteID } = req.body;
    try {
        const branchToDelete = await Branch.findById(branchToDeleteID);

        if (!branchToDelete) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Check if the branch belongs to the currently logged in merchant
        if (branchToDelete.merchant.toString() !== req.session.merchant.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const deletedBranch = await Branch.findByIdAndDelete(branchToDeleteID);

        res.redirect('back');
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});





router.post('/categories/update-status', async (req, res) => {
  const { id, status } = req.body;
  // console.log("update-status")
  try {
    // Update the status of the category with the given id
    const updatedCategory = await Category.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('Error updating category status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/branch/update-status', async (req, res) => {
  const { id, status, name } = req.body;
  // console.log("update-status ID: " + id)
  // console.log("update-status name: " + name)
  // console.log("update-status status: " + status)
  try {


    const { id, status, name } = req.body;
    const update = { [name]: status };
    const updatedBranch = await Branch.findByIdAndUpdate(id, update, { new: true });

    


    if (!updatedBranch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json(updatedBranch);
  } catch (error) {
    console.error('Error updating category status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/product/update-status', async (req, res) => {
  const { id, status } = req.body;
  // console.log("update-status")
  try {
    // Update the status of the category with the given id
    const updatedProduct = await Product.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating category status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// POST route to handle form submission
router.post('/update-price', async (req, res) => {
  try {
      // Extracting data from the request body
      const { value, type, productId } = req.body;

      // Finding the product by productId
      const product = await Product.findOne({ _id: productId });

      if (!product) {
          return res.status(404).send('Product not found');
      }

      // Update the product based on the type
      let updatedValue;
      if (type === 'sale_price') {
          product.sale_price = value;
          updatedValue = product.sale_price;
      } else if (type === 'purchase_price') {
          product.purchase_price = value;
          updatedValue = product.purchase_price;
      } else {
          return res.status(400).send('Invalid update type');
      }

      // Save the updated product
      await product.save();

      // Sending a response back to the client with the updated value
      res.json({ message: 'Product updated successfully', updatedValue });
  } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('Internal Server Error');
  }
});



router.post('/update-stock', async (req, res) => {
  try {
    const { value, productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    product.Stock = value;
    await product.save();

    res.json({ message: 'Product updated successfully', updatedValue: product.Stock });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send('Internal Server Error');
  }
});



router.post('/login', async (req, res) => {
  try {
    const { emailorphone, password } = req.body;
    let merchant;

    // Determine if the identifier is an email or phone number and fetch the merchant
    if (emailorphone.includes('@')) {
      merchant = await Merchant.findOne({ email: emailorphone.toLowerCase() });
    } else {
      merchant = await Merchant.findOne({ phoneNumber: emailorphone });
    }

    if (!merchant) {
      return res.status(401).send('Login failed: Merchant not found.');
    }

    // Check if the provided password is correct
    const isMatch = await bcrypt.compare(password, merchant.password);
    if (!isMatch) {
      return res.status(401).send('Login failed: Incorrect password.');
    }

    // Store merchant data in session
    req.session.merchant = {
      id: merchant._id,
      projectName: merchant.projectName,
      name: merchant.name,
      merchant_number: merchant.merchant_number
    };

    // Redirect or send a success message
    res.redirect('/manager'); // Redirect to a dashboard or some other page
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});


// Dashboard route
router.get('/dashboard', (req, res) => {
  if (!req.session.merchant) {
    // Redirect the user to the login page if they are not logged in
    return res.redirect('/manager/login');
  }

  // Render a dashboard page using session data
  res.render('manager/dashboard', {
    merchantID: req.session.merchant.id,
    projectName: req.session.merchant.projectName,
    name: req.session.merchant.name
  });
});


// Dashboard route
router.get('/test', (req, res) => {
  if (!req.session.merchant) {
    // Redirect the user to the login page if they are not logged in
    return res.redirect('/manager/login');
  }

  // Render a dashboard page using session data
  res.render('manager/test', {
    merchantID: req.session.merchant.id,
    projectName: req.session.merchant.projectName,
    name: req.session.merchant.name
  });
});



// Dashboard route
router.get('/dashboard2', (req, res) => {
  if (!req.session.merchant) {
    // Redirect the user to the login page if they are not logged in
    return res.redirect('/manager/login');
  }

  // Render a dashboard page using session data
  res.render('manager/dashboard2', {
    merchantID: req.session.merchant.id,
    projectName: req.session.merchant.projectName,
    name: req.session.merchant.name
  });
});


router.post('/random-number', (req, res) => {
  const { min, max } = req.body;
  const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
  res.json({ randomNumber });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out.');
    }
    res.redirect('/manager/login');
  });
});







router.get("/", mid.requiresLogin, function (req, res, next) {
  
  res.redirect('/manager/orders');
});
















router.get('/orders', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    const perPage = 10;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    // Fetch paginated orders
    const orders = await Order.find({ merchant: merchantId })
                              .sort({ time: -1 })
                              .skip((perPage * (page - 1)))
                              .limit(perPage)
                              .select('order_number time customerName phone PaymentMethod total status');

    // Run all count queries in parallel using Promise.all() for speed
    const [totalOrders, newCount, processingCount, completedCount, canceledCount, returnedCount] = await Promise.all([
      Order.countDocuments({ merchant: merchantId }),
      Order.countDocuments({ merchant: merchantId, status: "new" }),
      Order.countDocuments({ merchant: merchantId, status: "processing" }),
      Order.countDocuments({ merchant: merchantId, status: "completed" }),
      Order.countDocuments({ merchant: merchantId, status: "canceled" }),
      Order.countDocuments({ merchant: merchantId, status: "returned" }),
    ]);

    // Prepare the status data
    const statusData = {
      new: newCount,
      processing: processingCount,
      completed: completedCount,
      canceled: canceledCount,
      returned: returnedCount,
      all: totalOrders,
    };

    console.log("Optimized Status Data:", statusData); // Debugging log

    // Render the page with correct statistics
    res.render('manager/orders', { 
      title: 'Orders', 
      orders, 
      current: page,
      pages: Math.ceil(totalOrders / perPage),
      statusData,  // Correct statistics
    });

  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/orders/:status?', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    const perPage = 10;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const status = req.params.status || "all"; // Ensure status is always defined

    // Valid statuses
    const validStatuses = ["new", "processing", "completed", "canceled", "returned"];
    let query = { merchant: merchantId };

    if (validStatuses.includes(status)) {
      query.status = status;
    }

    // Fetch paginated orders based on status
    const orders = await Order.find(query)
      .sort({ time: -1 })
      .skip((perPage * (page - 1)))
      .limit(perPage)
      .select('order_number time customerName phone PaymentMethod total status');

    // Run all count queries in parallel
    const [totalOrders, statusCount] = await Promise.all([
      Order.countDocuments({ merchant: merchantId }),
      Order.countDocuments(query), // Count for the selected status
    ]);

    // Prepare status count data for all statuses
    const [newCount, processingCount, completedCount, canceledCount, returnedCount] = await Promise.all([
      Order.countDocuments({ merchant: merchantId, status: "new" }),
      Order.countDocuments({ merchant: merchantId, status: "processing" }),
      Order.countDocuments({ merchant: merchantId, status: "completed" }),
      Order.countDocuments({ merchant: merchantId, status: "canceled" }),
      Order.countDocuments({ merchant: merchantId, status: "returned" }),
    ]);

    // Store status counts in an object
    const statusData = {
      new: newCount,
      processing: processingCount,
      completed: completedCount,
      canceled: canceledCount,
      returned: returnedCount,
      all: totalOrders,
    };

    // Correct total pages based on filtered status count
    const totalPages = Math.ceil(statusCount / perPage);

    // Render page with status and statusData
    res.render('manager/orders', { 
      title: 'Orders', 
      orders, 
      current: page,
      pages: totalPages,
      status, // Pass the current status
      statusData,
    });

  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/orderssearch/:search?', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    const perPage = 10;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const search = req.query.search ? req.query.search.trim() : req.params.search?.trim() || ""; // Get search term from either query or params

    console.log("Search Term:", search); // Debugging log

    // If no search term is provided, return empty results (prevents returning all orders)
    if (!search) {
      return res.render('manager/orders', { 
        title: 'Search Orders', 
        orders: [], 
        current: 1,
        pages: 1,
        searchQuery: ""
      });
    }

    // Build query object for searching
    let query = { merchant: merchantId };

    // Apply search filter (by order number or phone)
    if (!isNaN(search)) {
      // If search is a number, search by order_number or exact phone match
      query.$or = [
        { order_number: parseInt(search, 10) },
        { phone: search }
      ];
    } else {
      // If search is not a number, search by phone only
      query.phone = search;
    }

    // Get the count for pagination (only for searched results)
    const searchCount = await Order.countDocuments(query);

    // Fetch paginated orders based on search filter
    const orders = await Order.find(query)
                              .sort({ time: -1 })
                              .skip((perPage * (page - 1)))
                              .limit(perPage)
                              .select('order_number time customerName phone PaymentMethod total status');

    // Calculate total pages based on filtered result count
    const totalPages = Math.max(1, Math.ceil(searchCount / perPage)); // Ensure at least 1 page

    // Render the page with correct search results
    res.render('manager/orders', { 
      title: 'Search Orders', 
      orders, 
      current: page,
      pages: totalPages,
      searchQuery: search
    });

  } catch (error) {
    console.error('Error searching orders:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/order/saveTotalCost', mid.requiresLogin, async (req, res) => {
  try {
    const { orderId, totalCostAmount } = req.query; // Use req.query for GET request parameters
    const merchantId = req.session.merchant.id; // Get the merchantId from the session

    // Find the order by its ID and merchant ID
    const order = await Order.findOne({ _id: orderId, merchant: merchantId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' }); // If the order is not found, send a 404 error
    }

    // Update the total_cost field with the passed totalCostAmount
    order.total_cost = totalCostAmount;

    // Save the updated order back to the database
    await order.save();

    // return res.json({ success: true, message: 'Total cost updated successfully' }); // Return success response
    return res.redirect('back');
  } catch (error) {
    console.error('Error updating total cost:', error); // Log any errors for debugging
    return res.status(500).json({ success: false, message: 'Internal server error' }); // Return an error response if something goes wrong
  }
});







// Route to render the products management page with category_number filtering
router.get('/products', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    const { categoryNumber } = req.query; // Get the category number directly from query parameters

    // Build the query object with the merchant ID and optional category_number filter
    const query = { merchant: merchantId };
    if (categoryNumber) {
      query.category_number = parseInt(categoryNumber, 10); // Convert categoryNumber to integer
    }

    // Retrieve products and categories
    const products = await Product.find(query);
    const categories = await Category.find({ merchant: merchantId });

    // console.log("categoryNumber:", categoryNumber);
    // console.log("products:", products);

    // Render the Pug template with the filtered products and all categories for the filter dropdown
    res.render('manager/products', { products, categories, selectedCategoryNumber: categoryNumber });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).send('Internal Server Error');
  }
});





router.get('/offers', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;

    // Fetch offers and ensure offers is always an array
    const offers = await Offer.find({ merchant: merchantId }) || [];

    // Log offers to ensure it is being fetched correctly
    // console.log(offers);

    // Render the offers page with the offers array
    res.render('manager/offers', { myOffers: offers });
  } catch (error) {
    console.error('Error fetching offers:', error.message);
    res.status(500).send('Internal Server Error');
  }
});






// Route to render the products management page
router.get('/productsPrint', mid.requiresLogin, async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    
    
    
    const products = await Product.find({ merchant: merchantId }).sort({ order_command: 1 });
    const categories = await Category.find({ merchant: merchantId });
    res.render('manager/productsPrint', { products, categories }); // Render the Pug template with the products data
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).send('Internal Server Error');
  }
});




// Function to extract text from HTML, replacing tags with a space
function extractText(htmlString) {
  return htmlString.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

router.get('/exportproducts', mid.requiresLogin, async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;
        const products = await Product.find({ merchant: merchantId }).lean();

        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('Products');

        // Define columns for the Excel sheet
        worksheet.columns = [
            { header: 'Product Number', key: 'product_number', width: 15 },
            { header: 'Product Name EN', key: 'product_name_en', width: 25 },
            { header: 'Product Name AR', key: 'product_name_ar', width: 25 },
            { header: 'Category Number', key: 'category_number', width: 15 },
            { header: 'Sale Price', key: 'sale_price', width: 15 },
            { header: 'Purchase Price', key: 'purchase_price', width: 15 },
            { header: 'Brand', key: 'brand', width: 20 },
            { header: 'Warranty', key: 'warranty', width: 20 },
            { header: 'Stock', key: 'stock', width: 10 },
            { header: 'Warehouse Stock', key: 'warehouse_stock', width: 15 },
            { header: 'Variation Name EN', key: 'v_name_en', width: 20 },
            { header: 'Variation Name AR', key: 'v_name_ar', width: 20 },
            { header: 'Variation Sale Price', key: 'v_sale_price', width: 15 },
            { header: 'Variation Purchase Price', key: 'v_purchase_price', width: 15 },
            { header: 'Variation Available Quantity', key: 'v_available_quantity', width: 20 },
            { header: 'Variation Warehouse Stock', key: 'v_warehouse_stock', width: 20 },
            { header: 'Variation Barcode', key: 'v_barcode', width: 20 },
            { header: 'Variation Brand', key: 'v_brand', width: 20 },
            { header: 'Variation Warranty', key: 'v_warranty', width: 20 },
            { header: 'Variation Show', key: 'v_show', width: 10 },
            { header: 'Product Type', key: 'product_type', width: 15 },
            { header: 'Order Command', key: 'order_command', width: 15 },
        ];

        // Set header font style
        worksheet.getRow(1).font = { bold: true };

        // Process each product
        products.forEach((product) => {
            if (product.variations && product.variations.length > 0) {
                product.variations.forEach((variation) => {
                    worksheet.addRow({
                        product_number: product.product_number,
                        product_name_en: product.product_name_en,
                        product_name_ar: product.product_name_ar,
                        category_number: product.category_number,
                        sale_price: product.sale_price,
                        purchase_price: product.purchase_price,
                        brand: product.brand,
                        warranty: product.warranty,
                        stock: product.Stock,
                        warehouse_stock: product.warehouse_stock,
                        v_name_en: variation.v_name_en,
                        v_name_ar: variation.v_name_ar,
                        v_sale_price: variation.v_sale_price,
                        v_purchase_price: variation.v_purchase_price,
                        v_available_quantity: variation.v_available_quantity,
                        v_warehouse_stock: variation.v_warehouse_stock,
                        v_barcode: variation.v_barcode,
                        v_brand: variation.v_brand,
                        v_warranty: variation.v_warranty,
                        v_show: variation.v_show,
                        product_type: product.product_type,
                        order_command: product.order_command,
                    });
                });
            } else {
                // Add product without variations
                worksheet.addRow({
                    product_number: product.product_number,
                    product_name_en: product.product_name_en,
                    product_name_ar: product.product_name_ar,
                    category_number: product.category_number,
                    sale_price: product.sale_price,
                    purchase_price: product.purchase_price,
                    brand: product.brand,
                    warranty: product.warranty,
                    stock: product.Stock,
                    warehouse_stock: product.warehouse_stock,
                    v_name_en: '',
                    v_name_ar: '',
                    v_sale_price: '',
                    v_purchase_price: '',
                    v_available_quantity: '',
                    v_warehouse_stock: '',
                    v_barcode: '',
                    v_brand: '',
                    v_warranty: '',
                    v_show: '',
                    product_type: product.product_type,
                    order_command: product.order_command,
                });
            }
        });

        // Generate the Excel file for download
        res.setHeader('Content-Disposition', 'attachment; filename="Products_with_Variants.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exporting products:', err);
        res.status(500).send('Failed to export products.');
    }
});



router.get('/exportorders', mid.requiresLogin, async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;
        const orders = await Order.find({ merchant: merchantId })
            .sort({ time: -1 }) // Sort orders by time in descending order
            .lean();

        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('Orders');

        // Define columns with alignment settings applied at definition
        worksheet.columns = [
            { header: 'Order Number', key: 'order_number', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Phone', key: 'phone', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Total Amount', key: 'total', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Total Cost', key: 'total_cost', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Profit', key: 'profit', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } }, // Profit column
            { header: 'Order Time', key: 'time', width: 20, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Status', key: 'status', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } }
        ];

        // Set header font style to bold after defining columns
        worksheet.getRow(1).font = { bold: true };

        // Add order data to the worksheet
        orders.forEach(order => {
            let profit = 0;

            if (order.total_cost && order.total_cost > 0) {
                // Calculate profit based on the status
                if (order.status === 'canceled') {
                    profit = 0;
                } else if (order.status === 'returned') {
                    profit = -(order.total - order.total_cost); // Negative profit for returned orders
                } else {
                    profit = order.total - order.total_cost; // Normal profit calculation
                }
            }

            // Format date
            order.time = new Date(order.time).toLocaleString();

            // Add row as numbers for numeric fields
            worksheet.addRow({
                order_number: order.order_number,
                phone: order.phone,
                total: Number(order.total), // Ensure this is a number
                total_cost: Number(order.total_cost || 0), // Ensure total_cost is a number
                profit: Number(profit.toFixed(2)), // Ensure profit is a number
                time: order.time,
                status: order.status
            });
        });

        const fileName = 'Orders.xlsx';
        await workbook.xlsx.writeFile(fileName);
        res.download(fileName);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to download orders");
    }
});



router.get('/exportorders/details', mid.requiresLogin, async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;
        const orders = await Order.find({ merchant: merchantId })
            .sort({ time: -1 }) // Sort orders by time in descending order
            .lean();

        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('Order Details');

        // Define columns for detailed export
        worksheet.columns = [
            { header: 'Order ID', key: 'order_id', width: 20, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Product ID', key: 'product_id', width: 25, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Variant ID', key: 'variant_id', width: 25, style: { alignment: { horizontal: 'center', vertical: 'middle' } } },
            { header: 'Price', key: 'price', width: 15, style: { alignment: { horizontal: 'center', vertical: 'middle' } } }
        ];

        // Set header font style to bold
        worksheet.getRow(1).font = { bold: true };

        // Iterate over each order and its items
        orders.forEach(order => {
            order.items.forEach(item => {
                worksheet.addRow({
                    order_id: order._id.toString(),
                    product_id: item.productId ? item.productId.toString() : 'N/A',
                    variant_id: item.variantId ? item.variantId.toString() : 'N/A',
                    price: Number(item.price).toFixed(2) // Format price to two decimals
                });
            });
        });

        const fileName = 'OrderDetails.xlsx';
        await workbook.xlsx.writeFile(fileName);
        res.download(fileName);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to download order details");
    }
});



router.get('/exportcategories', async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;
        const categories = await Category.find({ merchant: merchantId }).lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Categories');

        // Define columns for the Excel sheet
        worksheet.columns = [
            { header: 'Category Number', key: 'category_number', width: 18, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            { header: 'Arabic Name', key: 'ArabicName', width: 25, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            { header: 'English Name', key: 'EnglishName', width: 25, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            // { header: 'Image Source', key: 'imgsrc', width: 30 },
            { header: 'Status', key: 'status', width: 12 },
            // { header: 'Category Link', key: 'categoryLink', width: 30, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            // { header: 'Merchant ID', key: 'merchant', width: 24, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            { header: 'Discount Percentage', key: 'discountPerc', width: 20, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  },
            { header: 'Sort Order', key: 'sort', width: 12, style: { alignment: { horizontal: 'center', vertical: 'middle' } }  }
        ];

        // Add data rows to the worksheet
        categories.forEach(category => {
            worksheet.addRow({
                category_number: category.category_number,
                ArabicName: category.ArabicName,
                EnglishName: category.EnglishName,
                imgsrc: category.imgsrc,
                status: category.status,
                // categoryLink: category.categoryLink,
                merchant: category.merchant.toString(), // Assuming 'merchant' is an ObjectId
                discountPerc: category.discountPerc,
                sort: category.sort
            });
        });

        // Set header font style to bold after defining columns
        worksheet.getRow(1).font = { bold: true };

        // Write to a file and send it as a response
        const fileName = `Categories-${Date.now()}.xlsx`;
        await workbook.xlsx.writeFile(fileName);
        res.download(fileName, () => {
            // Optionally delete the file after sending it to the user
            require('fs').unlinkSync(fileName);
        });
    } catch (error) {
        console.error('Failed to export categories:', error);
        res.status(500).send('Failed to export categories');
    }
});



router.get('/bulkProductUpload', mid.requiresLogin, async (req, res) => {
    try {
        res.render('manager/bulkProductUpload', {
            title: 'تحميل المنتجات بكميات كبيرة',
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load the bulk product upload page.');
    }
});


router.get('/bulkCategoryUpload', mid.requiresLogin, async (req, res) => {
    try {
        res.render('manager/bulkCategoryUpload', {
            title: 'تحميل التصنيفات بكميات كبيرة',
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load the bulk category upload page.');
    }
});





const BATCH_SIZE = 100; // Number of rows to process in a batch



const processProductData = async (products, req) => {
  try {
      const merchantId = req.session.merchant.id;

      for (const product of products) {
          const {
              product_number, product_name_en, product_name_ar, category_number, order_command,
              sale_price, purchase_price, Stock, brand, warranty, warehouse_stock,
              product_type, variations
          } = product;

          // Retrieve the existing product
          let existingProduct = await Product.findOne({ product_number, merchant: merchantId });

          // Prepare the updated product data
          const productData = {
              product_number,
              product_name_en,
              product_name_ar,
              category_number,
              sale_price,
              purchase_price,
              Stock,
              brand,
              warranty,
              warehouse_stock,
              product_type,
              order_command,
              merchant: merchantId,
          };

          // Only include variations if they exist and are valid
          const processedVariations = (variations || []).filter(variation => {
              return variation.variation_name_en || variation.variation_name_ar;
          }).map(variation => ({
              v_name_en: variation.variation_name_en,
              v_name_ar: variation.variation_name_ar,
              v_sale_price: variation.variation_sale_price || 0,
              v_purchase_price: variation.variation_purchase_price || 0,
              v_available_quantity: variation.variation_available_quantity || 0,
              v_warehouse_stock: variation.variation_warehouse_stock || 0,
              v_barcode: variation.variation_barcode || '',
              v_brand: variation.variation_brand || '',
              v_warranty: variation.variation_warranty || '',
              v_show: variation.variation_show || true,
          }));

          if (existingProduct) {
              // Update existing product
              Object.assign(existingProduct, productData);

              // Update variations only if there are valid ones
              if (processedVariations.length > 0) {
                  existingProduct.variations = processedVariations;
              } else {
                  // Clear variations if none are valid
                  existingProduct.variations = [];
              }
          } else {
              // Create a new product if it doesn't exist
              const newProductData = {
                  ...productData,
              };

              // Only add variations if there are valid ones
              if (processedVariations.length > 0) {
                  newProductData.variations = processedVariations;
              }

              existingProduct = new Product(newProductData);
          }

          // Save the product (new or updated)
          await existingProduct.save();
      }

     // console.log("Products processed successfully");
      return true;
  } catch (error) {
      console.error('Error processing products:', error.message);
      throw new Error('Failed to process products');
  }
};

router.post('/bulkProductUpload', mid.requiresLogin, upload.single('file'), async (req, res) => {
  try {
      const filePath = req.file.path;

      // Read and process the Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      // Dynamically map column headers to their respective indices
      const headers = worksheet.getRow(1).values.slice(1).map(header => header && header.trim());
      const columnIndexMap = headers.reduce((map, header, index) => {
          if (header) map[header] = index + 1; // Column indices are 1-based
          return map;
      }, {});

      const productsMap = new Map();

      worksheet.eachRow((row, rowIndex) => {
          if (rowIndex === 1) return;

          const productNumber = row.getCell(columnIndexMap["Product Number"])?.value;

          const variantData = {
              variation_name_en: row.getCell(columnIndexMap["Variation Name EN"])?.value || null,
              variation_name_ar: row.getCell(columnIndexMap["Variation Name AR"])?.value || null,
              variation_sale_price: parseFloat(row.getCell(columnIndexMap["Variation Sale Price"])?.value) || null,
              variation_purchase_price: parseFloat(row.getCell(columnIndexMap["Variation Purchase Price"])?.value) || null,
              variation_available_quantity: parseInt(row.getCell(columnIndexMap["Variation Available Quantity"], 10)) || null,
              variation_warehouse_stock: parseInt(row.getCell(columnIndexMap["Variation Warehouse Stock"], 10)) || null,
              variation_barcode: row.getCell(columnIndexMap["Variation Barcode"])?.value || null,
              variation_brand: row.getCell(columnIndexMap["Variation Brand"])?.value || null,
              variation_warranty: row.getCell(columnIndexMap["Variation Warranty"])?.value || null,
              variation_show: row.getCell(columnIndexMap["Variation Show"])?.value === true,
          };

          // Check if all variant fields are empty (skip creating variation if true)
          const isVariantEmpty = Object.values(variantData).every(value => value === null);

          if (!productsMap.has(productNumber)) {
              const productData = {
                  product_number: productNumber || null,
                  product_name_en: row.getCell(columnIndexMap["Product Name EN"])?.value || '',
                  product_name_ar: row.getCell(columnIndexMap["Product Name AR"])?.value || '',
                  category_number: row.getCell(columnIndexMap["Category Number"])?.value || null,
                  sale_price: parseFloat(row.getCell(columnIndexMap["Sale Price"])?.value) || 0,
                  purchase_price: parseFloat(row.getCell(columnIndexMap["Purchase Price"])?.value) || 0,
                  stock: parseInt(row.getCell(columnIndexMap["Stock"], 10)) || 0,
                  brand: row.getCell(columnIndexMap["Brand"])?.value || '',
                  warranty: row.getCell(columnIndexMap["Warranty"])?.value || '',
                  warehouse_stock: parseInt(row.getCell(columnIndexMap["Warehouse Stock"], 10)) || 0,
                  product_type: row.getCell(columnIndexMap["Product Type"])?.value || 'Simple', // Default to 'Simple'
                  order_command: parseInt(row.getCell(columnIndexMap["Order Command"], 10)) || 0,
                  variations: isVariantEmpty ? [] : [variantData],
              };

              productsMap.set(productNumber, productData);
          } else if (!isVariantEmpty) {
              productsMap.get(productNumber).variations.push(variantData);
          }
      });

      const products = Array.from(productsMap.values());

      // Validate and process products
      await processProductData(products, req);

      fs.unlinkSync(filePath);
      res.status(200).json({ message: 'Products processed successfully' });
  } catch (err) {
      console.error('Error processing bulk product upload:', err.message);
      res.status(500).send('Error: ' + err.message);
  }
});






router.post('/bulkCategoryUpload', mid.requiresLogin, upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;

        // Read and process the Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        // Dynamically map column headers to their respective indices
        const headers = worksheet.getRow(1).values.slice(1).map(header => header && header.trim());
        const columnIndexMap = headers.reduce((map, header, index) => {
            if (header) map[header] = index + 1; // Column indices are 1-based
            return map;
        }, {});

        const categories = [];
        const categoryNumbersMap = new Map(); // Track category numbers and their row indices

        worksheet.eachRow((row, rowIndex) => {
            if (rowIndex === 1) return; // Skip header row

            const categoryNumber = row.getCell(columnIndexMap["Category Number"])?.value;

            if (categoryNumber) {
                if (categoryNumbersMap.has(categoryNumber)) {
                    // If duplicate found, throw a detailed error
                    const firstRow = categoryNumbersMap.get(categoryNumber);
                    throw new Error(
                        `Duplicate category_number "${categoryNumber}" found at row ${rowIndex}. First occurrence was at row ${firstRow}.`
                    );
                }
                categoryNumbersMap.set(categoryNumber, rowIndex);
            }

            const rawStatus = row.getCell(columnIndexMap["Status"])?.value;
            const categoryData = {
                category_number: categoryNumber || null,
                ArabicName: row.getCell(columnIndexMap["Arabic Name"])?.value,
                EnglishName: row.getCell(columnIndexMap["English Name"])?.value,
                status: rawStatus === true || rawStatus === 'TRUE' || rawStatus === 'true', // Parse boolean status
                discountPerc: row.getCell(columnIndexMap["Discount Percentage"])?.value,
                sort: row.getCell(columnIndexMap["Sort Order"])?.value,
                merchant: req.session.merchant.id // Always set the merchant ID
            };

            // Validate required fields
            if (!categoryData.ArabicName || !categoryData.EnglishName) {
                throw new Error(`Missing required fields in the Excel file at row ${rowIndex}.`);
            }

            // Sanitize `discountPerc`
            categoryData.discountPerc =
                typeof categoryData.discountPerc === 'number' && !isNaN(categoryData.discountPerc)
                    ? categoryData.discountPerc
                    : 0;

            // Sanitize `sort`
            categoryData.sort =
                typeof categoryData.sort === 'number' && !isNaN(categoryData.sort)
                    ? categoryData.sort
                    : parseInt(categoryData.sort, 10) || 0;

            categories.push(categoryData);
        });

        for (const categoryData of categories) {
            if (categoryData.category_number) {
                const existingCategory = await Category.findOne({
                    category_number: categoryData.category_number,
                    merchant: req.session.merchant.id
                });

                if (existingCategory) {
                    await Category.updateOne(
                        { category_number: categoryData.category_number, merchant: req.session.merchant.id },
                        { $set: categoryData }
                    );
                    continue;
                }
            }

            const newCategory = new Category(categoryData);
            await newCategory.save();
        }

        fs.unlinkSync(filePath); // Delete the uploaded file
        res.redirect('/manager/category'); // Redirect to the category list
    } catch (err) {
        console.error('Error processing bulk category upload:', err.message);
        res.status(500).send('Error: ' + err.message);
    }
});








router.get("/product/form/:product_identifier", mid.requiresLogin, async function (req, res, next) {
    try {
        const merchantId = req.session.merchant.id;
        const productIdentifier = req.params.product_identifier;
        const categories = await Category.find({ merchant: merchantId });

        // Check if the route is for adding a new product
        if (productIdentifier === "new") {
            return res.render("manager/productForm", {
                title: "Add New Product",
                categories: categories, // Pass the categories to the Pug template
                product: "" // No product to pass since it's a new entry
            });
        } else {
            let product;

            // Check if the identifier is a valid ObjectId (for productId) or treat it as a product_number
            if (mongoose.Types.ObjectId.isValid(productIdentifier)) {
                // Fetch by product ID (ObjectId)
                product = await Product.findOne({ _id: productIdentifier, merchant: merchantId });
            } else {
                // Fetch by product number
                product = await Product.findOne({ product_number: productIdentifier, merchant: merchantId });
            }

            if (product) {
                return res.render("manager/productForm", {
                    title: "Edit Product",
                    categories: categories,
                    product: product // Pass the existing product to the Pug template
                });
            } else {
                // Product not found with the given product_identifier
                return res.status(404).send("Product not found");
            }
        }
    } catch (error) {
        console.error('Error retrieving product or categories:', error);
        return res.status(500).send('Error retrieving product or categories');
    }
});




router.get("/category", mid.requiresLogin,  async function (req, res, next) {
  

  try {
    const merchantId = req.session.merchant.id;
    const categories = await Category.find({ merchant: merchantId });
    return res.render("manager/category", {
      title: "Category",
      categories: categories // Pass the categories to the Pug template
    });
  } catch (error) {
    console.error('Error retrieving categories:', error);
    return res.status(500).send('Error retrieving categories');
  }
});

router.get("/category/form", async function (req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    return res.render("manager/categoryForm", { title: "Edit New Category", category: category });
  } catch (error) {
    console.error('Error finding category by id:', error);
    return res.status(500).send('Error finding category');
  }
});

router.get("/category/form/:id", async function (req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    return res.render("manager/categoryForm", { title: "Edit New Category", category: category });
  } catch (error) {
    console.error('Error finding category by id:', error);
    return res.status(500).send('Error finding category');
  }
});





router.get("/offer/form", async function (req, res, next) {
  try {


    const merchantId = req.session.merchant.id;
   
    // Fetch the products with only the necessary fields
    const products = await Product.find(
      { merchant: merchantId },  // Find products belonging to the merchant
      'product_number product_name_ar product_name_en sale_price purchase_price'  // Select only the needed fields
    ).sort({ product_number: 1 });  // Sort by product_number in ascending order

    
    const categories = await Category.find({ merchant: merchantId });

    // Render the form for creating a new offer, passing the products
    return res.render("manager/offerForm", { title: "Create New Offer", offer: null, products, categories });
  } catch (error) {
    console.error('Error rendering new offer form:', error);
    return res.status(500).send('Error loading offer form');
  }
});







router.get("/offer/form/:id", async function (req, res, next) {
  try {
    const merchantId = req.session.merchant.id;
    const offer = await Offer.findById(req.params.id);
    // console.log("offer", offer );
    const categories = await Category.find({ merchant: merchantId });
    if (!offer) {
      return res.status(404).send('Offer not found');
    }

    

    // Fetch the products with only the necessary fields
    const products = await Product.find(
      { merchant: merchantId },  // Find products belonging to the merchant
      'product_number product_name_ar product_name_en sale_price purchase_price'  // Select only the needed fields
    ).sort({ product_number: 1 });  // Sort by product_number in ascending order

    // Render the form for editing an offer, passing the offer and products
    return res.render("manager/offerForm", { title: "Edit Offer", offer, products, categories });
  } catch (error) {
    console.error('Error finding offer by id:', error);
    return res.status(500).send('Error finding offer');
  }
});









router.get("/branch/form/:id", async function (req, res, next) {
  try {
    var branch = [];
    if (req.params.id == "new"){
      branch = [];
    } else {
      branch = await Branch.findById(req.params.id);
    }
    
    return res.render("manager/branchForm", { title: "Edit New Branch", branch: branch });
  } catch (error) {
    console.error('Error finding branch by id:', error);
    return res.status(500).send('Error finding branch');
  }
});





router.get("/branch", mid.requiresLogin,  async function (req, res, next) {


  

  try {
    const merchantId = req.session.merchant.id;
    const branches = await Branch.find({ merchant: merchantId },
      { 
         branch_name_ar: 1, 
         branch_name_en: 1, 
         phone: 1, 
         status: 1,
         isBusy: 1,
         deliveryAvailable: 1,
         pickupAvailable: 1,
         scheduleAvailable: 1,
      });

    
    return res.render("manager/branch", {
      title: "Branch",
      branches: branches // Pass the branches to the Pug template
    });
  } catch (error) {
    console.error('Error retrieving branches:', error);
    return res.status(500).send('Error retrieving branches');
  }
});

router.get("/branch/form", function (req, res, next) {
  return res.render("manager/branchForm", { title: "Add New Branch"});
});






router.get("/customers", mid.requiresLogin,  async function (req, res, next) {


  try {
    console.log("customers");
    const merchantId = req.session.merchant.id;
    const customers = await Customer.find({ });
    // const customers = await Customer.find({ merchant: merchantId });
    console.log("customers", customers)
    return res.render("manager/customers", {
      title: "Customers",
      customers: customers // Pass the categories to the Pug template
    });
  } catch (error) {
    console.error('Error retrieving customers:', error);
    return res.status(500).send('Error retrieving customers');
  }
});



router.get("/customer/form/:id", async function (req, res, next) {
  try {
    var customer = [];
    if (req.params.id == "new"){
      customer = [];
    } else {
      customer = await Customer.findById(req.params.id);
    }

    return res.render("manager/customerForm", { title: "Edit New Customer", customer: customer });
  } catch (error) {
    console.error('Error finding customer by id:', error);
    return res.status(500).send('Error finding customer');
  }
});

router.get("/customer/customerBalanceForm", function (req, res, next) {
  return res.render("manager/customerBalanceForm", { title: "Add Customer Balance"});
});

router.get("/customer/customerOrders", function (req, res, next) {
  return res.render("manager/customerOrders", { title: "Customer Orders"});
});

router.get("/customer/customerAddress", function (req, res, next) {
  return res.render("manager/customerAddress", { title: "Customer Address"});
});


router.get("/coupon", function (req, res, next) {
  return res.render("manager/coupon", { title: "Coupon" });
});

// router.get("/subusers", function (req, res, next) {
//   return res.render("manager/subusers", { title: "Sub Users" });
// });

router.get("/settings", async function (req, res, next) {
  try {
    // Assuming the merchant ID is stored in the session
    const merchantId = req.session.merchant.id;

    // Fetch the merchant data from the database
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Render the settings page and pass the merchant data to the view
    return res.render("manager/settings", { 
      title: "Settings", 
      merchant 
    });
  } catch (error) {
    console.error('Error fetching merchant data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/update-tap-settings', async (req, res) => {
  const { live_authorization, test_authorization, status, mode } = req.body;

  try {
    // Assuming the merchant ID is stored in the session
    const merchantId = req.session.merchant.id;

    // Determine if the mode should be 'live' or 'test' based on the checkbox value
    const finalMode = mode === 'true' ? 'live' : 'test';

    // Update the merchant's TAP settings
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      merchantId,
      {
        'tapSettings.liveAuthorization': live_authorization,
        'tapSettings.testAuthorization': test_authorization,
        'tapSettings.status': status === 'on',  // Convert to boolean
        'tapSettings.mode': finalMode  // Set mode based on the checkbox value
      },
      { new: true }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.redirect('/manager/settings'); // Redirect to the merchant's management page or any other page
  } catch (error) {
    console.error('Failed to update TAP settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





router.get("/notifications", function (req, res, next) {
  return res.render("manager/notifications", { title: "Notifications" });
});


// GET /register
router.get("/register", mid.loggedOut, function (req, res, next) {
  return res.render("manager/register", { title: "Sign Up" });
});

router.post('/register1', (req, res) => {
    // console.log('We reached the correct place and sending a message');
    res.send('Message sent successfully');
});

router.post('/register', async (req, res) => {
  try {
    // console.log('Register endpoint hit'); // Initial log for endpoint hit
    const { name, project, phone, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!name || !project || !phone || !email || !password) {
      // console.log('Validation failed'); // Log validation issues
      return res.render('main/register', { 
        error: 'جميع الحقول مطلوبة',
        formData: req.body // Pass form data back to pre-fill form
      });
    }
    
    // if (password !== confirmPassword) {
    //   return res.render('main/register', { 
    //     error: 'كلمات المرور غير متطابقة',
    //     formData: req.body
    //   });
    // }

    // Check for existing merchant
    const existingMerchant = await Merchant.findOne({ email: email.toLowerCase() });
    if (existingMerchant) {
      // console.log('Email already in use'); // Log email conflict
      return res.render('main/register', { 
        error: 'البريد الإلكتروني قيد الاستخدام بالفعل',
        formData: req.body
      });
    }

    // Create a new merchant instance
    const newMerchant = new Merchant({
      name,
      projectName: project,
      phoneNumber: phone,
      email,
      password
    });

    // Save the new merchant to the database
    await newMerchant.save(); // Save operation to persist the merchant

    // console.log('New merchant created:', newMerchant); // Log successful creation

    // Store merchant data in session
    req.session.merchant = {
      id: newMerchant._id,
      projectName: newMerchant.projectName,
      name: newMerchant.name,
      merchant_number: newMerchant.merchant_number
    };

    // Redirect or send a success message
    res.redirect('/manager'); // Redirect to a dashboard or some other page

  } catch (error) {
    console.error('Server error:', error); // Log server errors
    res.render('main/register', { 
      error: 'حدث خطأ في الخادم: ' + error.message,
      formData: req.body
    });
  }
});

router.get('/downloadExcel', (req, res) => {
    // Sample JSON data
    const jsonData = [
        { Name: 'John', Age: 30, City: 'New York' },
        { Name: 'Alice', Age: 25, City: 'Los Angeles' },
        { Name: 'Bob', Age: 35, City: 'Chicago' }
    ];

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add JSON data to the worksheet
    worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Age', key: 'age', width: 10 },
        { header: 'City', key: 'city', width: 20 }
    ];

    worksheet.addRows(jsonData);

    // Save workbook to a buffer
    workbook.xlsx.writeBuffer().then(buffer => {
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');

        // Send buffer as the response
        res.send(buffer);
    }).catch(err => {
        // console.log('Error:', err);
        res.status(500).send('Internal Server Error');
    });
});







router.post('/edit-category', upload.single('category_img'), async (req, res) => {
    var { categoryId, ArabicName, EnglishName, discountPerc, sort, status } = req.body;
  

    // Only update imgsrc if a new file is uploaded
    var imgsrc = '';
    if (req.file) {
        imgsrc = req.file.path.replace('public', '');
    } else {
        // If no new file is uploaded, use the existing image source
        // You need to retrieve it from the database as it's not provided in the form submission
        const existingCategory = await Category.findById(categoryId);
        if (existingCategory) {
            imgsrc = existingCategory.imgsrc;
        }
    }

    try {
        status = Boolean(status); // Simplify the status assignment to a boolean conversion

        // console.log('Log req.body:', req.body);
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, {
            ArabicName,
            EnglishName,
            imgsrc,
            discountPerc,
            sort,
            status
        }, { new: true });

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.redirect('/manager/category');
    } catch (error) {
        console.error('Failed to edit category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



router.post('/add-offer', upload.single('offer_image'), async (req, res) => {
  const { offerNameAr, offerNameEn, originalPrice, discountedPrice, offerQuantity, descriptionAr, descriptionEn, status, product, categories  } = req.body;

  const imgsrc = req.file ? req.file.path.replace('public', '') : 'https://via.placeholder.com/150';  // Use default if no image uploaded


  // console.log("imgsrc:" + imgsrc);

  const validOriginalPrice = originalPrice ? parseFloat(originalPrice) : 0;
  const validDiscountedPrice = discountedPrice ? parseFloat(discountedPrice) : 0;
  const validOfferQuantity = offerQuantity ? parseInt(offerQuantity, 10) : 0;

  const merchantId = req.session.merchant.id;  // Ensure we get merchantId from session

  try {
    const newOffer = new Offer({
      offer_name_ar: offerNameAr,
      offer_name_en: offerNameEn,
      offer_image: imgsrc,
      original_price: validOriginalPrice,
      discounted_price: validDiscountedPrice,
      offer_quantity: validOfferQuantity,
      description_ar: descriptionAr,
      description_en: descriptionEn,
      status: status === 'on',
      product,  // Assuming product is selected from the form
      categories: Array.isArray(categories) ? categories : [categories],  // Ensure categories is an array
      merchant: merchantId  // Link the offer to the merchant
    });

    await newOffer.save();
    res.redirect('/manager/offers');
  } catch (error) {
    console.error('Failed to add offer:', error);
    res.status(500).send('Error saving offer');
  }
});

router.post('/edit-offer/:id', upload.single('offer_image'), async (req, res) => {
  const { offerNameAr, offerNameEn, originalPrice, discountedPrice, offerQuantity, descriptionAr, descriptionEn, status, product, categories  } = req.body;

  // Get the path of the newly uploaded image, if available
  const imgsrc = req.file ? req.file.path.replace('public', '') : undefined; // Undefined if no new image is uploaded

  const validOriginalPrice = originalPrice ? parseFloat(originalPrice) : 0;
  const validDiscountedPrice = discountedPrice ? parseFloat(discountedPrice) : 0;
  const validOfferQuantity = offerQuantity ? parseInt(offerQuantity, 10) : 0;

  const merchantId = req.session.merchant.id;

  try {
    // Find the existing offer by ID and merchant
    const offer = await Offer.findOne({ _id: req.params.id, merchant: merchantId });

    if (!offer) {
      return res.status(404).send('Offer not found');
    }

    // Update the offer fields
    offer.offer_name_ar = offerNameAr;
    offer.offer_name_en = offerNameEn;
    offer.original_price = validOriginalPrice;
    offer.discounted_price = validDiscountedPrice;
    offer.offer_quantity = validOfferQuantity;
    offer.description_ar = descriptionAr;
    offer.description_en = descriptionEn;
    offer.status = status === 'on';  // Convert checkbox to boolean
    offer.product = product;


    // Update the categories field, ensuring it’s always an array
    offer.categories = Array.isArray(categories) ? categories : [categories];


    // If a new image is uploaded, update the image; otherwise, keep the old one
    if (imgsrc) {
      offer.offer_image = imgsrc;
    }

    // Save the updated offer
    await offer.save();

    res.redirect('/manager/offers');
  } catch (error) {
    console.error('Failed to edit offer:', error);
    res.status(500).send('Error editing offer');
  }
});





router.post('/add-branch', async (req, res) => {
  // Extracting fields from the request body
  var { id, status, isBusy, deliveryAvailable, pickupAvailable, scheduleAvailable, branch_name_ar, branch_name_en, addressAr, addressEn, phone, email, latitude, longitude, } = req.body;

  // console.log("id: " + id);

  status = status === 'on' ? true : false;
  isBusy = isBusy === 'on' ? true : false;
  deliveryAvailable = deliveryAvailable === 'on' ? true : false;
  pickupAvailable = pickupAvailable === 'on' ? true : false;
  scheduleAvailable = scheduleAvailable === 'on' ? true : false;

  const merchantId = req.session.merchant.id;

  try {
    let branch;
    if (id) {
      // Update existing branch
      // console.log("Update existing branch");
      branch = await Branch.findByIdAndUpdate(id, {
        status: status,
        latitude: latitude,
        longitude: longitude,        
        isBusy: isBusy,
        deliveryAvailable: deliveryAvailable,
        pickupAvailable: pickupAvailable,
        scheduleAvailable: scheduleAvailable,
        branch_name_ar: branch_name_ar,
        branch_name_en: branch_name_en,
        addressAr: addressAr,
        addressEn: addressEn,
        phone: phone,
        email: email,
        merchant: merchantId
      });
    } else {
      // Create new branch
      // console.log("Create new branch");
      branch = new Branch({
        status: status,
        latitude: latitude,
        longitude: longitude,       
        isBusy: isBusy,
        deliveryAvailable: deliveryAvailable,
        pickupAvailable: pickupAvailable,
        scheduleAvailable: scheduleAvailable,
        branch_name_ar: branch_name_ar,
        branch_name_en: branch_name_en,
        addressAr: addressAr,
        addressEn: addressEn,
        phone: phone,
        email: email,
        merchant: merchantId
      });
    }

    await branch.save();
    res.redirect('/manager/branch');
  } catch (error) {
    console.error('Failed to add/update branch', error);
    res.status(500).send('Error saving branch');
  }
});



// POST route to add or update a customer
router.post('/add-customer', async (req, res) => {
  const { name, email, phone, password, confirmPassword, country, id } = req.body;
  const merchantId = req.session.merchant.id;

  try {
    // Check if there's an ID to determine if updating or creating a new customer
    if (id) {
      let updateObject = {
        name,
        email,
        phone,
        country,
        merchant: merchantId
      };

      // Include password in the update only if it's provided and confirmed
      if (password && confirmPassword) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        updateObject.password = password; // Assuming password hashing is handled in pre-save middleware
      }

      // Find the customer by ID and update
      const updatedCustomer = await Customer.findByIdAndUpdate(id, updateObject, { new: true, omitUndefined: true });
      if (!updatedCustomer) {
        throw new Error('Customer not found');
      }

      res.redirect('/manager/customers');
    } else {
      // No ID provided, create a new customer
      // Ensure both password and confirmPassword are provided and match
      if (password || confirmPassword) { // Check if either field is provided
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
      } else {
        throw new Error('Passwords or ConfirmaPassword are not provided');
      }

      const newCustomer = new Customer({
        name,
        email,
        phone,
        password, // Ensure password is hashed in the model's pre-save middleware
        country,
        merchant: merchantId
      });

      // Save the new customer
      await newCustomer.save();
      res.redirect('/manager/customers');
    }
  } catch (error) {
    // Handle errors and send back an appropriate response
    console.error('Failed to add or update customer:', error);
    res.status(400).render('add-customer', {
      error: error.message,
      customer: req.body // Send back the input data to refill the form in case of error
    });
  }
});






router.post('/merchant/settings', async (req, res) => {
  try {
    // console.log("Full req.body: ", JSON.stringify(req.body, null, 2));

    const notifications = {};

    const isEnabled = (value) => {
      if (Array.isArray(value)) {
        return value.includes('on');
      }
      return value === 'on';
    };

    // Map the notification settings using the received values
    notifications.newOrder = {
      merchantNotification: {
        enabled: isEnabled(req.body['notifications[newOrder][merchantNotification][enabled]']),
        text: {
          en: req.body['notifications[newOrder][merchantNotification][text][en]'] || '',
          ar: req.body['notifications[newOrder][merchantNotification][text][ar]'] || ''
        }
      },
      customerNotification: {
        enabled: isEnabled(req.body['notifications[newOrder][customerNotification][enabled]']),
        text: {
          en: req.body['notifications[newOrder][customerNotification][text][en]'] || '',
          ar: req.body['notifications[newOrder][customerNotification][text][ar]'] || ''
        }
      },
      subUserNotification: {
        enabled: isEnabled(req.body['notifications[newOrder][subUserNotification][enabled]'])
      }
    };

    notifications.orderStatusUpdate = {
      customerNotification: {
        text: {
          en: req.body['notifications[orderStatusUpdate][customerNotification][text][en]'] || '',
          ar: req.body['notifications[orderStatusUpdate][customerNotification][text][ar]'] || ''
        }
      }
    };

    // Split the emailRecipients string by semicolon, trim whitespace, and remove empty strings
    const emailRecipients = req.body.emailRecipients
      .split(';')
      .map(email => email.trim()) // Manually trim whitespace
      .filter(email => email); // Remove empty strings

    // console.log("Processed notifications: ", JSON.stringify(notifications, null, 2));
    // console.log("Email Recipients: ", emailRecipients);

    // Fetch the merchant document from the database using session ID
    const merchantId = req.session.merchant.id;
    let merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).send('Merchant not found');
    }

    // Update the merchant's notifications settings
    merchant.notifications = notifications;

    // Update the merchant's email recipients
    merchant.emailRecipients = emailRecipients;

    // Save the updated merchant document
    await merchant.save();

    // Redirect back to the settings page
    res.redirect('/manager/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



// POST route for updating payment settings
router.post('/merchant/payment', async (req, res) => {
  try {
    // Get the merchant ID from the session (adjust as needed)
    const merchantId = req.session.merchant.id;

    // Find the merchant in the database
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).send('Merchant not found');
    }

    // console.log("Full req.body: ", JSON.stringify(req.body, null, 2));

    // Update cash and KNET payment settings based on form submission
    merchant.cashEnabled = req.body.cashEnabled === 'on' ? true : false;
    merchant.knetEnabled = req.body.knetEnabled === 'on' ? true : false;

    // Save the updated merchant settings
    await merchant.save();

    // Redirect back to the settings page
    res.redirect('/manager/settings');
  } catch (err) {
    console.error('Error updating payment settings:', err);
    res.status(500).send('Server error');
  }
});


// Route to delete an offer
router.post('/offer/delete', async (req, res) => {
  try {
    const { offerToDeleteID } = req.body;
    await Offer.findByIdAndDelete(offerToDeleteID);
    res.redirect('/manager/offers'); // Redirect back to offers page after deletion
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).send("Failed to delete offer");
  }
});


// GET /cash/transactions
router.get('/cash/transactions', async (req, res) => {
    try {
        const merchantId = req.session.merchant.id;

        // Fetch cash transactions and balance in parallel
        const [cashTransactions, balance] = await Promise.all([
            CashTransaction.find({ merchant: merchantId }).sort({ date: -1 }),
            Balance.findOne({ merchant: merchantId })
        ]);

        // Check if transactions are empty
        if (!cashTransactions || cashTransactions.length === 0) {
            return res.status(404).json({ error: 'No cash transactions found' });
        }

        // Render the view with both transactions and balance
        res.render('manager/cashTransactions', {
            title: 'Cash Transactions',
            cashTransactions,
            balance: balance || null // Pass null if no balance is found
        });
    } catch (error) {
        console.error('Error fetching cash transactions or balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// POST /manager/cash/balance
router.post('/cash/balance', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Get merchant ID from the session
    const { name } = req.body;

    // Validate the 'name' field
    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم الرصيد مطلوب' });
    }

    // Check for existing balance with the same name
    const merchant = await Merchant.findById(merchantId);
    if (merchant.balances.some(balance => balance.name === name)) {
      return res.status(400).json({ success: false, message: 'يوجد رصيد بنفس الاسم' });
    }

    // Add the new balance to the merchant's balances array
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      merchantId,
      {
        $push: { balances: { name } } // Do not include 'balance' explicitly; it will default to 0
      },
      { new: true }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ success: false, message: 'التاجر غير موجود' });
    }

    res.json({ success: true, message: 'تم إضافة الرصيد بنجاح', balances: updatedMerchant.balances });
  } catch (error) {
    console.error('Error adding balance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة الرصيد' });
  }
});



router.get('/cash/balance', async (req, res) => {
  try {
    // Check if the merchant session exists
    if (!req.session.merchant) {
      // Redirect to the login page if not logged in
      return res.redirect('/manager/login');
    }

    const merchantId = req.session.merchant.id; // Merchant ID from session
    const merchant = await Merchant.findById(merchantId).exec();

    if (!merchant) {
      // Redirect to the login page if the merchant is not found
      return res.redirect('/manager/login');
    }

    res.render('manager/balance', {
      title: 'Balance',
      balances: merchant.balances,
      paymentMethods: merchant.paymentMethods
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    // Optionally redirect to an error page or handle the error gracefully
    res.status(500).send('Internal server error');
  }
});


// Delete and Edit Routes for Balances and Payment Methods

// DELETE /manager/cash/balance/:id - Delete a Balance
router.delete('/cash/balance/:id', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Ensure merchant is authenticated
    const { id } = req.params;

    // Update the merchant schema to remove the balance by ID
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { _id: merchantId },
      { 
        $pull: { balances: { _id: id } },
        $set: { 
          'paymentMethods.$[elem].balance': null,  // Unset the balance from associated payment methods
          'paymentMethods.$[elem].enabled': false,  // Disable payment methods linked to this balance
          'paymentMethods.$[elem].enableFeeCalculation': false  // Disable payment methods linked to this balance
        }
      },
      { 
        new: true,
        arrayFilters: [{ 'elem.balance': id }]  // Apply filter to update paymentMethods that are linked to this balance
      }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ success: false, message: 'الرصيد غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف الرصيد بنجاح' });
  } catch (error) {
    console.error('Error deleting balance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف الرصيد' });
  }
});

// DELETE /manager/cash/payment-method/:id - Delete a Payment Method
router.delete('/cash/payment-method/:id', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Ensure merchant is authenticated
    const { id } = req.params;

    // Update the merchant schema to remove the payment method by ID
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { _id: merchantId },
      { $pull: { paymentMethods: { _id: id } } },
      { new: true }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ success: false, message: 'وسيلة الدفع غير موجودة' });
    }

    res.json({ success: true, message: 'تم حذف وسيلة الدفع بنجاح' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف وسيلة الدفع' });
  }
});

// POST /manager/cash/balance/edit - Edit a Balance
router.post('/cash/balance/edit', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Ensure merchant is authenticated
    const { balanceId, name, balance } = req.body;

    console.log("Received req.body:", req.body);
    
    // Update the balance in the merchant schema
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { _id: merchantId, 'balances._id': balanceId },
      { 
        $set: { 
          'balances.$.name': name,
          'balances.$.balance': parseFloat(balance) || 0
        } 
      },
      { new: true }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ success: false, message: 'الرصيد غير موجود' });
    }

    res.json({ success: true, message: 'تم تعديل الرصيد بنجاح' });
  } catch (error) {
    console.error('Error editing balance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل الرصيد' });
  }
});

// POST /manager/cash/payment-method/edit - Edit a Payment Method
router.post('/cash/payment-method/edit', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id; // Ensure merchant is authenticated
    const { paymentMethodId, name, fee, feeType, balance } = req.body;

    // Update the payment method in the merchant schema
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { _id: merchantId, 'paymentMethods._id': paymentMethodId },
      {
        $set: {
          'paymentMethods.$.name': name,
          'paymentMethods.$.fee': fee,
          'paymentMethods.$.feeType': feeType,
          'paymentMethods.$.balance': balance
        }
      },
      { new: true }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ success: false, message: 'وسيلة الدفع غير موجودة' });
    }

    res.json({ success: true, message: 'تم تعديل وسيلة الدفع بنجاح' });
  } catch (error) {
    console.error('Error editing payment method:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل وسيلة الدفع' });
  }
});


// POST /manager/cash/payment-method/toggle - Toggle payment method status
router.post('/cash/payment-method/toggle', async (req, res) => {
  try {
    const merchantId = req.session.merchant.id;
    const { id, enabled, enableFeeCalculation } = req.body;

    // Find the merchant and check the specific payment method
    const merchant = await Merchant.findOne(
      { _id: merchantId, 'paymentMethods._id': id },
      { 'paymentMethods.$': 1 }
    );

    if (!merchant) {
      return res.status(404).json({ success: false, message: 'وسيلة الدفع غير موجودة' });
    }

    const paymentMethod = merchant.paymentMethods[0];

    // Prevent enabling if balance is null or undefined
    if (enabled && !paymentMethod.balance) {
      return res.status(400).json({ success: false, message: 'لا يمكن تفعيل وسيلة الدفع بدون حساب مرتبط' });
    }

    // Update object based on which parameter was passed
    const updateObj = {};
    if (typeof enabled !== 'undefined') {
      updateObj['paymentMethods.$.enabled'] = enabled;
    }
    if (typeof enableFeeCalculation !== 'undefined') {
      updateObj['paymentMethods.$.enableFeeCalculation'] = enableFeeCalculation;
    }

    // Update the payment method's status
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { _id: merchantId, 'paymentMethods._id': id },
      { $set: updateObj },
      { new: true }
    );

    const message = typeof enableFeeCalculation !== 'undefined' 
      ? 'تم تحديث حالة حساب الرسوم بنجاح'
      : 'تم تحديث حالة وسيلة الدفع بنجاح';

    res.json({ success: true, message });

  } catch (error) {
    console.error('Error toggling payment method:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث حالة وسيلة الدفع' });
  }
});


router.post('/cash/payment-method', async (req, res) => {
  try {
    // Check if the merchant session exists
    if (!req.session.merchant) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
    }

    const merchantId = req.session.merchant.id;
    const { name, fee, feeType, balance } = req.body;

    console.log("req.body:", req.body);

    // Validate input
    if (!name || !feeType || !balance) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Fetch the merchant
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found.' });
    }

    // Check if the referenced balance exists in the merchant's balances
    const linkedBalance = merchant.balances.find((b) => b._id.toString() === balance);
    if (!linkedBalance) {
      return res.status(400).json({ success: false, message: 'Invalid balance ID.' });
    }

    console.log("balance",balance);
    // Add the new payment method to the merchant
    const newPaymentMethod = {
      name,
      fee: fee || 0, // Default fee to 0 if not provided
      feeType,
      balance: new mongoose.Types.ObjectId(balance)
    };

    console.log("newPaymentMethod",newPaymentMethod);

    merchant.paymentMethods.push(newPaymentMethod);

    // Save the merchant document
    await merchant.save();

    // Send a success response
    res.json({
      success: true,
      message: 'Payment method added successfully.',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});





// router.post('/cash/balance', async (req, res) => {
//   try {
//     const merchantId = req.session.merchant.id; // Ensure this is correctly populated
//     if (!merchantId) {
//       return res.status(400).json({ success: false, message: 'Merchant ID is missing' });
//     }

//     const existingBalance = await Balance.findOne({ merchant: merchantId });
//     if (existingBalance) {
//       return res.status(400).json({ success: false, message: 'Balance already exists' });
//     }

//     const newBalance = new Balance({
//       merchant: merchantId,
//       shopBalance: 0,
//       bankBalance: 0
//     });

//     await newBalance.save();
//     res.status(200).json({ success: true, balance: newBalance });
//   } catch (error) {
//     console.error('Error creating balance:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// });




router.post('/update-balance/shop', async (req, res) => {
  const { shopBalance } = req.body;
  const merchantId = req.session.merchant.id;
  const adjustmentMethod = 'admin'; // Determine method based on role

  if (!shopBalance || isNaN(shopBalance)) {
    return res.status(400).json({ success: false, message: 'Invalid shop balance value.' });
  }

  try {
    // Fetch the current balance
    const balance = await Balance.findOne({ merchant: merchantId });
    if (!balance) {
      return res.status(404).json({ success: false, message: 'Balance not found for the merchant.' });
    }

    const currentShopBalance = balance.shopBalance || 0; // Use 0 if balance is not defined
    const newShopBalance = parseFloat(shopBalance);
    const amount = Math.abs(newShopBalance - currentShopBalance); // Calculate the amount of adjustment
    const type = newShopBalance > currentShopBalance ? 'inflow' : 'outflow'; // Determine the type of adjustment

    // Log the adjustment as a transaction
    const cashTransaction = new CashTransaction({
      transaction_sr_number: Date.now(), // Generate a unique number
      merchant: merchantId,
      amount: amount,
      method: adjustmentMethod,
      type: type,
      source: 'shop',
      status: 'completed',
      description: `تم تعديل الكاش عن طريق ${adjustmentMethod}.`
    });

    await cashTransaction.save();

    // res.status(200).json({ 
    //   success: true, 
    //   message: 'Shop balance adjustment logged successfully.', 
    //   transaction: cashTransaction 
    // });

    return res.redirect('back');
  } catch (error) {
    console.error('Error logging shop balance adjustment:', error);
    res.status(500).json({ success: false, message: 'Failed to log shop balance adjustment.' });
  }
});


router.post('/update-balance/bank', async (req, res) => {
  const { bankBalance } = req.body;
  const merchantId = req.session.merchant.id;
  const adjustmentMethod = 'admin'; // Determine method based on role

  if (!bankBalance || isNaN(bankBalance)) {
    return res.status(400).json({ success: false, message: 'Invalid bank balance value.' });
  }

  try {
    // Fetch the current balance
    const balance = await Balance.findOne({ merchant: merchantId });
    if (!balance) {
      return res.status(404).json({ success: false, message: 'Balance not found for the merchant.' });
    }

    const currentBankBalance = balance.bankBalance || 0; // Use 0 if balance is not defined
    const newBankBalance = parseFloat(bankBalance);
    const amount = Math.abs(newBankBalance - currentBankBalance); // Calculate the amount of adjustment
    const type = newBankBalance > currentBankBalance ? 'inflow' : 'outflow'; // Determine the type of adjustment

    // Log the adjustment as a transaction
    const cashTransaction = new CashTransaction({
      transaction_sr_number: Date.now(), // Generate a unique number
      merchant: merchantId,
      amount: amount,
      method: adjustmentMethod,
      type: type,
      source: 'bank',
      status: 'completed',
      description: `تم تعديل رصيد البنك عن طريق ${adjustmentMethod}.`
    });

    await cashTransaction.save();

    // Redirect back to the same page after logging the transaction
    return res.redirect('back');
  } catch (error) {
    console.error('Error logging bank balance adjustment:', error);
    res.status(500).json({ success: false, message: 'Failed to log bank balance adjustment.' });
  }
});




module.exports = router;
