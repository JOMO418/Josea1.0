// Export Product Images from Local Database
// This will save base64 images as actual image files AND create a seed-ready JSON

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportImages() {
  try {
    console.log('🔍 Fetching products with images from local database...\n');
    
    const products = await prisma.product.findMany({
      where: {
        imageUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        partNumber: true,
        imageUrl: true,
      },
    });

    console.log(`✅ Found ${products.length} products with images\n`);

    if (products.length === 0) {
      console.log('❌ No products with images found in database!');
      await prisma.$disconnect();
      return;
    }

    // Create output directory for images
    const outputDir = path.join(__dirname, 'exported-images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const seedData = [];
    let base64Count = 0;
    let urlCount = 0;

    // Process each product
    for (const product of products) {
      let finalImageUrl = product.imageUrl;

      // Check if it's a base64 image
      if (product.imageUrl && product.imageUrl.startsWith('data:image')) {
        base64Count++;
        
        // Extract base64 data
        const matches = product.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        
        if (matches) {
          const extension = matches[1]; // jpeg, png, etc.
          const base64Data = matches[2];
          
          // Create safe filename from part number or name
          const safeName = (product.partNumber || product.name)
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase()
            .substring(0, 50);
          
          const filename = `${safeName}.${extension}`;
          const filepath = path.join(outputDir, filename);
          
          // Save base64 as actual image file
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filepath, buffer);
          
          console.log(`✅ Saved: ${filename}`);
          
          // Update finalImageUrl to be the filename (for later upload to Cloudinary/Imgur)
          finalImageUrl = filename;
        }
      } else {
        urlCount++;
      }

      seedData.push({
        partNumber: product.partNumber,
        name: product.name,
        imageUrl: finalImageUrl
      });
    }

    // Save seed data as JSON
    const seedJsonPath = path.join(__dirname, 'product-images-seed.json');
    fs.writeFileSync(seedJsonPath, JSON.stringify(seedData, null, 2));

    console.log(`\n📊 Export Summary:`);
    console.log(`   ✅ Total products: ${products.length}`);
    console.log(`   📸 Base64 images extracted: ${base64Count}`);
    console.log(`   🔗 URL images: ${urlCount}`);
    console.log(`\n📁 Files created:`);
    console.log(`   - Image files: ${outputDir}`);
    console.log(`   - Seed data: ${seedJsonPath}`);
    console.log(`\n🚀 Next Steps:`);
    console.log(`   1. Upload images from ${outputDir} to Imgur or Cloudinary`);
    console.log(`   2. Update seed JSON with new URLs`);
    console.log(`   3. Run seed on Render`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Export failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

exportImages();