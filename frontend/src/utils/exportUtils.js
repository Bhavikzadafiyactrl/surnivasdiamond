import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logo from '../assets/logo.png'; // Import the logo

// Helper to fetch image buffer
const fetchImage = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await blob.arrayBuffer();
    } catch (error) {
        console.error("Error fetching logo:", error);
        return null;
    }
};

// Helper to generate professional Excel with styling
const generateStyledExcel = async (data, columns, summaryObj, fileName) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Diamonds');

    // 1. Define Columns & Set Initial Widths
    // Crucial: Set widths wide enough for the Summary Table floating above columns 2, 3, 4, 5
    // Column Mapping:
    // Col 1 (A): Stock ID -> "Total" Label
    // Col 2 (B): Shape -> "Pcs" Value
    // Col 3 (C): Carat -> "Carat" Value
    // Col 4 (D): Color -> "Pr/Ct" Value (Needs width for currency)
    // Col 5 (E): Clarity -> "Amount" Value (Needs width for currency)

    // We update the widths in the columns definition below, but let's ensure we enforce them.

    worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
    }));
    const totalCols = columns.length;

    // --- LOGO & TITLE ---
    const logoBuffer = await fetchImage(logo);

    // Merge Rows 1 and 2 for the Title to create a taller header area
    // This gives space for the logo without "cutting it" or cramping it.
    worksheet.mergeCells(1, 1, 2, totalCols); // Merge A1 to [End]2

    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = "SURNIVAS DIAMOND";
    titleCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Dark Blue

    // Ensure the merged rows have height
    worksheet.getRow(1).height = 40;
    worksheet.getRow(2).height = 40;
    // Total visual height approx 80px

    // Add Image
    if (logoBuffer) {
        const imageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
        });

        // Position Logo roughly in the top-left of the merged block
        worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.1 },
            ext: { width: 160, height: 60 } // Slightly larger to fit the new double-row height
        });
    }

    // --- ROW 3: SPACER (Actually Row 3 is now available? No, we merged 1 and 2. So next is Row 3. 
    // Wait, merging 1 and 2 means cells (1,1) to (2,total) are one block. 
    // The next visual row is Row 3.
    // Let's add a spacer at Row 3.
    worksheet.getRow(3).values = [];
    worksheet.getRow(3).height = 10; // Small spacer

    // --- ROW 4 & 5: SUMMARY TABLE ---
    // Moved down by one due to the spacer and merge.

    // Summary Headers (Row 4)
    const r4 = worksheet.getRow(4);
    r4.height = 25;

    const headers = ["Pcs", "Carat", "Pr/Ct", "Amount"];
    headers.forEach((h, i) => {
        const cell = r4.getCell(i + 2); // Start at Col 2 (B)
        cell.value = h;
        cell.font = { name: 'Calibri', size: 12, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Light Blue
        cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    });

    // Summary Values (Row 5)
    const r5 = worksheet.getRow(5);
    r5.height = 25;

    const totalLabelCell = r5.getCell(1); // A5
    totalLabelCell.value = "Total";
    totalLabelCell.font = { name: 'Calibri', size: 12, bold: true };
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Light Blue
    totalLabelCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

    const values = [summaryObj.pcs, summaryObj.carat, summaryObj.pricePerCt, summaryObj.amount];
    values.forEach((v, i) => {
        const cell = r5.getCell(i + 2); // Start at Col 2
        cell.value = v;
        cell.font = { name: 'Calibri', size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } }; // Pinkish
        cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

        if (i === 1) cell.numFmt = '0.00'; // Carat
        if (i === 2 || i === 3) cell.numFmt = '#,##0.00'; // Pr/Ct, Amount
    });

    // --- ROW 6: SPACER ---
    worksheet.getRow(6).values = [];
    worksheet.getRow(6).height = 10;

    // --- ROW 7: MAIN TABLE HEADERS ---
    const r7 = worksheet.getRow(7);
    r7.values = columns.map(c => c.header);
    r7.height = 25;
    r7.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    r7.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let i = 1; i <= totalCols; i++) {
        const cell = r7.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin', color: { argb: 'FF555555' } } };
    }

    // --- DATA ROWS ---
    data.forEach((item, index) => {
        const rowValues = columns.map(col => item[col.key]);
        const r = worksheet.addRow(rowValues);
        r.alignment = { vertical: 'middle', horizontal: 'center' };

        if (index % 2 === 1) {
            r.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
            });
        }

        r.eachCell((cell, colNumber) => {
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
            const colDef = columns[colNumber - 1];
            if (colDef && colDef.format) {
                cell.numFmt = colDef.format;
            }
        });
    });

    // Final Width Adjustments
    columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
        // Ensure manual widths override auto if needed, especially for Col 4 and 5
        if (!column.width || column.width < col.width) {
            column.width = col.width || 15;
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};

export const exportDiamondsToExcel = (diamonds, fileName = "Surnivas_Diamonds.xlsx") => {
    const totalDiamonds = diamonds.length;
    const totalCarat = diamonds.reduce((sum, d) => sum + (parseFloat(d.Carats) || 0), 0);
    const totalAmount = diamonds.reduce((sum, d) => sum + (parseFloat(d['Amount$']) || 0), 0);
    const avgPricePerCarat = totalCarat > 0 ? (totalAmount / totalCarat) : 0;

    const summaryObj = {
        pcs: totalDiamonds,
        carat: totalCarat,
        pricePerCt: avgPricePerCarat,
        amount: totalAmount
    };

    // Columns with UPDATED WIDTHS for Cols 4 & 5
    const columns = [
        { header: "Stock ID", key: "StockID", width: 15 },
        { header: "Shape", key: "Shape", width: 12 },
        { header: "Carat", key: "Carats", width: 10, format: '0.00' }, // increased slighly
        { header: "Color", key: "Color", width: 14 }, // Widened for "Pr/Ct"
        { header: "Clarity", key: "Clarity", width: 18 }, // Widened for "Amount"
        { header: "Cut", key: "Cut", width: 8 },
        { header: "Pol", key: "Polish", width: 8 },
        { header: "Sym", key: "Sym", width: 8 },
        { header: "Fluor", key: "Flour", width: 10 },
        { header: "Lab", key: "Lab", width: 8 },
        { header: "Price ($)", key: "Price", width: 12, format: '"$"#,##0.00' },
        { header: "Report No", key: "ReportNo", width: 15 },
        { header: "Loc", key: "Location", width: 10 },
        { header: "Meas", key: "Measurement", width: 18 },
        { header: "Table %", key: "Table", width: 10 },
        { header: "Depth %", key: "Depth", width: 10 },
        { header: "Status", key: "Status", width: 12 },
        { header: "GIA Link", key: "GIALink", width: 30 },
        { header: "Video", key: "VideoLink", width: 30 }
    ];

    const formattedData = diamonds.map(d => ({
        StockID: d.StockID || d['Stone No'] || '',
        Shape: d.Shape || '',
        Carats: parseFloat(d.Carats || 0),
        Color: d.Color || '',
        Clarity: d.Clarity || '',
        Cut: d.Cut || '',
        Polish: d.Polish || '',
        Sym: d.Sym || '',
        Flour: d.Flour || '',
        Lab: d.Lab || '',
        Price: parseFloat(d['Amount$'] || 0),
        ReportNo: d['Report No'] || '',
        Location: d.Location || '',
        Measurement: d.Measurement || '',
        Table: d['Table %'] || '',
        Depth: d['Depth %'] || '',
        Status: d.Status || '',
        GIALINK: d.GIALINK || (d['Report No'] ? `https://www.gia.edu/report-check?reportno=${d['Report No']}` : ''),
        VideoLink: d.videoLink || ''
    }));

    generateStyledExcel(formattedData, columns, summaryObj, fileName);
};

export const exportOrdersToExcel = (orders, fileName = "Order_History.xlsx") => {
    const totalOrders = orders.length;
    const totalCarat = orders.reduce((sum, o) => sum + (parseFloat(o.diamondId?.Carats) || 0), 0);
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || o.diamondId?.['Amount$'] || 0), 0);
    const avgPricePerCarat = totalCarat > 0 ? (totalAmount / totalCarat) : 0;

    const summaryObj = {
        pcs: totalOrders,
        carat: totalCarat,
        pricePerCt: avgPricePerCarat,
        amount: totalAmount
    };

    const columns = [
        { header: "Date", key: "Date", width: 12 },
        { header: "Order ID", key: "OrderID", width: 20 },
        { header: "Stock ID", key: "StockID", width: 15 },
        { header: "Status", key: "Status", width: 12 },
        { header: "Shape", key: "Shape", width: 10 },
        { header: "Carat", key: "Carats", width: 8, format: '0.00' },
        { header: "Color", key: "Color", width: 14 }, // Widened
        { header: "Clarity", key: "Clarity", width: 18 }, // Widened
        { header: "Total ($)", key: "Total", width: 12, format: '"$"#,##0.00' },
        { header: "Paid ($)", key: "Paid", width: 12, format: '"$"#,##0.00' },
        { header: "Due ($)", key: "Due", width: 12, format: '"$"#,##0.00' },
        { header: "Report No", key: "ReportNo", width: 15 },
        { header: "Lab", key: "Lab", width: 8 },
        { header: "Payment", key: "Payment", width: 12 },
        { header: "Sold Date", key: "SoldDate", width: 12 }
    ];

    const formattedData = orders.map(order => {
        const diamond = order.diamondId || {};
        const total = order.totalAmount || diamond['Amount$'] || 0;
        const paid = order.paidAmount || 0;
        const discount = order.discount || 0;
        const due = order.status === 'confirmed' ? (total - paid - discount) : 0;

        return {
            Date: new Date(order.createdAt).toLocaleDateString(),
            OrderID: order._id,
            StockID: diamond.StockID || diamond['Stone No'] || '-',
            Status: order.status ? order.status.toUpperCase() : '-',
            Shape: diamond.Shape || '-',
            Carats: parseFloat(diamond.Carats || 0),
            Color: diamond.Color || '-',
            Clarity: diamond.Clarity || '-',
            Total: parseFloat(total),
            Paid: parseFloat(paid),
            Due: parseFloat(due),
            ReportNo: diamond['Report No'] || '-',
            Lab: diamond.Lab || '-',
            Payment: (order.paymentStatus || 'pending').toUpperCase(),
            SoldDate: order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '-'
        };
    });

    generateStyledExcel(formattedData, columns, summaryObj, fileName);
};
