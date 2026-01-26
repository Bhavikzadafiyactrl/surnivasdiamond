import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper to generate professional Excel with styling
const generateStyledExcel = async (data, columns, summaryData, fileName) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Diamonds');

    // 1. Define Columns (We set them later to avoid auto-header issue, but beneficial to know count)
    const totalCols = columns.length;

    // --- ROW 1: TITLE ---
    const r1 = worksheet.addRow(["SURNIVAS DIAMOND"]);
    worksheet.mergeCells(1, 1, 1, totalCols);
    r1.height = 35;
    r1.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFFFFFFF' } }; // White Text
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    r1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' } // Dark Blue Background
    };

    // --- ROW 2: SPACER ---
    worksheet.addRow([]);

    // --- ROW 3 & 4: SUMMARY TABLE ---
    // summaryData is Array of { label, value }
    // We need to map these to columns. 
    // If we have 4 summary items, we can spread them across the first 4-8 columns.
    // Let's create two rows: One for Labels, One for Values.

    // Prepare arrays
    const summaryLabels = [];
    const summaryValues = [];

    summaryData.forEach(item => {
        summaryLabels.push(item.label);
        summaryValues.push(item.value);
    });

    // We can merge cells if we want wider summary columns. 
    // For simplicity, let's put them in the first N columns.

    // Summary Headers Row
    const r3 = worksheet.addRow(summaryLabels);
    r3.height = 25;
    r3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    // Apply Cell Styles loop manually to only filled cells
    for (let i = 1; i <= summaryLabels.length; i++) {
        const cell = r3.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }; // Dark Gray
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }

    // Summary Values Row
    const r4 = worksheet.addRow(summaryValues);
    r4.height = 25;
    r4.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
    r4.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let i = 1; i <= summaryValues.length; i++) {
        const cell = r4.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light Gray
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }

    // --- ROW 5: SPACER ---
    worksheet.addRow([]);

    // --- ROW 6: MAIN TABLE HEADERS ---
    const headerValues = columns.map(c => c.header);
    const r6 = worksheet.addRow(headerValues);
    r6.height = 25;
    r6.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    r6.alignment = { vertical: 'middle', horizontal: 'center' };

    // Apply styling to all header cells
    for (let i = 1; i <= columns.length; i++) {
        const cell = r6.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }; // Black
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin', color: { argb: 'FF555555' } } };
    }

    // --- DATA ROWS ---
    data.forEach((item, index) => {
        const row = [];
        columns.forEach(col => {
            row.push(item[col.key]);
        });
        const r = worksheet.addRow(row);
        r.alignment = { vertical: 'middle', horizontal: 'center' };

        // Zebra Striping or just borders
        const isAlternate = index % 2 === 1;
        if (isAlternate) {
            r.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }; // Very light gray
            });
        }

        r.eachCell((cell) => {
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
        });
    });

    // --- COLUMN WIDTHS ---
    columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = col.width || 15;
    });

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};

export const exportDiamondsToExcel = (diamonds, fileName = "Surnivas_Diamonds.xlsx") => {
    // 1. Calculate Summary
    const totalDiamonds = diamonds.length;
    const totalCarat = diamonds.reduce((sum, d) => sum + (parseFloat(d.Carats) || 0), 0);
    const totalAmount = diamonds.reduce((sum, d) => sum + (parseFloat(d['Amount$']) || 0), 0);
    const avgPricePerCarat = totalCarat > 0 ? (totalAmount / totalCarat) : 0;

    // Structured Summary Data
    const summaryData = [
        { label: "Total Diamonds", value: totalDiamonds },
        { label: "Total Carat", value: totalCarat.toFixed(2) },
        { label: "Avg Price/Ct", value: `$${avgPricePerCarat.toFixed(2)}` },
        { label: "Total Amount", value: `$${totalAmount.toFixed(2)}` }
    ];

    // Define Columns
    const columns = [
        { header: "Stock ID", key: "StockID", width: 15 },
        { header: "Shape", key: "Shape", width: 12 },
        { header: "Carat", key: "Carats", width: 8 },
        { header: "Color", key: "Color", width: 8 },
        { header: "Clarity", key: "Clarity", width: 10 },
        { header: "Cut", key: "Cut", width: 8 },
        { header: "Pol", key: "Polish", width: 8 },
        { header: "Sym", key: "Sym", width: 8 },
        { header: "Fluor", key: "Flour", width: 10 },
        { header: "Lab", key: "Lab", width: 8 },
        { header: "Price ($)", key: "Price", width: 12 },
        { header: "Report No", key: "ReportNo", width: 15 },
        { header: "Loc", key: "Location", width: 10 },
        { header: "Meas", key: "Measurement", width: 18 },
        { header: "Table %", key: "Table", width: 10 },
        { header: "Depth %", key: "Depth", width: 10 },
        { header: "Status", key: "Status", width: 12 },
        { header: "GIA Link", key: "GIALink", width: 30 },
        { header: "Video", key: "VideoLink", width: 30 }
    ];

    // Map Data
    const formattedData = diamonds.map(d => ({
        StockID: d.StockID || '',
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
        GIALink: d.GIALINK || (d['Report No'] ? `https://www.gia.edu/report-check?reportno=${d['Report No']}` : ''),
        VideoLink: d.videoLink || ''
    }));

    generateStyledExcel(formattedData, columns, summaryData, fileName);
};

export const exportOrdersToExcel = (orders, fileName = "Order_History.xlsx") => {
    // 1. Calculate Summary
    const totalOrders = orders.length;
    const totalCarat = orders.reduce((sum, o) => sum + (parseFloat(o.diamondId?.Carats) || 0), 0);
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || o.diamondId?.['Amount$'] || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalDue = orders.reduce((sum, o) => {
        const t = o.totalAmount || o.diamondId?.['Amount$'] || 0;
        const p = o.paidAmount || 0;
        const d = o.discount || 0;
        return o.status === 'confirmed' ? sum + (t - p - d) : sum;
    }, 0);

    const avgPricePerCarat = totalCarat > 0 ? (totalAmount / totalCarat) : 0;

    // Structured Summary Data
    const summaryData = [
        { label: "Total Orders", value: totalOrders },
        { label: "Total Carat", value: totalCarat.toFixed(2) },
        { label: "Avg Price/Ct", value: `$${avgPricePerCarat.toFixed(2)}` },
        { label: "Total Amount", value: `$${totalAmount.toFixed(2)}` },
        { label: "Total Paid", value: `$${totalPaid.toFixed(2)}` },
        { label: "Total Due", value: `$${totalDue.toFixed(2)}` }
    ];

    // Define Columns
    const columns = [
        { header: "Date", key: "Date", width: 12 },
        { header: "Order ID", key: "OrderID", width: 20 },
        { header: "Stock ID", key: "StockID", width: 15 },
        { header: "Status", key: "Status", width: 12 },
        { header: "Shape", key: "Shape", width: 10 },
        { header: "Carat", key: "Carats", width: 8 },
        { header: "Color", key: "Color", width: 8 },
        { header: "Clarity", key: "Clarity", width: 10 },
        { header: "Total ($)", key: "Total", width: 12 },
        { header: "Paid ($)", key: "Paid", width: 12 },
        { header: "Due ($)", key: "Due", width: 12 },
        { header: "Report No", key: "ReportNo", width: 15 },
        { header: "Lab", key: "Lab", width: 8 },
        { header: "Payment", key: "Payment", width: 12 },
        { header: "Sold Date", key: "SoldDate", width: 12 }
    ];

    // Map Data
    const formattedData = orders.map(order => {
        const diamond = order.diamondId || {};
        const total = order.totalAmount || diamond['Amount$'] || 0;
        const paid = order.paidAmount || 0;
        const discount = order.discount || 0;
        const due = order.status === 'confirmed' ? (total - paid - discount) : 0;

        return {
            Date: new Date(order.createdAt).toLocaleDateString(),
            OrderID: order._id,
            StockID: diamond.StockID || '-',
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

    generateStyledExcel(formattedData, columns, summaryData, fileName);
};
