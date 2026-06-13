const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');

async function test() {
    try {
        const fileData = fs.readFileSync("c:\\Users\\PC\\Downloads\\StatisticBUH\\multuk.xls");
        const tempWb = XLSX.read(fileData, { type: 'buffer' });
        // type 'array' returns Uint8Array in browser, but let's test ArrayBuffer
        const finalTemplateData = XLSX.write(tempWb, { type: 'array', bookType: 'xlsx' });
        
        console.log("XLSX write output type:", finalTemplateData.constructor.name);
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(finalTemplateData.buffer ? finalTemplateData.buffer : finalTemplateData); 
        console.log("Loaded into ExcelJS successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
