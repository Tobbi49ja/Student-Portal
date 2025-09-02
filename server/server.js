require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const apiRouter = require('./routes/api');
const bcrypt = require('bcrypt');
const dns = require('dns').promises;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Load env vars
const localMongoUri = process.env.LOCAL_URI;
const atlasMongoUri = process.env.ATLAS_URI;
const jwtSecret = process.env.JWT_SECRET;
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD;
const port = process.env.PORT || 8000;

// Debug check
console.log("🔑 ENV CHECK:");
console.log("LOCAL_URI:", localMongoUri ? "✅ Loaded" : "❌ Missing");
console.log("ATLAS_URI:", atlasMongoUri ? "✅ Loaded" : "❌ Missing");
console.log("JWT_SECRET:", jwtSecret ? "✅ Loaded" : "❌ Missing");
console.log("ADMIN_PASSWORD:", adminPassword ? "✅ Loaded" : "❌ Missing");

if (!atlasMongoUri || !jwtSecret || !adminPassword) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Connection options
const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
};

// Internet check
async function isOnline() {
  try {
    await dns.lookup('google.com');
    return true;
  } catch {
    return false;
  }
}

// Create admin
async function createAdminAccount(db) {
  const StudentModel = db.model('Student', require('./models/student').schema);
  const existingAdmin = await StudentModel.findOne({ username: adminUsername });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const studentId = `STU-${new Date().getFullYear()}-0001`;
    const admin = new StudentModel({
      studentId,
      name: 'Admin User',
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
    });
    await admin.save();
    console.log(`✅ Admin account created (${adminUsername})`);
  } else {
    console.log(`ℹ️ Admin already exists (${adminUsername})`);
  }
}

// Main connection
const connectToMongoDB = async () => {
  const online = await isOnline();

  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    // 🚀 On Render: only use Atlas
    console.log("🌐 Production mode → connecting only to Atlas");
    await mongoose.connect(atlasMongoUri, connectionOptions);
    console.log("✅ Connected to MongoDB Atlas");
    await createAdminAccount(mongoose.connection);
    app.locals.dbEnv = "atlas";
  } else {
    // 🖥️ Local dev: use Atlas if online, else local
    if (online && atlasMongoUri) {
      console.log("🌐 Online → trying Atlas");
      await mongoose.connect(atlasMongoUri, connectionOptions);
      console.log("✅ Connected to MongoDB Atlas");
      app.locals.dbEnv = "atlas";
    } else if (localMongoUri) {
      console.log("🖥️ Offline → using Local MongoDB");
      await mongoose.connect(localMongoUri, connectionOptions);
      console.log("✅ Connected to Local MongoDB");
      app.locals.dbEnv = "local";
    } else {
      console.error("❌ No valid MongoDB URI available");
      process.exit(1);
    }
    await createAdminAccount(mongoose.connection);
  }
};

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} → DB: ${app.locals.dbEnv || 'unknown'}`);
  next();
});

app.use('/', apiRouter);

connectToMongoDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
});
