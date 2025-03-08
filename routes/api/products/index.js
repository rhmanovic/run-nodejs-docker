const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');


const { Merchant, Category, Order, Product, Branch, Customer, Offer, CashTransaction, Balance, Subuser, Purchase } = require("./models");

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


// Route to create a new product
router.post('/create/:merchantId', upload.single('product_image'), async (req, res) => {
  try {
    const merchantId = req.params.merchantId;
    const {
      product_number, product_name_en, product_name_ar, category_number, category, order_command, weight,
      keywords, youtube_video_id, description_ar, description_en,
      sale_price, purchase_price = 0, purchase_limit = 0, barcode, v_original_id = [],
      pdt_discount_type = '', pdt_discount = 0, Stock = 0, brand, warranty, 
      warehouse_stock = 0,
      v_name_en = [], v_name_ar = [], v_sale_price = [], v_purchase_price = [],
      v_available_quantity = [], v_warehouse_stock = [], v_purchase_limit = [],
      v_barcode = [], v_brand = [], v_warranty = [], v_show = []
    } = req.body;

    // Create variations array
    let variations = [];
    if (v_name_en.length > 0) {
      variations = v_name_en.map((_, index) => {
        const newId = new mongoose.Types.ObjectId();
        return {
          _id: newId,
          v_original_id: newId,
          v_name_en: v_name_en[index] || '',
          v_name_ar: v_name_ar[index] || '',
          v_sale_price: v_sale_price[index] || 0,
          v_purchase_price: v_purchase_price[index] || 0,
          v_available_quantity: v_available_quantity[index] || 0,
          v_show: v_show[index] === 'true' || v_show[index] === true,
          v_warehouse_stock: v_warehouse_stock[index] || 0,
          v_purchase_limit: v_purchase_limit[index] || 0,
          v_barcode: v_barcode[index] || '',
          v_brand: v_brand[index] || '',
          v_warranty: v_warranty[index] || ''
        };
      });
    }

    // Create the new product with proper boolean values
    const product = new Product({
      product_number,
      product_name_en,
      product_name_ar,
      category_number,
      category,
      brand,
      warranty,
      order_command: order_command || 0,
      weight: weight || 0,
      keywords: keywords || '',
      product_image: req.file ? req.file.path.replace('public', '') : '',
      youtube_video_id: youtube_video_id || '',
      options: false,
      standard_sizes: false,
      description_ar: description_ar || '',
      description_en: description_en || '',
      merchant: merchantId,
      sale_price: sale_price || 0,
      purchase_price,
      purchase_limit,
      warehouse_stock,
      barcode: barcode || '',
      pdt_discount_type: pdt_discount_type || 'nodiscount',
      pdt_discount: Number(pdt_discount) || 0,
      Stock: Stock || 0,
      barcodes: JSON.parse(req.body.barcodes || '[]'),
      variations
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});







// ✅ Route: Update Product
router.post('/update/:merchantId/:productNumber', upload.single('product_image'), async (req, res) => {
  try {
    console.log("📥 Product Update Request Received");

    const { merchantId, productNumber } = req.params;
    const updatedFields = req.body;

    // 1️⃣ Validate and Find Product (Get Previous Stock Before Editing)
    const product = await validateAndFindProduct(merchantId, productNumber);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const previousStock = product.Stock; // ✅ Ensure we use the original stock

    // 2️⃣ Convert Numeric Fields
    convertNumericFields(updatedFields);

    // 3️⃣ Set Product Update Log
    setProductUpdateLog(product, updatedFields, req, previousStock);

    // 4️⃣ Update Product Fields
    updateProductFields(product, updatedFields);

    // 5️⃣ Handle Image Upload
    handleProductImage(product, req);

    // 6️⃣ Handle Variations Update
    updateProductVariations(product, updatedFields);

    // 7️⃣ Append to Product Logs (with Correct Previous Stock)
    logProductUpdate(product, updatedFields, previousStock);

    // ✅ Save Updated Product
    await product.save();

    res.status(200).json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('❌ Failed to update product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

// ✅ 1️⃣ Validate and Find Product
async function validateAndFindProduct(merchantId, productNumber) {
  return await Product.findOne({ product_number: productNumber, merchant: merchantId });
}

// ✅ 2️⃣ Convert Numeric Fields
function convertNumericFields(fields) {
  const numericFields = [
    'order_command', 'purchase_limit', 'warehouse_stock',
    'sale_price', 'purchase_price', 'Stock', 'pdt_discount'
  ];

  numericFields.forEach(field => {
    fields[field] = fields[field] === 'null' || !fields[field] ? 0 : Number(fields[field]);
  });
}

// ✅ 3️⃣ Set Product Update Log
function setProductUpdateLog(product, fields, req, previousStock) {
  product.tempLog = {
    changeSource: 'Manual Update via POS / تعديل يدوي من نقطة المبيعات',
    context: {
      merchantId: req.params.merchantId,
      adjustedBy: req.session.userId || 'System', // The user making the update
      reason: 'Product details updated / تعديل تفاصيل المنتج',
      previousStock: previousStock, // ✅ Use previous stock
      updatedStock: fields.Stock || previousStock, // Updated stock value
    },
  };
}

// ✅ 4️⃣ Update Product Fields
function updateProductFields(product, fields) {
  Object.assign(product, {
    product_name_en: fields.product_name_en,
    product_name_ar: fields.product_name_ar,
    brand: fields.brand,
    warranty: fields.warranty,
    order_command: fields.order_command || 0,
    weight: fields.weight || 0,
    keywords: fields.keywords || '',
    description_ar: fields.description_ar || '',
    description_en: fields.description_en || '',
    sale_price: fields.sale_price || 0,
    purchase_price: fields.purchase_price || 0,
    purchase_limit: fields.purchase_limit || 0,
    barcode: fields.barcode || '',
    pdt_discount_type: fields.pdt_discount_type || 'nodiscount',
    pdt_discount: Number(fields.pdt_discount) || 0,
    Stock: fields.Stock || 0,
    warehouse_stock: fields.warehouse_stock || 0,
    barcodes: JSON.parse(fields.barcodes || '[]'),
    youtube_video_id: fields.youtube_video_id || '',
  });
}

// ✅ 5️⃣ Handle Product Image
function handleProductImage(product, req) {
  if (req.file) {
    product.product_image = req.file.path.replace('public', '');
  }
}

// ✅ 6️⃣ Handle Variations Update
function updateProductVariations(product, fields) {
  if (fields.v_name_en && fields.v_name_en.length > 0) {
    product.variations = fields.v_name_en.map((name, index) => ({
      _id: product.variations[index]?._id || new mongoose.Types.ObjectId(),
      name_en: name,
      name_ar: fields.v_name_ar[index],
      sale_price: fields.v_sale_price[index] || 0,
      purchase_price: fields.v_purchase_price[index] || 0,
      available_quantity: fields.v_available_quantity[index] || 0,
      warehouse_stock: fields.v_warehouse_stock[index] || 0,
      purchase_limit: fields.v_purchase_limit[index] || 0,
      barcode: fields.v_barcode[index] || '',
      brand: fields.v_brand[index] || '',
      warranty: fields.v_warranty[index] || '',
      show: fields.v_show[index] === 'true' || fields.v_show[index] === true
    }));
  }
}

// ✅ 7️⃣ Append to Product Logs (Using Correct Previous Stock)
function logProductUpdate(product, fields, previousStock) {
  const updatedStock = fields.Stock !== undefined ? fields.Stock : previousStock;

  const logEntry = {
    date: new Date(),
    quantity: updatedStock - previousStock, // ✅ Correct stock change calculation
    stockBefore: previousStock, // ✅ Ensure it's the real previous stock
    stockAfter: updatedStock,
    // salePrice: fields.sale_price !== undefined ? fields.sale_price : product.sale_price,
    // cost: fields.purchase_price !== undefined ? fields.purchase_price : product.purchase_price,
    status: "manual",
    note: `Product updated manually. Changes made to stock: ${previousStock} → ${updatedStock}`
  };

  console.log("📝 Log Entry:", logEntry);
  product.productLogs.push(logEntry);
}




module.exports = router;
