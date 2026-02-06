// Migrate Existing Images to Cloudinary
// This script uploads all your current product images to Cloudinary
// Place this in: server/src/scripts/migrate-images-to-cloudinary.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { uploadImage } = require('../config/cloudinary');

const prisma = new PrismaClient();

async function migrateImagesToCloudinary() {
  console.log('🚀 Starting image migration to Cloudinary...\n');

  try {
    // Fetch all products with images
    const products = await prisma.product.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        partNumber: true,
        imageUrl: true,
      },
    });

    console.log(`📸 Found ${products.length} products with images\n`);

    if (products.length === 0) {
      console.log('✅ No products with images found. Nothing to migrate.');
      await prisma.$disconnect();
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;

      console.log(`${progress} Processing: ${product.name}`);

      // Skip if already using Cloudinary
      if (product.imageUrl.includes('cloudinary.com')) {
        console.log(`   ⏭️  Already on Cloudinary, skipping\n`);
        skipCount++;
        continue;
      }

      // Skip if not base64 or URL
      if (!product.imageUrl.startsWith('data:image') && !product.imageUrl.startsWith('http')) {
        console.log(`   ⚠️  Invalid image format, skipping\n`);
        skipCount++;
        continue;
      }

      try {
        // Generate custom filename from part number or name
        const customFilename = (product.partNumber || product.name)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase()
          .substring(0, 50);

        console.log(`   📤 Uploading to Cloudinary...`);

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadImage(
          product.imageUrl,
          'products',
          customFilename
        );

        // Update database with new Cloudinary URL
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: cloudinaryUrl },
        });

        console.log(`   ✅ Success: ${cloudinaryUrl}\n`);
        successCount++;

        // Rate limiting: wait 500ms between uploads to avoid hitting limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        failCount++;
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already on Cloudinary): ${skipCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total products: ${products.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Migration complete! Your images are now on Cloudinary.');
      console.log('   Images will load faster with automatic optimization.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run migration
migrateImagesToCloudinary();
