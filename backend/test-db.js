const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const products = await Product.find({ myBCAUser: 'U2FsdGVkX19MPUVc7fKKSabIE57ci1DM9bdU8HYKf9I=' });
    if (products.length > 0) {
      console.log(`Product found! Created At: ${products[0].createdAt}`);
    } else {
      console.log("Not found.");
    }
    process.exit(0);
  });
