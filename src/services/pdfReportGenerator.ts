import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ComplianceResult } from './types';
import { FormattedData } from './formatConverter';

// Add augmentation for jsPDF to include autoTable method added by jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

/**
 * Service to generate PDF reports from compliance check results
 */
export class PdfReportGenerator {
  /**
   * Generate a PDF report from compliance check results
   * @param results Array of compliance results
   * @param formattedData Formatted data used for the check
   * @returns Promise that resolves when the PDF is generated and downloaded
   */
  generateReport(results: ComplianceResult[], formattedData: FormattedData | null): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // Validation checks
        if (!results || !Array.isArray(results)) {
          throw new Error('Invalid results data: Results must be an array');
        }

        // Create a new PDF document
        const doc = new jsPDF();
        
        // Try to generate a full report, but if it fails, fall back to a simpler report
        try {
          this.generateFullReport(doc, results, formattedData);
        } catch (error) {
          console.error('Error generating full PDF report, falling back to simple report:', error);
          // Clear document and try simple version
          doc.deletePage(1);
          doc.addPage();
          this.generateSimpleReportContent(doc, results, formattedData);
        }
        
        try {
          // Save the PDF
          const filename = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(filename);
          
          // Check if parcel is fully compliant and has formatted data to generate a shipping form
          if (formattedData && this.isFullyCompliant(results)) {
            // Generate a shipping form for compliant parcels
            console.log('Parcel is fully compliant. Generating shipping form...');
            this.generateShippingForm(formattedData)
              .then(() => resolve())
              .catch(formError => {
                console.error('Error generating shipping form:', formError);
                resolve(); // Still resolve the main promise
              });
          } else {
            resolve();
          }
        } catch (saveError) {
          console.error('Error saving PDF:', saveError);
          reject(saveError);
        }
      } catch (error) {
        console.error('Error generating PDF report:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate a full-featured PDF report
   * @param doc jsPDF document instance
   * @param results Compliance results
   * @param formattedData Formatted data
   */
  private generateFullReport(doc: jsPDF, results: ComplianceResult[], formattedData: FormattedData | null): void {
    // Add professional header with background
    doc.setFillColor(33, 80, 119); // Dark blue header
    doc.rect(0, 0, 210, 40, 'F');
    
    // Add title with better styling
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Check Report', 14, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    // Add compliant/non-compliant badge
    const isCompliant = this.isFullyCompliant(results);
    if (isCompliant) {
      doc.setFillColor(40, 167, 69); // Green for compliant
    } else {
      doc.setFillColor(220, 53, 69); // Red for non-compliant
    }
    doc.roundedRect(150, 10, 45, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT', 172.5, 23, { align: 'center' });
    
    // Add compliance statistics
    const stats = this.calculateComplianceStats(results);
    
    // Add colorful stat boxes
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.5);
    
    // Statistics row
    const statY = 50;
    const boxHeight = 40;
    const boxMargin = 5;
    const boxWidth = 45;
    
    // Total box
    doc.setFillColor(73, 80, 87); // Dark gray
    doc.roundedRect(14, statY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stats.total.toString(), 14 + (boxWidth / 2), statY + 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL FIELDS', 14 + (boxWidth / 2), statY + 33, { align: 'center' });
    
    // Compliant box
    doc.setFillColor(40, 167, 69); // Green
    doc.roundedRect(14 + boxWidth + boxMargin, statY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stats.compliant.toString(), 14 + boxWidth + boxMargin + (boxWidth / 2), statY + 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPLIANT', 14 + boxWidth + boxMargin + (boxWidth / 2), statY + 33, { align: 'center' });
    
    // Warning box
    doc.setFillColor(255, 193, 7); // Yellow
    doc.roundedRect(14 + (boxWidth + boxMargin) * 2, statY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stats.warnings.toString(), 14 + (boxWidth + boxMargin) * 2 + (boxWidth / 2), statY + 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('WARNINGS', 14 + (boxWidth + boxMargin) * 2 + (boxWidth / 2), statY + 33, { align: 'center' });
    
    // Non-compliant box
    doc.setFillColor(220, 53, 69); // Red
    doc.roundedRect(14 + (boxWidth + boxMargin) * 3, statY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stats.nonCompliant.toString(), 14 + (boxWidth + boxMargin) * 3 + (boxWidth / 2), statY + 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('NON-COMPLIANT', 14 + (boxWidth + boxMargin) * 3 + (boxWidth / 2), statY + 33, { align: 'center' });
    
    // Add compliance rate gauge
    this.drawComplianceGauge(doc, stats.complianceRate, 14, statY + boxHeight + 15);
    
    // Add shipment information
    if (formattedData && formattedData.fields && Object.keys(formattedData.fields).length > 0) {
      const shipmentInfoY = statY + boxHeight + 40;
      doc.setTextColor(33, 80, 119);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Shipment Information', 14, shipmentInfoY);
      
      // Add light blue header bar
      doc.setFillColor(232, 244, 248);
      doc.rect(14, shipmentInfoY + 5, 182, 8, 'F');
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('FIELD', 20, shipmentInfoY + 11);
      doc.text('VALUE', 105, shipmentInfoY + 11);
      
      // Prepare shipment table data in a more organized way
      const priorityFields = [
        'trackingNumber', 'shipmentDate', 'shippingService', 'packageType',
        'shipperName', 'shipperAddress', 'recipientName', 'recipientAddress',
        'weight', 'dimensions', 'packageContents', 'declaredValue'
      ];
      
      const shipmentTable: any[][] = [];
      
      // First add priority fields
      priorityFields.forEach(fieldKey => {
        if (formattedData?.fields[fieldKey]) {
          shipmentTable.push([
            this.formatFieldName(fieldKey),
            String(formattedData.fields[fieldKey] || '')
          ]);
        }
      });
      
      // Then add any other fields
      Object.entries(formattedData.fields)
        .filter(([key]) => !priorityFields.includes(key))
        .forEach(([key, value]) => {
          shipmentTable.push([this.formatFieldName(key), String(value || '')]);
        });
      
      try {
        doc.autoTable({
          startY: shipmentInfoY + 15,
          head: [], // No header as we already manually added it
          body: shipmentTable,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { 
              cellWidth: 50,
              fontStyle: 'bold',
              textColor: [70, 70, 70]
            },
            1: { 
              cellWidth: 'auto',
              textColor: [50, 50, 50]
            }
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          didDrawCell: (data: {
            cell: { x: number; y: number; width: number; height: number };
            section: string;
          }) => {
            // Add light gray bottom border to each cell
            if (data.section === 'body') {
              doc.setDrawColor(220, 220, 220);
              doc.setLineWidth(0.1);
              doc.line(
                data.cell.x, 
                data.cell.y + data.cell.height, 
                data.cell.x + data.cell.width, 
                data.cell.y + data.cell.height
              );
            }
          }
        });
      } catch (tableError) {
        console.error('Error generating shipment table:', tableError);
        // Continue without the table rather than failing completely
      }
    }
    
    // Add compliance issues (non-compliant and warnings)
    const nonCompliantResults = results.filter(r => r.status === 'non-compliant');
    const warningResults = results.filter(r => r.status === 'warning');
    
    if (nonCompliantResults.length > 0) {
      doc.addPage();
      
      // Add header
      doc.setFillColor(220, 53, 69); // Red header for non-compliant
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Non-Compliant Issues', 105, 17, { align: 'center' });
      
      const nonCompliantTable: any[][] = nonCompliantResults.map(result => [
        String(result.field || ''),
        String(result.value || 'Missing'),
        String(result.message || '')
      ]);
      
      try {
        // Add light red header bar
        doc.setFillColor(248, 215, 218);
        doc.rect(14, 30, 182, 8, 'F');
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FIELD', 20, 36);
        doc.text('VALUE', 70, 36);
        doc.text('MESSAGE', 120, 36);
        
        // jspdf-autotable adds this method to jsPDF prototype
        doc.autoTable({
          startY: 40,
          head: [], // No header, we added it manually above
          body: nonCompliantTable,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          columnStyles: {
            0: { 
              cellWidth: 40,
              fontStyle: 'bold',
              textColor: [70, 70, 70]
            },
            1: { 
              cellWidth: 40,
              textColor: [50, 50, 50]
            },
            2: {
              cellWidth: 'auto',
              textColor: [220, 53, 69]
            }
          },
          alternateRowStyles: {
            fillColor: [248, 240, 240]
          },
          didDrawCell: (data: {
            cell: { x: number; y: number; width: number; height: number; raw: any };
            section: string;
            column: { index: number };
            row: { index: number };
          }) => {
            // Add a red bullet point icon for each non-compliant item
            if (data.section === 'body' && data.column.index === 0 && data.row.index >= 0) {
              doc.setFillColor(220, 53, 69);
              doc.circle(data.cell.x + 3, data.cell.y + data.cell.height/2, 1.5, 'F');
            }
          }
        });
      } catch (tableError) {
        console.error('Error generating non-compliant table:', tableError);
        // Continue without the table rather than failing completely
      }
    }
    
    if (warningResults.length > 0) {
      try {
        const currY = doc.lastAutoTable?.finalY || 40;
        const needsNewPage = currY > 200 || nonCompliantResults.length > 0;
        
        if (needsNewPage) {
          doc.addPage();
          
          // Add header
          doc.setFillColor(255, 193, 7); // Yellow header for warnings
          doc.rect(0, 0, 210, 25, 'F');
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Warnings', 105, 17, { align: 'center' });
          
          var startY = 40;
          
          // Add light yellow header bar
          doc.setFillColor(255, 243, 205);
          doc.rect(14, 30, 182, 8, 'F');
          
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('FIELD', 20, 36);
          doc.text('VALUE', 70, 36);
          doc.text('MESSAGE', 120, 36);
        } else {
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Warnings', 14, currY + 15);
          
          // Add light yellow header bar
          doc.setFillColor(255, 243, 205);
          doc.rect(14, currY + 20, 182, 8, 'F');
          
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('FIELD', 20, currY + 26);
          doc.text('VALUE', 70, currY + 26);
          doc.text('MESSAGE', 120, currY + 26);
          
          var startY = currY + 30;
        }
        
        const warningTable: any[][] = warningResults.map(result => [
          String(result.field || ''),
          String(result.value || 'Missing'),
          String(result.message || '')
        ]);
        
        // jspdf-autotable adds this method to jsPDF prototype
        doc.autoTable({
          startY,
          head: [], // No header, we added it manually above
          body: warningTable,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          columnStyles: {
            0: { 
              cellWidth: 40,
              fontStyle: 'bold',
              textColor: [70, 70, 70]
            },
            1: { 
              cellWidth: 40,
              textColor: [50, 50, 50]
            },
            2: {
              cellWidth: 'auto',
              textColor: [175, 125, 0]
            }
          },
          alternateRowStyles: {
            fillColor: [255, 250, 235]
          },
          didDrawCell: (data: {
            cell: { x: number; y: number; width: number; height: number; raw: any };
            section: string;
            column: { index: number };
            row: { index: number };
          }) => {
            // Add a yellow triangle warning icon for each warning item
            if (data.section === 'body' && data.column.index === 0 && data.row.index >= 0) {
              doc.setFillColor(255, 193, 7);
              const x = data.cell.x + 3;
              const y = data.cell.y + data.cell.height/2;
              doc.triangle(x, y - 1.5, x + 1.5, y + 1.5, x - 1.5, y + 1.5, 'F');
            }
          }
        });
      } catch (tableError) {
        console.error('Error generating warnings table:', tableError);
        // Continue without the table rather than failing completely
      }
    }
    
    // Add compliant fields section with a cleaner presentation
    const compliantResults = results.filter(r => r.status === 'compliant');
    
    if (compliantResults.length > 0) {
      try {
        const currY = doc.lastAutoTable?.finalY || 40;
        const needsNewPage = currY > 200;
        
        if (needsNewPage) {
          doc.addPage();
          
          // Add header
          doc.setFillColor(40, 167, 69); // Green header for compliant fields
          doc.rect(0, 0, 210, 25, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Compliant Fields', 105, 17, { align: 'center' });
          
          var startY = 40;
          
          // Add light green header bar
          doc.setFillColor(209, 231, 221);
          doc.rect(14, 30, 182, 8, 'F');
          
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('FIELD', 20, 36);
          doc.text('VALUE', 110, 36);
        } else {
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Compliant Fields', 14, currY + 15);
          
          // Add light green header bar
          doc.setFillColor(209, 231, 221);
          doc.rect(14, currY + 20, 182, 8, 'F');
          
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('FIELD', 20, currY + 26);
          doc.text('VALUE', 110, currY + 26);
          
          var startY = currY + 30;
        }
        
        // Group compliant fields by category (e.g., shipper, recipient, package)
        const fieldsWithCategories = compliantResults.map(result => {
          let category = 'Other';
          
          if (result.field?.toLowerCase().includes('shipper') || result.field?.toLowerCase().includes('sender')) {
            category = 'Shipper Information';
          } else if (result.field?.toLowerCase().includes('recipient') || result.field?.toLowerCase().includes('receiver')) {
            category = 'Recipient Information';
          } else if (result.field?.toLowerCase().includes('package') || 
                    result.field?.toLowerCase().includes('weight') || 
                    result.field?.toLowerCase().includes('dimension')) {
            category = 'Package Details';
          } else if (result.field?.toLowerCase().includes('customs') || 
                    result.field?.toLowerCase().includes('international')) {
            category = 'Customs Information';
          } else if (result.field?.toLowerCase().includes('tracking') || 
                    result.field?.toLowerCase().includes('service') || 
                    result.field?.toLowerCase().includes('carrier')) {
            category = 'Shipping Information';
          }
          
          return {
            ...result,
            category
          };
        });
        
        // Convert to table format grouped by category
        const compliantTable: any[][] = [];
        
        const compliantCategories = [
          'Shipping Information',
          'Shipper Information',
          'Recipient Information',
          'Package Details',
          'Customs Information',
          'Other'
        ];
        
        compliantCategories.forEach(category => {
          const categoryResults = fieldsWithCategories.filter(r => r.category === category);
          
          if (categoryResults.length > 0) {
            // Add category header
            compliantTable.push([{ content: category, colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
            
            // Add fields
            categoryResults.forEach(result => {
              compliantTable.push([
                String(result.field || ''),
                String(result.value || '')
              ]);
            });
          }
        });
        
        // jspdf-autotable adds this method to jsPDF prototype
        doc.autoTable({
          startY,
          head: [], // No header, we added it manually above
          body: compliantTable,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          columnStyles: {
            0: { 
              cellWidth: 80,
              fontStyle: 'bold',
              textColor: [70, 70, 70]
            },
            1: { 
              cellWidth: 'auto',
              textColor: [50, 50, 50]
            }
          },
          alternateRowStyles: {
            fillColor: [240, 248, 244]
          },
          didDrawCell: (data: {
            cell: { x: number; y: number; width: number; height: number; raw: any };
            section: string;
            column: { index: number };
            row: { index: number };
          }) => {
            // Add a green checkmark for each compliant item
            if (data.section === 'body' && data.column.index === 0 && data.row.index >= 0 && !data.cell.raw.toString().includes('Information') && !data.cell.raw.toString().includes('Details') && !data.cell.raw.toString().includes('Other')) {
              doc.setFillColor(40, 167, 69);
              doc.circle(data.cell.x + 3, data.cell.y + data.cell.height/2, 1.5, 'F');
            }
          }
        });
      } catch (tableError) {
        console.error('Error generating compliant table:', tableError);
        // Continue without the table rather than failing completely
      }
    }
    
    // Add metadata footer with confidence info
    if (formattedData?.processingMetadata) {
      try {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          
          // Footer text
          const confidence = formattedData.processingMetadata.confidence || 0;
          const confidenceText = `AI Confidence: ${(confidence * 100).toFixed(0)}%`;
          const sourceText = `Source: ${formattedData.processingMetadata.source || 'Unknown'}`;
          const footerText = `${confidenceText} | ${sourceText} | Page ${i} of ${totalPages}`;
          
          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
          
          doc.text(footerText, pageWidth / 2, 285, { align: 'center' });
        }
      } catch (footerError) {
        console.error('Error adding footer:', footerError);
      }
    }
  }

  /**
   * Draw a circular gauge to visualize compliance rate
   */
  private drawComplianceGauge(doc: jsPDF, rate: number, x: number, y: number): void {
    const radius = 20;
    const centerX = x + 90;
    const centerY = y + radius + 5;
    
    // Draw gauge background
    doc.setDrawColor(210, 210, 210);
    doc.setFillColor(245, 245, 245);
    doc.circle(centerX, centerY, radius, 'FD');
    
    // Draw gauge arc based on compliance rate
    const endAngle = Math.PI * 2 * rate;
    let color = [220, 53, 69]; // Red for low compliance
    
    if (rate >= 0.9) {
      color = [40, 167, 69]; // Green for high compliance
    } else if (rate >= 0.7) {
      color = [23, 162, 184]; // Blue for medium compliance
    } else if (rate >= 0.5) {
      color = [255, 193, 7]; // Yellow for low-medium compliance
    }
    
    doc.setFillColor(color[0], color[1], color[2]);
    
    // Draw compliance arc (we have to approximate with lines for jsPDF)
    const segments = 36;
    const angleStep = (Math.PI * 2) / segments;
    
    for (let i = 0; i < segments * rate; i++) {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;
      
      const startX = centerX + Math.cos(startAngle) * radius;
      const startY = centerY + Math.sin(startAngle) * radius;
      const endX = centerX + Math.cos(endAngle) * radius;
      const endY = centerY + Math.sin(endAngle) * radius;
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.triangle(centerX, centerY, startX, startY, endX, endY, 'F');
    }
    
    // Draw center circle
    doc.setFillColor(255, 255, 255);
    doc.circle(centerX, centerY, radius * 0.7, 'F');
    
    // Add percentage text
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(rate * 100)}%`, centerX, centerY + 2, { align: 'center' });
    
    // Add label
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Compliance Rate', centerX, centerY + radius + 12, { align: 'center' });
  }
  
  /**
   * Format a field name for better readability
   */
  private formatFieldName(fieldKey: string): string {
    return fieldKey
      // Convert camelCase to spaces (e.g., 'shipperName' to 'shipper Name')
      .replace(/([A-Z])/g, ' $1')
      // Capitalize first character
      .replace(/^./, (str) => str.toUpperCase())
      // Fix certain common terms that should be capitalized
      .replace(/\bid\b/i, 'ID')
      .replace(/\bpo\b/i, 'PO')
      .replace(/\bzip\b/i, 'ZIP')
      .trim();
  }

  /**
   * Generate a simple PDF report with minimal features
   * This is a fallback for when the full report fails to generate, or can be called directly
   * @param results Compliance results
   * @param formattedData Formatted data
   * @returns Promise that resolves when the PDF is generated and downloaded
   */
  generateSimpleReport(results: ComplianceResult[], formattedData: FormattedData | null): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // Validation checks
        if (!results || !Array.isArray(results)) {
          throw new Error('Invalid results data: Results must be an array');
        }

        // Create a new PDF document
        const doc = new jsPDF();
        
        // Generate simple report content
        this.generateSimpleReportContent(doc, results, formattedData);
        
        try {
          // Save the PDF
          const filename = `compliance-report-simple-${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(filename);
          
          resolve();
        } catch (saveError) {
          console.error('Error saving PDF:', saveError);
          reject(saveError);
        }
      } catch (error) {
        console.error('Error generating simple PDF report:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Generate the content for a simple PDF report
   * @param doc jsPDF document instance
   * @param results Compliance results
   * @param formattedData Formatted data
   */
  private generateSimpleReportContent(doc: jsPDF, results: ComplianceResult[], formattedData: FormattedData | null): void {
    // Basic report with minimal formatting
    doc.setFontSize(16);
    doc.text('Compliance Check Report (Simple Format)', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    // Calculate basic stats
    const total = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const nonCompliant = results.filter(r => r.status === 'non-compliant').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    // Add simple summary
    doc.setFontSize(12);
    doc.text('Summary:', 20, 45);
    doc.setFontSize(10);
    doc.text(`Total fields checked: ${total}`, 30, 55);
    doc.text(`Compliant fields: ${compliant}`, 30, 65);
    doc.text(`Fields with warnings: ${warnings}`, 30, 75);
    doc.text(`Non-compliant fields: ${nonCompliant}`, 30, 85);
    
    // Add issues (basic format)
    let yPos = 105;
    doc.setFontSize(12);
    doc.text('Issues found:', 20, yPos);
    yPos += 15;
    
    // Only list non-compliant and warnings
    const issues = results.filter(r => r.status !== 'compliant');
    
    if (issues.length === 0) {
      doc.setFontSize(10);
      doc.text('No compliance issues found.', 30, yPos);
    } else {
      issues.forEach((issue, index) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const status = issue.status === 'non-compliant' ? 'ERROR' : 'WARNING';
        
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${status}: ${issue.field}`, 30, yPos);
        yPos += 10;
        
        if (issue.value) {
          doc.text(`   Value: ${String(issue.value).substring(0, 50)}${String(issue.value).length > 50 ? '...' : ''}`, 30, yPos);
          yPos += 10;
        }
        
        doc.text(`   ${issue.message}`, 30, yPos);
        yPos += 15;
      });
    }
  }
  
  /**
   * Calculate compliance statistics from results
   */
  private calculateComplianceStats(results: ComplianceResult[]) {
    if (!results || !results.length) {
      return { 
        compliant: 0, 
        nonCompliant: 0, 
        warnings: 0, 
        total: 0, 
        complianceRate: 0,
        confidenceScore: 0
      };
    }
    
    try {
      const total = results.length;
      const compliant = results.filter(r => r.status === 'compliant').length;
      const nonCompliant = results.filter(r => r.status === 'non-compliant').length;
      const warnings = results.filter(r => r.status === 'warning').length;
      
      // Extract confidence score if present
      let confidenceScore = 0;
      try {
        const confidenceResult = results.find(r => r.field === 'AI Confidence Score' || r.field === 'Confidence Score');
        if (confidenceResult && confidenceResult.value) {
          const valueStr = confidenceResult.value.toString();
          confidenceScore = valueStr.includes('%') 
            ? parseInt(valueStr.replace(/\D/g, '')) / 100
            : parseFloat(valueStr);
          
          // Ensure it's a valid number between 0 and 1
          if (isNaN(confidenceScore) || confidenceScore > 1) {
            confidenceScore = confidenceScore > 1 ? confidenceScore / 100 : 0;
          }
        }
      } catch (e) {
        console.error('Error parsing confidence score:', e);
        confidenceScore = 0;
      }
      
      return {
        compliant,
        nonCompliant,
        warnings,
        total,
        complianceRate: total > 0 ? compliant / total : 0,
        confidenceScore
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { 
        compliant: 0, 
        nonCompliant: 0, 
        warnings: 0, 
        total: 0, 
        complianceRate: 0,
        confidenceScore: 0
      };
    }
  }

  /**
   * Determine if a shipment is fully compliant (no warnings or non-compliant issues)
   * @param results Compliance check results
   * @returns True if fully compliant, false otherwise
   */
  isFullyCompliant(results: ComplianceResult[]): boolean {
    // Check if there are any warnings or non-compliant results
    return !results.some(result => result.status === 'warning' || result.status === 'non-compliant');
  }

  /**
   * Generate a shipping form for fully compliant parcels
   * @param formattedData Shipment data
   * @returns Promise that resolves when the PDF is generated and downloaded
   */
  generateShippingForm(formattedData: FormattedData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!formattedData || !formattedData.fields) {
          throw new Error('Invalid formatted data for shipping form');
        }

        const fields = formattedData.fields;
        
        // Create a new PDF document
        const doc = new jsPDF();
        
        // Add title and date
        doc.setFontSize(22);
        doc.setTextColor(33, 80, 119);
        doc.text('SHIPPING FORM', 105, 20, { align: 'center' });
        
        // Add company logo/name placeholder
        doc.setFontSize(16);
        doc.setTextColor(66, 66, 66);
        doc.text('LogiThon Shipping', 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Form Generated: ${new Date().toLocaleString()}`, 105, 36, { align: 'center' });
        
        // Add compliance badge
        doc.setFillColor(40, 167, 69);
        doc.roundedRect(150, 15, 40, 15, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('COMPLIANT', 170, 24, { align: 'center' });
        
        // Add header line
        doc.setDrawColor(33, 80, 119);
        doc.setLineWidth(0.5);
        doc.line(14, 42, 196, 42);
        
        // Add shipping details in organized sections
        this.addShippingFormSection(doc, formattedData);
        
        // Add barcode placeholder
        if (fields.trackingNumber) {
          doc.setFillColor(240, 240, 240);
          doc.rect(55, 225, 100, 30, 'F');
          doc.setFontSize(12);
          doc.setTextColor(33, 33, 33);
          doc.text('TRACKING: ' + fields.trackingNumber, 105, 235, { align: 'center' });
          
          // Simulate barcode
          doc.setFillColor(0, 0, 0);
          const barcodeY = 245;
          for (let i = 0; i < 40; i++) {
            const width = Math.random() * 2 + 0.5;
            const x = 60 + (i * 2.5);
            doc.rect(x, barcodeY, width, 8, 'F');
          }
        }
        
        // Add footer with terms and disclaimers
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('This shipping form confirms compliance with all relevant logistics regulations.', 105, 270, { align: 'center' });
        doc.text('For inquiries, contact compliance@logithon.com or call 1-800-LOGITHON', 105, 275, { align: 'center' });
        doc.text('© LogiThon International Shipping ' + new Date().getFullYear(), 105, 280, { align: 'center' });
        
        // Save the PDF
        const filename = `shipping-form-${fields.trackingNumber || Date.now()}.pdf`;
        doc.save(filename);
        
        resolve();
      } catch (error) {
        console.error('Error generating shipping form:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Add shipping details section to the form
   * @param doc jsPDF document instance
   * @param formattedData Formatted shipment data
   */
  private addShippingFormSection(doc: jsPDF, formattedData: FormattedData): void {
    const fields = formattedData.fields;
    
    // Create shipper and recipient address boxes
    // Shipper section
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 50, 85, 60, 2, 2, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const shipperName = fields.shipperName || '';
    const shipperAddress = fields.shipperAddress || '';
    const shipperCity = fields.shipperCity || '';
    const shipperState = fields.shipperState || '';
    const shipperZip = fields.shipperPostalCode || '';
    const shipperCountry = fields.shipperCountry || '';
    const shipperPhone = fields.shipperPhone || '';
    
    // Format shipper address
    doc.text(shipperName, 20, 68);
    this.drawMultilineText(doc, shipperAddress, 20, 76, 75);
    doc.text(`${shipperCity}${shipperCity && shipperState ? ', ' : ''}${shipperState} ${shipperZip}`, 20, 84);
    doc.text(shipperCountry, 20, 92);
    doc.text(`Phone: ${shipperPhone}`, 20, 100);
    
    // Recipient section
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(111, 50, 85, 60, 2, 2, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', 117, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const recipientName = fields.recipientName || '';
    const recipientAddress = fields.recipientAddress || '';
    const recipientCity = fields.recipientCity || '';
    const recipientState = fields.recipientState || '';
    const recipientZip = fields.recipientPostalCode || '';
    const recipientCountry = fields.recipientCountry || '';
    const recipientPhone = fields.recipientPhone || '';
    
    // Format recipient address
    doc.text(recipientName, 117, 68);
    this.drawMultilineText(doc, recipientAddress, 117, 76, 75);
    doc.text(`${recipientCity}${recipientCity && recipientState ? ', ' : ''}${recipientState} ${recipientZip}`, 117, 84);
    doc.text(recipientCountry, 117, 92);
    doc.text(`Phone: ${recipientPhone}`, 117, 100);
    
    // Shipment details section
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 120, 182, 95, 2, 2, 'F');
    doc.setTextColor(33, 80, 119);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIPMENT DETAILS', 105, 130, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    
    // Create two columns for shipment details
    const col1 = 20;
    const col2 = 110;
    let row = 145;
    
    // Format the shipment details
    this.addShippingFormDetail(doc, 'Tracking Number', fields.trackingNumber || '', col1, row);
    this.addShippingFormDetail(doc, 'Shipping Date', fields.shipmentDate || '', col2, row);
    row += 15;
    
    this.addShippingFormDetail(doc, 'Service Type', fields.shippingService || '', col1, row);
    this.addShippingFormDetail(doc, 'Package Type', fields.packageType || '', col2, row);
    row += 15;
    
    this.addShippingFormDetail(doc, 'Weight', fields.weight || '', col1, row);
    this.addShippingFormDetail(doc, 'Dimensions', fields.dimensions || '', col2, row);
    row += 15;
    
    this.addShippingFormDetail(doc, 'Declared Value', fields.declaredValue || '', col1, row);
    this.addShippingFormDetail(doc, 'Customs Info', fields.customsInfo || 'N/A', col2, row);
    row += 15;
    
    // Package contents
    doc.setFont('helvetica', 'bold');
    doc.text('Package Contents:', col1, row);
    doc.setFont('helvetica', 'normal');
    row += 7;
    
    if (fields.packageContents) {
      this.drawMultilineText(doc, fields.packageContents, col1, row, 170);
    } else {
      doc.text('N/A', col1, row);
    }
  }
  
  /**
   * Draw a shipping detail field with label and value
   */
  private addShippingFormDetail(doc: jsPDF, label: string, value: string, x: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || 'N/A', x + 35, y);
  }
  
  /**
   * Draw multi-line text with proper line breaks
   */
  private drawMultilineText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
    if (!text) return y;
    
    const lineHeight = 8;
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth && i > 0) {
        doc.text(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      doc.text(line, x, currentY);
      currentY += lineHeight;
    }
    
    return currentY;
  }
}

// Create and export a singleton instance
export const pdfReportGenerator = new PdfReportGenerator(); 