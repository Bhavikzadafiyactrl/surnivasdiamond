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

    // 1. Define Columns
    worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
    }));
    const totalCols = columns.length;

    // --- LOGO & TITLE ---
    // Fetch logo
    const logoBuffer = await fetchImage(logo);

    // Row 1: Title (Merged)
    const r1 = worksheet.getRow(1);
    r1.values = ["SURNIVAS DIAMOND"];
    worksheet.mergeCells(1, 1, 1, totalCols);
    r1.height = 60; // Increased height for logo
    r1.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Dark Blue

    // Add Image if available
    if (logoBuffer) {
        const imageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
        });

        // Position Image in Top-Left (over the blue background)
        // We generally can't put it *inside* a cell content efficiently, but overlaying works.
        // Let's float it on the left side of the title.
        worksheet.addImage(imageId, {
            tl: { col: 0.2, row: 0.2 }, // Slightly offset from top-left
            ext: { width: 150, height: 50 } // Adjust size as needed
        });
    }

    // --- ROW 2: SPACER ---
    worksheet.addRow([]);

    // --- ROW 3 & 4: SPECIFIC SUMMARY TABLE ---
    // Layout: | Pcs | Carat | Pr/Ct | Amount
    // Total   | ... | ...   | ...   | ...

    // Summary Headers (Row 3)
    const r3 = worksheet.getRow(3);
    r3.height = 25;

    const headers = ["Pcs", "Carat", "Pr/Ct", "Amount"];
    headers.forEach((h, i) => {
        const cell = r3.getCell(i + 2); // Start at Col 2 (B)
        cell.value = h;
        cell.font = { name: 'Calibri', size: 12, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Light Blue
        cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    });

    // Summary Values (Row 4)
    const r4 = worksheet.getRow(4);
    r4.height = 25;

    const totalLabelCell = r4.getCell(1); // A4
    totalLabelCell.value = "Total";
    totalLabelCell.font = { name: 'Calibri', size: 12, bold: true };
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Light Blue
    totalLabelCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

    const values = [summaryObj.pcs, summaryObj.carat, summaryObj.pricePerCt, summaryObj.amount];
    values.forEach((v, i) => {
        const cell = r4.getCell(i + 2); // Start at Col 2
        cell.value = v;
        cell.font = { name: 'Calibri', size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } }; // Pinkish
        cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

        if (i === 1) cell.numFmt = '0.00'; // Carat
        if (i === 2 || i === 3) cell.numFmt = '#,##0.00'; // Pr/Ct, Amount
    });

    // --- ROW 5: SPACER ---
    worksheet.addRow([]);

    // --- ROW 6: MAIN TABLE HEADERS ---
    const r6 = worksheet.getRow(6);
    r6.values = columns.map(c => c.header);
    r6.height = 25;
    r6.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    r6.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let i = 1; i <= totalCols; i++) {
        const cell = r6.getCell(i);
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

    columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
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

    const columns = [
        { header: "Stock ID", key: "StockID", width: 15 },
        { header: "Shape", key: "Shape", width: 12 },
        { header: "Carat", key: "Carats", width: 8, format: '0.00' },
        { header: "Color", key: "Color", width: 8 },
        { header: "Clarity", key: "Clarity", width: 10 },
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
        { header: "Color", key: "Color", width: 8 },
        { header: "Clarity", key: "Clarity", width: 10 },
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
