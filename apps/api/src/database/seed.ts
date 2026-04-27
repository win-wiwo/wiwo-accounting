import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prams';

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String, default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    const existingAdmin = await User.findOne({
      $or: [{ email: 'admin@prams.com' }, { employeeId: 'EMP-0001' }],
    });
    if (existingAdmin) {
      console.log('Admin user already exists, skipping seed');
      await mongoose.disconnect();
      return;
    }

    const passwordHash = await bcrypt.hash('Admin@1234', 12);

    await User.create({
      employeeId: 'EMP-0001',
      email: 'admin@prams.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
    });

    console.log('Admin user created successfully');
    console.log('  Email: admin@prams.com');
    console.log('  Password: Admin@1234');

    await mongoose.disconnect();
    console.log('Seed complete');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
