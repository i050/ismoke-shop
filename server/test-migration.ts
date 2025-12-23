import { uploadToSpaces, deleteFromSpaces, buildCdnUrl } from './src/services/spacesService';

/**
 * 🧪 Test 1: Spaces Service - Upload & Delete
 */
async function testSpacesService() {
  console.log('\n🧪 Test 1: Spaces Service - Upload & Delete\n');
  
  try {
    // Upload
    const testContent = Buffer.from('Hello from Migration Test!');
    const key = 'test/migration-test.txt';
    
    console.log('📤 Uploading test file...');
    const url = await uploadToSpaces(testContent, key, 'text/plain');
    console.log('✅ Upload successful:', url);
    
    // Verify URL structure
    const expectedCdn = process.env.DO_SPACES_CDN_URL;
    if (url.startsWith(expectedCdn!)) {
      console.log('✅ CDN URL structure correct');
    } else {
      console.error('❌ CDN URL mismatch. Expected:', expectedCdn, 'Got:', url);
    }
    
    // Test buildCdnUrl
    const builtUrl = buildCdnUrl(key);
    if (builtUrl === url) {
      console.log('✅ buildCdnUrl() works correctly');
    } else {
      console.error('❌ buildCdnUrl mismatch');
    }
    
    // Delete
    console.log('\n🗑️ Deleting test file...');
    const deleted = await deleteFromSpaces(key);
    if (deleted) {
      console.log('✅ Delete successful');
    } else {
      console.error('❌ Delete failed');
    }
    
    console.log('\n✅ Test 1 PASSED\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test 1 FAILED:', error);
    return false;
  }
}

/**
 * 🧪 Test 2: Image Processing Service
 */
async function testImageProcessing() {
  console.log('\n🧪 Test 2: Image Processing Service\n');
  
  try {
    // יצירת תמונה פשוטה (1x1 pixel PNG)
    const fs = await import('fs');
    const { processAndUploadImage } = await import('./src/services/imageProcessingService');
    
    // PNG לבן 1x1 pixel (base64)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    
    console.log('🎨 Processing image (1x1 pixel test)...');
    const result = await processAndUploadImage(
      buffer,
      'test-image.png',
      'test-product-migration',
      'image/png'
    );
    
    console.log('\n📊 Result:');
    console.log('Thumbnail:', result.thumbnail);
    console.log('Medium:', result.medium);
    console.log('Large:', result.large);
    console.log('Key:', result.key);
    console.log('Format:', result.format);
    console.log('Uploaded At:', result.uploadedAt);
    
    // Validations
    const checks = [
      { name: 'Has thumbnail URL', pass: !!result.thumbnail },
      { name: 'Has medium URL', pass: !!result.medium },
      { name: 'Has large URL', pass: !!result.large },
      { name: 'Format is webp', pass: result.format === 'webp' },
      { name: 'Thumbnail ends with -thumbnail.webp', pass: result.thumbnail.endsWith('-thumbnail.webp') },
      { name: 'Medium ends with -medium.webp', pass: result.medium.endsWith('-medium.webp') },
      { name: 'Large ends with -large.webp', pass: result.large.endsWith('-large.webp') },
      { name: 'Has key', pass: !!result.key },
      { name: 'Has uploadedAt', pass: !!result.uploadedAt }
    ];
    
    console.log('\n✅ Validations:');
    let allPassed = true;
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      if (!check.pass) allPassed = false;
    });
    
    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    await deleteFromSpaces(`${result.key}-thumbnail.webp`);
    await deleteFromSpaces(`${result.key}-medium.webp`);
    await deleteFromSpaces(`${result.key}-large.webp`);
    console.log('✅ Cleanup done');
    
    if (allPassed) {
      console.log('\n✅ Test 2 PASSED\n');
      return true;
    } else {
      console.error('\n❌ Test 2 FAILED - Some validations failed\n');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test 2 FAILED:', error);
    return false;
  }
}

/**
 * 🧪 Main Test Runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DigitalOcean Spaces Migration - Automated Tests');
  console.log('='.repeat(60));
  
  const results = {
    spacesService: false,
    imageProcessing: false
  };
  
  // Load environment
  require('dotenv').config();
  
  // Run tests
  results.spacesService = await testSpacesService();
  results.imageProcessing = await testImageProcessing();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Spaces Service:      ${results.spacesService ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Image Processing:    ${results.imageProcessing ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  const allPassed = results.spacesService && results.imageProcessing;
  
  if (allPassed) {
    console.log('\n🎉 All tests PASSED! Migration is working correctly.\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some tests FAILED. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
