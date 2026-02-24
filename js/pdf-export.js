/**
 * PDF Export Logic for MiniFrancine Products
 * Uses jspdf (must be loaded in the page)
 */

export async function generateProductPDF(product, settings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Helper: Add footer to current page
    const addPageFooter = () => {
        const footerY = pageHeight - margin;
        doc.setDrawColor(180, 180, 180); // Darker line
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100); // Darker text
        const footerText = settings.footer || 'MiniFrancine - Embroidery Designs';
        const footerLines = doc.splitTextToSize(footerText, contentWidth);
        doc.text(footerLines, margin, footerY - 5);
    };

    // Helper: Add image to PDF with border and aspect ratio preservation
    const addImageFromUrl = async (url, x, y, w, h, addBorder = false) => {
        try {
            // Security: Enforce HTTPS for external fetches
            const secureUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
            const response = await fetch(secureUrl);
            const blob = await response.blob();
            const imgData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });

            const props = doc.getImageProperties(imgData);
            const ratio = props.width / props.height;

            let drawW = w;
            let drawH = w / ratio;

            if (drawH > h) {
                drawH = h;
                drawW = h * ratio;
            }

            // Center in the provided box
            const drawX = x + (w - drawW) / 2;
            const drawY = y + (h - drawH) / 2;

            doc.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH);

            if (addBorder) {
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.2);
                doc.rect(drawX, drawY, drawW, drawH);
            }

            return { drawW, drawH, drawX, drawY };
        } catch (error) {
            console.error('Error adding image to PDF:', error);
            return null;
        }
    };

    /**
     * Helper: Simple HTML Parser for PDF (Support: b, i, u, a, p, br, ul, ol, li)
     * Now supports multi-column flow and persistent footer!
     */
    const renderRichText = (html, x, y, maxWidth, numColumns = 1, fixedStartY = null) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html || '';

        const columnGap = 10;
        const columnWidth = (maxWidth - (columnGap * (numColumns - 1))) / numColumns;

        const state = {
            currentColumn: 0,
            currentX: x,
            currentY: y,
            columnStartY: fixedStartY || y,
            listStack: []
        };

        const lineHeight = 5;

        const checkPageBreak = (needed) => {
            if (state.currentY + (needed || 0) > pageHeight - margin - 15) { // Leave space for footer
                if (numColumns > 1 && state.currentColumn < numColumns - 1) {
                    state.currentColumn++;
                    state.currentX = x + (state.currentColumn * (columnWidth + columnGap)) + (state.listStack.length * 5);
                    state.currentY = state.columnStartY;
                    return true;
                } else {
                    addPageFooter();
                    doc.addPage();
                    state.currentY = margin;
                    state.currentColumn = 0;
                    state.currentX = x;
                    state.columnStartY = margin;
                    return true;
                }
            }
            return false;
        };

        const walk = (node, isBold = false, isItalic = false, link = null) => {
            if (node.nodeType === 3) { // Text node
                let text = node.textContent;

                // If it's the start of an LI, add marker
                if (node.parentNode.tagName.toLowerCase() === 'li' && node === node.parentNode.firstChild) {
                    const listState = state.listStack[state.listStack.length - 1];
                    if (listState) {
                        const marker = listState.type === 'ol' ? `${listState.index}. ` : '• ';
                        doc.setFont('helvetica', 'bold');
                        doc.text(marker, state.currentX, state.currentY);
                        state.currentX += doc.getTextWidth(marker);
                        listState.index++;
                    }
                }

                doc.setFont('helvetica', isBold ? 'bold' : (isItalic ? 'italic' : 'normal'));

                const words = text.split(/(\s+)/);
                words.forEach(word => {
                    const wordWidth = doc.getTextWidth(word);
                    const limitX = x + (state.currentColumn * (columnWidth + columnGap)) + columnWidth;

                    if (state.currentX + wordWidth > limitX) {
                        state.currentX = x + (state.currentColumn * (columnWidth + columnGap)) + (state.listStack.length * 5);
                        state.currentY += lineHeight;
                        checkPageBreak(lineHeight);
                    }

                    if (link) {
                        doc.setTextColor(0, 0, 255);
                        doc.text(word, state.currentX, state.currentY, { link: { url: link } });
                        doc.setDrawColor(0, 0, 255);
                        doc.line(state.currentX, state.currentY + 0.5, state.currentX + wordWidth, state.currentY + 0.5);
                        doc.setTextColor(100, 100, 100);
                    } else {
                        doc.text(word, state.currentX, state.currentY);
                    }
                    state.currentX += wordWidth;
                });
            } else if (node.nodeType === 1) { // Element node
                const tag = node.tagName.toLowerCase();
                let nextBold = isBold || tag === 'b' || tag === 'strong';
                let nextItalic = isItalic || tag === 'i' || tag === 'em';
                let nextLink = link || (tag === 'a' ? node.getAttribute('href') : null);

                if (tag === 'ul' || tag === 'ol') {
                    state.listStack.push({ type: tag, index: 1 });
                    if (state.currentX > x + (state.currentColumn * (columnWidth + columnGap))) {
                        state.currentX = x + (state.currentColumn * (columnWidth + columnGap));
                        state.currentY += lineHeight;
                        checkPageBreak(lineHeight);
                    }
                }

                if (tag === 'p' || tag === 'br' || tag === 'div' || tag === 'li') {
                    if (state.currentX > x + (state.currentColumn * (columnWidth + columnGap))) {
                        state.currentX = x + (state.currentColumn * (columnWidth + columnGap)) + (state.listStack.length * 5);
                        state.currentY += lineHeight;
                        checkPageBreak(lineHeight);
                    }
                }

                node.childNodes.forEach(child => walk(child, nextBold, nextItalic, nextLink));

                if (tag === 'ul' || tag === 'ol') {
                    state.listStack.pop();
                }

                if (tag === 'p' || tag === 'div' || tag === 'li') {
                    state.currentX = x + (state.currentColumn * (columnWidth + columnGap));
                    state.currentY += lineHeight;
                    checkPageBreak(lineHeight);
                }
            }
        };

        checkPageBreak(lineHeight);
        walk(tempDiv);
        return state.currentY;
    };

    // --- Header (Title and Logo on the Same Line) ---
    const logoMaxW = 40;
    const logoMaxH = 15;
    let headerHeight = 0;

    // Handle Logo Loading First to determine dimensions
    let logoData = null;
    let logoProps = null;
    if (settings.logo && settings.logo.startsWith('http')) {
        try {
            // Security: Enforce HTTPS for external logo fetches
            const secureLogoUrl = settings.logo.startsWith('http://') ? settings.logo.replace('http://', 'https://') : settings.logo;
            const resp = await fetch(secureLogoUrl);
            const blob = await resp.blob();
            logoData = await new Promise(r => {
                const reader = new FileReader();
                reader.onloadend = () => r(reader.result);
                reader.readAsDataURL(blob);
            });
            logoProps = doc.getImageProperties(logoData);
        } catch (e) { console.error("Logo fetch error", e); }
    }

    // Draw Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);

    // Reserved space for logo (image or text)
    let reservedLogoWidth = 0;
    if (logoProps) {
        reservedLogoWidth = logoMaxW + 10;
    } else if (settings.logo) {
        doc.setFontSize(24);
        reservedLogoWidth = doc.getTextWidth(settings.logo) + 10;
        doc.setFontSize(18); // Reset to title size
    }

    const titleWidth = contentWidth - reservedLogoWidth;
    const titleLines = doc.splitTextToSize(product.title || 'Product Documentation', titleWidth);
    doc.text(titleLines, margin, currentY + 7);

    headerHeight = Math.max(headerHeight, (titleLines.length * 8));

    if (logoData && logoProps) {
        const ratio = logoProps.width / logoProps.height;
        let drawW = logoMaxW;
        let drawH = logoMaxW / ratio;
        if (drawH > logoMaxH) {
            drawH = logoMaxH;
            drawW = logoMaxH * ratio;
        }
        const logoX = pageWidth - margin - drawW;
        doc.addImage(logoData, 'JPEG', logoX, currentY, drawW, drawH);
        headerHeight = Math.max(headerHeight, drawH);
    } else if (settings.logo) {
        // Fallback text logo
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(150, 150, 150); // Muted logo color
        const logoText = settings.logo;
        const logoW = doc.getTextWidth(logoText);
        doc.text(logoText, pageWidth - margin - logoW, currentY + 10);
        headerHeight = Math.max(headerHeight, 15);
    }

    currentY += headerHeight + 10;

    // --- Promo Text (Rich Text Support) ---
    if (settings.promo) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        currentY = renderRichText(settings.promo, margin, currentY, contentWidth);
        currentY += 5;
    }

    doc.setDrawColor(230, 230, 230);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // --- Images (Previews) ---
    const imgSize = contentWidth / 3.5;
    if (product.images && product.images.length > 0) {
        let imgX = margin;
        for (let i = 0; i < Math.min(product.images.length, 3); i++) {
            await addImageFromUrl(product.images[i], imgX, currentY, imgSize, imgSize, true);
            imgX += imgSize + 5;
        }
        currentY += imgSize + 15;
    }

    // --- Details & Materials Section (Two Columns) ---
    const colWidth = contentWidth / 2 - 5;
    const col2X = margin + colWidth + 10;
    const sectionTopY = currentY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 26);
    doc.text('Additional Details', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const details = [
        `Size: ${product.meta?.size || 'N/A'}`,
        `Stitches: ${product.meta?.stitches || 'N/A'}`,
        `Color Changes: ${product.meta?.color_changes || 'N/A'}`,
        `Colors Used: ${product.meta?.colors_used || 'N/A'}`
    ];

    details.forEach(detail => {
        doc.text(detail, margin, currentY);
        currentY += 7;
    });

    const col1EndY = currentY;

    currentY = sectionTopY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Materials Needed', col2X, currentY);
    currentY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const materialText = 'Felt or cotton and Tear away stabilizer (medium weight)';
    const materialLines = doc.splitTextToSize(materialText, colWidth);
    doc.text(materialLines, col2X, currentY);

    currentY = Math.max(col1EndY, currentY + (materialLines.length * 6)) + 15;

    // --- Color Sheet (Rich Text Support) ---
    if (product.threadColors) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Color Change Sheet', margin, currentY);
        currentY += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        if (Array.isArray(product.threadColors)) {
            const isLong = product.threadColors.length > 12;
            const numCols = isLong ? 2 : 1;
            const cWidth = (contentWidth - (numCols > 1 ? 10 : 0)) / numCols;

            // Simplified multi-column for arrays
            let colIndex = 0;
            let colStartY = currentY;

            for (let i = 0; i < product.threadColors.length; i++) {
                const color = product.threadColors[i];
                if (currentY > pageHeight - margin - 15) {
                    if (numCols > 1 && colIndex === 0) {
                        colIndex = 1;
                        currentY = colStartY;
                    } else {
                        addPageFooter();
                        doc.addPage();
                        currentY = margin;
                        colIndex = 0;
                        colStartY = margin;
                    }
                }
                const text = `${i + 1}. ${color.description || color.name || color}`;
                const lines = doc.splitTextToSize(text, cWidth);
                const drawX = margin + (colIndex * (cWidth + 10));
                doc.text(lines, drawX, currentY);
                currentY += (lines.length * 5) + 2;
            }
        } else {
            const isLong = product.threadColors.length > 400 || (product.threadColors.match(/<(li|p|br)/g) || []).length > 10;
            const numCols = isLong ? 2 : 1;
            currentY = renderRichText(product.threadColors, margin, currentY, contentWidth, numCols, currentY);
        }
        currentY += 10;
    }

    addPageFooter();

    const filename = `${product.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'product'}.pdf`;

    if (settings.output === 'blob') {
        return doc.output('blob');
    }

    doc.save(filename);
}

/**
 * Generates a ZIP bundle containing the product PDF and all associated embroidery files.
 * @param {Object} product Product data
 * @param {Array} signedFiles Array of {url, filename} from Supabase
 * @param {Object} settings PDF settings
 */
export async function generateProductBundle(product, signedFiles, settings) {
    const zip = new JSZip();
    const folderName = product.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'bundle';
    const folder = zip.folder(folderName);

    // 1. Add PDF
    const pdfBlob = await generateProductPDF(product, { ...settings, output: 'blob' });
    folder.file(`${folderName}.pdf`, pdfBlob);

    // 2. Add Embroidery Files
    for (const file of signedFiles) {
        try {
            const resp = await fetch(file.url);
            const blob = await resp.blob();
            folder.file(file.filename, blob);
        } catch (err) {
            console.error(`Error adding file ${file.filename} to bundle:`, err);
        }
    }

    // 3. Generate and Download ZIP
    const content = await zip.generateAsync({ type: "blob" });
    const zipFilename = `${folderName}.zip`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generateProductPDF = generateProductPDF;
window.generateProductBundle = generateProductBundle;
