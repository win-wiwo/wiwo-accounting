/**
 * Standalone script to download DiceBear avatars for all existing users
 * and update their photoUrl in MongoDB.
 *
 * Run inside the API container:
 *   npx ts-node src/database/download-avatars.ts
 */
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as https from 'https';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prams';
const USER_PHOTOS_DIR = join(process.cwd(), 'uploads', 'user-photos');

const userSchema = new mongoose.Schema({
  employeeId: String,
  firstName: String,
  lastName: String,
  role: String,
  photoUrl: String,
}, { timestamps: true, strict: false });

const User = mongoose.model('User', userSchema, 'users');

function buildUrl(firstName: string, lastName: string): string {
  const seed = encodeURIComponent(`${firstName} ${lastName}`);
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&size=128&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(USER_PHOTOS_DIR, { recursive: true });

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({});
  console.log(`Found ${users.length} users`);

  let downloaded = 0;
  let skipped = 0;

  for (const user of users) {
    const employeeId = (user.employeeId as string) || String(user._id);
    const firstName = user.firstName as string;
    const lastName = user.lastName as string;
    const role = user.role as string;

    const filename = `${employeeId.toLowerCase()}.png`;
    const filePath = join(USER_PHOTOS_DIR, filename);
    const localUrl = `/uploads/user-photos/${filename}`;

    if (!fs.existsSync(filePath)) {
      const url = buildUrl(firstName, lastName);
      await downloadFile(url, filePath);
      downloaded++;
      process.stdout.write(`  Downloaded: ${firstName} ${lastName}\n`);
    } else {
      skipped++;
    }

    await User.updateOne({ _id: user._id }, { photoUrl: localUrl });
  }

  console.log(`\nDone. Downloaded: ${downloaded}, Already existed: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
