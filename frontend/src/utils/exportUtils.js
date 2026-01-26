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
    const logoBuffer = await fetchImage(logo);

    worksheet.mergeCells(1, 1, 2, totalCols);

    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = "SURNIVAS DIAMOND";
    titleCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FF000000' } }; // Black
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White

    worksheet.getRow(1).height = 40;
    worksheet.getRow(2).height = 40;

    if (logoBuffer) {
        const imageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
        });

        worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.1 },
            ext: { width: 75, height: 75 }
        });
    }

    // --- ROW 3: SPACER ---
    worksheet.getRow(3).values = [];
    worksheet.getRow(3).height = 10;

    // --- ROW 4 & 5: SUMMARY TABLE (CUSTOM MERGES) ---
    // Col 1 (A): Total
    // Col 2 (B): Pcs
    // Col 3 (C): Carat
    // Col 4-6 (D,E,F): Pr/Ct (Merged 3 cols)
    // Col 7-9 (G,H,I): Amount (Merged 3 cols)

    const r4 = worksheet.getRow(4); // Headers
    const r5 = worksheet.getRow(5); // Values
    r4.height = 25;
    r5.height = 25;

    // TOTAL (A4, A5)
    const setSummaryCell = (row, col, value, isHeader) => {
        const cell = row.getCell(col);
        cell.value = value;
        cell.font = isHeader
            ? { name: 'Calibri', size: 12, bold: true }
            : { name: 'Calibri', size: 12, bold: true }; // Values also bold as per previous image
        cell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Colors
        if (value === "Total") {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Blue
        } else if (isHeader) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Blue
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } }; // Pink
            cell.font = { name: 'Calibri', size: 12 }; // Values normal weight? Image looked boldish but let's stick to standard
        }

        cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
        return cell;
    };

    // A4 (Empty Header for Total column?) -> Image had empty space
    // Let's leave A4 empty but styled? Or just skip.
    // A5 -> "Total"
    setSummaryCell(r5, 1, "Total", true);

    // PCS (B4, B5)
    setSummaryCell(r4, 2, "Pcs", true);
    setSummaryCell(r5, 2, summaryObj.pcs, false);

    // CARAT (C4, C5)
    setSummaryCell(r4, 3, "Carat", true);
    const cVal = setSummaryCell(r5, 3, summaryObj.carat, false);
    cVal.numFmt = '0.00';

    // PR/CT (Merge D4-F4, D5-F5) -> Cols 4, 5, 6
    worksheet.mergeCells(4, 4, 4, 6);
    setSummaryCell(r4, 4, "Pr/Ct", true);

    worksheet.mergeCells(5, 4, 5, 6);
    const pVal = setSummaryCell(r5, 4, summaryObj.pricePerCt, false);
    pVal.numFmt = '#,##0.00';

    // AMOUNT (Merge G4-I4, G5-I5) -> Cols 7, 8, 9
    worksheet.mergeCells(4, 7, 4, 9);
    setSummaryCell(r4, 7, "Amount", true);

    worksheet.mergeCells(5, 7, 5, 9);
    const aVal = setSummaryCell(r5, 7, summaryObj.amount, false);
    aVal.numFmt = '#,##0.00';


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

    // Final Width Adjustments - Resetting to standard since we are using merges now
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
        { header: "Carat", key: "Carats", width: 10, format: '0.00' },
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
