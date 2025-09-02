require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const apiRouter = require('./routes/api');
const Student = require('./models/student');
const bcrypt = require('bcrypt');
const dns = require('dns').promises;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Load from .env
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

if (!localMongoUri || !atlasMongoUri || !jwtSecret || !adminPassword) {
  console.error('❌ Missing required environment variables in .env');
  process.exit(1);
}

const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
};

let atlasConnection = null;
let localConnection = null;
let atlasReady = false;
let localReady = false;

// Internet check
async function isOnline() {
  try {
    await dns.lookup('google.com');
    console.log("🌐 Internet check: DNS google.com OK");
    return true;
  } catch (err) {
    console.warn("DNS check failed:", err.message);
    console.error("❌ No internet detected");
    return false;
  }
}

// Generate student ID
async function generateStudentId(db) {
  const StudentModel = db.model('Student', require('./models/student').schema);
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;
  const lastStudent = await StudentModel.findOne({ studentId: { $regex: `^${prefix}` } })
    .sort({ studentId: -1 });
  let nextNumber = 1;
  if (lastStudent && lastStudent.studentId) {
    const lastNumber = parseInt(lastStudent.studentId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// Create admin
async function createAdminAccount(db, connectionType) {
  const StudentModel = db.model('Student', require('./models/student').schema);
  const existingAdmin = await StudentModel.findOne({ username: adminUsername });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const studentId = await generateStudentId(db);
    const admin = new StudentModel({
      studentId,
      name: 'Admin User',
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
    });
    await admin.save();
    console.log(`${connectionType}: ✅ Admin account created (${adminUsername})`);
  } else {
    console.log(`${connectionType}: ℹ️ Admin already exists (${adminUsername})`);
  }
}

// Sync local ↔ Atlas (username-aware + _id safe)
async function syncDatabases() {
  if (!atlasConnection || !localConnection) {
    console.log('⚠️ Sync skipped: Both connections not available');
    return;
  }
  try {
    const AtlasStudent = atlasConnection.model('Student', require('./models/student').schema);
    const LocalStudent = localConnection.model('Student', require('./models/student').schema);

    // Atlas → Local
    const atlasStudents = await AtlasStudent.find();
    for (const a of atlasStudents) {
      const l = await LocalStudent.findOne({
        $or: [{ studentId: a.studentId }, { username: a.username }]
      });
      if (!l) {
        const obj = a.toObject();
        delete obj._id;
        await new LocalStudent(obj).save();
      } else if (l.updatedAt < a.updatedAt) {
        const obj = a.toObject();
        delete obj._id;
        await LocalStudent.findOneAndUpdate(
          { $or: [{ studentId: a.studentId }, { username: a.username }] },
          obj,
          { new: true, overwrite: true }
        );
      }
    }

    // Local → Atlas
    const localStudents = await LocalStudent.find();
    for (const l of localStudents) {
      const a = await AtlasStudent.findOne({
        $or: [{ studentId: l.studentId }, { username: l.username }]
      });
      if (!a) {
        const obj = l.toObject();
        delete obj._id;
        await new AtlasStudent(obj).save();
      } else if (a.updatedAt < l.updatedAt) {
        const obj = l.toObject();
        delete obj._id;
        await AtlasStudent.findOneAndUpdate(
          { $or: [{ studentId: l.studentId }, { username: l.username }] },
          obj,
          { new: true, overwrite: true }
        );
      }
    }

    console.log('🔄 Database sync completed');
  } catch (err) {
    console.error('❌ Sync error:', err.message);
  }
}

// Only sync once both DBs are ready
async function trySync() {
  if (atlasReady && localReady) {
    console.log("🔄 Both DBs ready → syncing now...");
    await syncDatabases();
  }
}

// Connect
const connectToMongoDB = async () => {
  try {
    const online = await isOnline();

    if (online && atlasMongoUri) {
      console.log('🌐 Internet detected. Trying Atlas with:', atlasMongoUri.replace(/:([^:@]+)@/, ':<hidden>@'));
      atlasConnection = mongoose.createConnection(atlasMongoUri, connectionOptions);
      atlasConnection.on('connected', async () => {
        console.log('✅ Connected to MongoDB Atlas');
        app.locals.dbEnv = 'atlas';
        atlasReady = true;
        await createAdminAccount(atlasConnection, 'Atlas');
        await trySync();
      });
      atlasConnection.on('error', err => {
        console.error('❌ Atlas connection error:', err.message);
      });
    } else {
      console.warn('⚠️ Offline OR missing ATLAS_URI → skipping Atlas');
    }

    localConnection = mongoose.createConnection(localMongoUri, connectionOptions);
    localConnection.on('connected', async () => {
      console.log('✅ Connected to Local MongoDB');
      if (!atlasConnection) app.locals.dbEnv = 'local';
      localReady = true;
      await createAdminAccount(localConnection, 'Local');
      await trySync();
    });

    mongoose.set('strictQuery', true);
    await mongoose.connect(localMongoUri, connectionOptions);
  } catch (err) {
    console.error('❌ MongoDB setup failed:', err.message);
    process.exit(1);
  }
};

// 🔎 Middleware: log which DB is currently active per request
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} → DB in use: ${app.locals.dbEnv || 'unknown'}`);
  next();
});

app.use('/', apiRouter);

// Periodic sync every 5 min if both are connected
setInterval(async () => {
  if (await isOnline() && atlasConnection && localConnection) {
    await syncDatabases();
  }
}, 5 * 60 * 1000);

connectToMongoDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
});
