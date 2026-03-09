const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { logger } = require('./audit');
const { uploadBase64Image } = require('./cloudinary');

/**
 * Extract images from HTML content based on text markers
 * Assumes linear flow: Text Marker -> Image
 */
const extractImagesFromHtml = (html) => {
    const $ = cheerio.load(html);
    const images = [];
    let currentProductIndex = -1; // Will match product array index

    // State for detection
    let expecting = null; // 'uploadFotoId' or 'uploadFotoSelfie'
    let foundKTP = false;
    let foundSelfie = false;

    // Iterate over all elements in body
    // Mammoth usually outputs <p>, <table>, <img>, etc.
    $('body').find('*').each((i, elem) => {
        // We only care about elements that directly contain text or are images
        const $elem = $(elem);
        const text = $elem.text().trim();
        const isImage = elem.name === 'img';

        // 1. Detect Product Boundary
        // Patterns: "No. ORDER", "NIK", or "PRODUCT 1" (from corrected docs)
        const boundaryMatch = text.match(/No\s*\.?\s*ORDER|NIK|PRODUCT\s+\d+/i);
        if (boundaryMatch) {
            const ownText = $elem.clone().children().remove().end().text().trim();
            if (ownText.match(/No\s*\.?\s*ORDER|NIK|PRODUCT\s+\d+/i)) {

                // CRITICAL FIX: Only increment if this is a NEW product block.
                // If we see "No. ORDER", it's definitely a new product.
                // If we see "NIK" or others, it might be the same product we just saw "No. ORDER" for.
                const isPrimaryMarker = ownText.match(/No\s*\.?\s*ORDER|PRODUCT\s+\d+/i);

                // If it's a primary marker, ALWAYS increment.
                // If it's a secondary marker (NIK), only increment if we haven't found a marker for this index yet.
                if (isPrimaryMarker || currentProductIndex === -1) {
                    currentProductIndex++;
                    expecting = null;
                    foundKTP = false;
                    foundSelfie = false;
                    logger.info(`ImageExtractor: Found NEW product boundary ${currentProductIndex} at "${ownText}"`);
                } else {
                    // It's a secondary marker like "NIK" for the CURRENT product
                    // logger.info(`ImageExtractor: Found secondary marker "${ownText}" for product ${currentProductIndex}`);
                }
            }
        }

        if (currentProductIndex < 0) return; // Skip content before first product

        // 2. Detect Image Markers (Flexible)
        // Checks for "Foto KTP", "KTP", "Identitas", "ID Card", etc.
        if (text.match(/(?:Foto\s*)?KTP|Identitas|ID\s*Card/i)) {
            expecting = 'uploadFotoId';
            // logger.info(`ImageExtractor: Expecting KTP for product ${currentProductIndex}`);
        }
        // Checks for "Foto Selfie", "Selfie", "Wajah", "Face", etc.
        else if (text.match(/(?:Foto\s*)?Selfie|Wajah|Face/i)) {
            expecting = 'uploadFotoSelfie';
            // logger.info(`ImageExtractor: Expecting Selfie for product ${currentProductIndex}`);
        }

        // 3. Capture Image
        if (isImage) {
            // Mammoth embeds default as base64 in src
            const src = $elem.attr('src');

            if (src && src.startsWith('data:image')) {
                let targetType = null;

                if (expecting) {
                    // Explicit label match
                    targetType = expecting;
                } else {
                    // FALLBACK: If no explicit label, first image is KTP, second is Selfie
                    if (!foundKTP) {
                        targetType = 'uploadFotoId';
                    } else if (!foundSelfie) {
                        targetType = 'uploadFotoSelfie';
                    }
                }

                if (targetType) {
                    // Check if we already have this type for this product to avoid duplicates
                    const exists = images.find(img => img.productIndex === currentProductIndex && img.type === targetType);

                    if (!exists) {
                        images.push({
                            productIndex: currentProductIndex,
                            type: targetType,
                            base64: src
                        });

                        if (targetType === 'uploadFotoId') foundKTP = true;
                        if (targetType === 'uploadFotoSelfie') foundSelfie = true;

                        logger.info(`ImageExtractor: Assigned image to product ${currentProductIndex} as ${targetType} (Total Found: ${images.length})`);
                    }

                    // Reset expectation after finding image
                    expecting = null;
                }
            }
        }
    });

    logger.info(`Extracted ${images.length} images from document`);
    return images;
};

/**
 * Upload base64 image to Cloudinary and return secure URL
 */
const uploadImageToCloudinary = async (base64Str) => {
    try {
        const result = await uploadBase64Image(base64Str);
        if (result.success) {
            return result.url;
        }
        logger.warn('imageExtractor: uploadBase64Image failed:', { error: result.error });
        return null;
    } catch (err) {
        logger.error('Failed to upload extracted image to Cloudinary', { error: err.message });
        return null;
    }
};

/**
 * Extract images from PDF buffer using pdf-extract-image
 * Returns array of image buffers with metadata
 */
const extractImagesFromPDF = async (pdfBuffer) => {
    try {
        logger.info('Starting PDF image extraction with pdf-lib...');
        const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFRef } = require('pdf-lib');

        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const images = [];

        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const resources = page.node.Resources();
            if (!resources) continue;

            const xObjects = resources.get(PDFName.of('XObject'));
            if (!(xObjects instanceof PDFDict)) continue;

            const xObjectNames = xObjects.keys();
            for (const name of xObjectNames) {
                let xObject = xObjects.get(name);

                // If it's a reference, resolve it
                if (xObject instanceof PDFRef) {
                    xObject = pdfDoc.context.lookup(xObject);
                }

                if (!(xObject instanceof PDFRawStream)) continue;

                const subtype = xObject.dict.get(PDFName.of('Subtype'));
                if (subtype instanceof PDFName && subtype.toString() === '/Image') {
                    const widthObj = xObject.dict.get(PDFName.of('Width'));
                    const heightObj = xObject.dict.get(PDFName.of('Height'));

                    const width = typeof widthObj.asNumber === 'function' ? widthObj.asNumber() : (typeof widthObj.numberValue === 'function' ? widthObj.numberValue() : Number(widthObj));
                    const height = typeof heightObj.asNumber === 'function' ? heightObj.asNumber() : (typeof heightObj.numberValue === 'function' ? heightObj.numberValue() : Number(heightObj));

                    const contents = xObject.contents;
                    const filter = xObject.dict.get(PDFName.of('Filter'));

                    let format = 'png';
                    if (filter instanceof PDFName) {
                        const filterName = filter.toString();
                        if (filterName.includes('DCTDecode')) {
                            format = 'jpg';
                        }
                    }


                    images.push({
                        buffer: Buffer.from(contents),
                        format: format,
                        width: width,
                        height: height,
                        pageIndex: i,
                        size: contents.length,
                        index: images.length
                    });
                }
            }
        }

        logger.info(`Extracted ${images.length} images from PDF using pdf-lib`);
        return images;

    } catch (error) {
        logger.error('PDF image extraction failed:', { error: error.message });
        return [];
    }
};

module.exports = {
    extractImagesFromHtml,
    uploadImageToCloudinary,
    extractImagesFromPDF
};
