const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing connection to:', process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection error:');
    console.error(err.message);
    if (err.message.includes('IP')) {
        console.error('This looks like an IP Whitelisting issue on MongoDB Atlas.');
    }
    process.exit(1);
  });
