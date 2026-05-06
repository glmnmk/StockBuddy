import React, { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { QuoteData } from "@/lib/types";
import { GlossaryTooltip } from "./glossary-tooltip";

interface PDFExportProps {
  stock: QuoteData;
  fairValue: number;
  growthRate: number;
  terminalGrowthRate: number;
  discountRate: number;
}

export const PDFExport: React.FC<PDFExportProps> = ({
  stock,
  fairValue,
  growthRate,
  terminalGrowthRate,
  discountRate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Create a hidden div with the report content
      const reportElement = document.createElement("div");
      reportElement.style.position = "absolute";
      reportElement.style.left = "-9999px";
      reportElement.style.width = "210mm"; // A4 width
      reportElement.style.backgroundColor = "white";
      reportElement.style.color = "black";
      reportElement.style.fontFamily = "Arial, sans-serif";
      
      const priceDiff = stock.price - fairValue;
      const priceDiffPercent = ((priceDiff / fairValue) * 100).toFixed(1);
      const isUndervalued = priceDiff < 0;
      
      const peRatio = stock.peRatio ?? 0;
      const beta = stock.beta ?? 1;
      const debtEquityRatio = stock.debtToEquity ?? 0;
      const marketCapB = ((stock.marketCap ?? 0) / 1e9).toFixed(1);
      const profitMarginPct = ((stock.profitMargin ?? 0) * 100).toFixed(1);
      const isProfitable = (stock.netIncome ?? 0) > 0;
      
      reportElement.innerHTML = `
        <div style="padding: 40px; line-height: 1.6;">
          <!-- Header with gradient background -->
          <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; margin: -40px -40px 30px -40px; text-align: center; border-radius: 0 0 20px 20px;">
            <h1 style="font-size: 32px; margin: 0; font-weight: bold;">StockBuddy Analysis Report</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0; opacity: 0.9;">Professional Investment Analysis</p>
          </div>
          
          <!-- Company Overview -->
          <div style="background: #f8fafc; padding: 25px; border-radius: 15px; margin-bottom: 25px; border-left: 5px solid #3b82f6;">
            <h2 style="color: #1e40af; font-size: 24px; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${stock.name} (${stock.ticker})</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 15px 0;">${stock.sector ?? ''} · ${stock.industry ?? ''}</p>
            <p style="color: #64748b; font-size: 14px; margin: 15px 0;">${(stock.description ?? '').slice(0, 300)}${(stock.description ?? '').length > 300 ? '...' : ''}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
              <div>
                <strong style="color: #374151;">Current Price:</strong>
                <div style="font-size: 28px; color: #059669; font-weight: bold; margin: 5px 0;">$${stock.price.toFixed(2)}</div>
              </div>
              <div>
                <strong style="color: #374151;">Fair Value (DCF):</strong>
                <div style="font-size: 28px; color: ${isUndervalued ? '#059669' : '#dc2626'}; font-weight: bold; margin: 5px 0;">$${fairValue.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <!-- Investment Summary -->
          <div style="background: ${isUndervalued ? '#ecfdf5' : '#fef2f2'}; padding: 25px; border-radius: 15px; margin-bottom: 25px; border: 2px solid ${isUndervalued ? '#a7f3d0' : '#fecaca'};">
            <h3 style="color: ${isUndervalued ? '#065f46' : '#991b1b'}; font-size: 20px; margin-top: 0;">
              📊 Investment Recommendation
            </h3>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="background: ${isUndervalued ? '#059669' : '#dc2626'}; color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 16px;">
                ${isUndervalued ? 'UNDERVALUED' : 'OVERVALUED'}
              </div>
              <div style="font-size: 18px; color: #374151;">
                ${Math.abs(parseFloat(priceDiffPercent))}% ${isUndervalued ? 'below' : 'above'} fair value
              </div>
            </div>
            <p style="margin-top: 15px; color: #6b7280; font-style: italic;">
              ${isUndervalued 
                ? 'The stock appears to be trading below its intrinsic value, presenting a potential buying opportunity.' 
                : 'The stock appears to be trading above its intrinsic value, suggesting caution for new investors.'}
            </p>
          </div>

          <!-- Financial Snapshot -->
          <div style="background: white; padding: 25px; border-radius: 15px; margin-bottom: 25px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h3 style="color: #1f2937; font-size: 20px; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              📈 Key Financial Metrics
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Market Cap</div>
                <div style="font-size: 18px; font-weight: bold; color: #1f2937;">$${marketCapB}B</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">P/E Ratio</div>
                <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${peRatio.toFixed(1)}</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Beta</div>
                <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${beta.toFixed(2)}</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Profit Margin</div>
                <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${profitMarginPct}%</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Debt/Equity</div>
                <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${debtEquityRatio.toFixed(1)}%</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f9fafb; border-radius: 10px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">52W Range</div>
                <div style="font-size: 14px; font-weight: bold; color: #1f2937;">$${(stock.fiftyTwoWeekLow ?? 0).toFixed(0)} - $${(stock.fiftyTwoWeekHigh ?? 0).toFixed(0)}</div>
              </div>
            </div>
          </div>

          <!-- DCF Analysis -->
          <div style="background: #fefbef; padding: 25px; border-radius: 15px; margin-bottom: 25px; border-left: 5px solid #f59e0b;">
            <h3 style="color: #92400e; font-size: 20px; margin-top: 0;">🧮 DCF Valuation Analysis</h3>
            <p style="color: #78716c; margin-bottom: 20px;">
              This analysis uses the Discounted Cash Flow model to estimate the company's intrinsic value based on its ability to generate future cash flows.
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <h4 style="color: #92400e; margin-bottom: 10px;">Model Assumptions:</h4>
                <ul style="color: #6b7280; list-style: none; padding: 0;">
                  <li style="margin-bottom: 8px;">• Growth Rate: <strong>${(growthRate * 100).toFixed(1)}%</strong></li>
                  <li style="margin-bottom: 8px;">• Terminal Growth: <strong>${(terminalGrowthRate * 100).toFixed(1)}%</strong></li>
                  <li style="margin-bottom: 8px;">• Discount Rate: <strong>${(discountRate * 100).toFixed(1)}%</strong></li>
                </ul>
              </div>
              <div>
                <h4 style="color: #92400e; margin-bottom: 10px;">Valuation Result:</h4>
                <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #fbbf24;">
                  <div style="font-size: 24px; font-weight: bold; color: #92400e;">$${fairValue.toFixed(2)}</div>
                  <div style="font-size: 14px; color: #6b7280;">Per Share Fair Value</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Risk Assessment -->
          <div style="background: #fef2f2; padding: 25px; border-radius: 15px; margin-bottom: 25px; border-left: 5px solid #ef4444;">
            <h3 style="color: #991b1b; font-size: 20px; margin-top: 0;">⚠️ Risk Assessment</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
              <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Beta Risk</div>
                <div style="font-size: 16px; font-weight: bold; color: ${beta > 1.5 ? '#dc2626' : beta > 1 ? '#f59e0b' : '#059669'};">
                  ${beta.toFixed(2)}
                </div>
                <div style="font-size: 12px; color: #9ca3af;">
                  ${beta > 1.5 ? 'High Risk' : beta > 1 ? 'Moderate' : 'Low Risk'}
                </div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Debt Level</div>
                <div style="font-size: 16px; font-weight: bold; color: ${debtEquityRatio > 100 ? '#dc2626' : debtEquityRatio > 50 ? '#f59e0b' : '#059669'};">
                  ${debtEquityRatio.toFixed(1)}%
                </div>
                <div style="font-size: 12px; color: #9ca3af;">Debt/Equity</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Profitability</div>
                <div style="font-size: 16px; font-weight: bold; color: ${isProfitable ? '#059669' : '#dc2626'};">
                  ${isProfitable ? 'Positive' : 'Negative'}
                </div>
                <div style="font-size: 12px; color: #9ca3af;">Net Income</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 20px; border-radius: 15px; margin-top: 30px; text-align: center; border-top: 3px solid #3b82f6;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              <strong>Disclaimer:</strong> This analysis is for educational purposes only and should not be considered as financial advice. 
              Please consult with a qualified financial advisor before making investment decisions.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
              Generated by StockBuddy • ${new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      `;

      document.body.appendChild(reportElement);

      // Generate canvas from the element
      const canvas = await html2canvas(reportElement, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "white",
        logging: false,
        width: 210 * 3.78, // A4 width in pixels at higher DPI
        height: 297 * 3.78, // A4 height in pixels at higher DPI
        scrollX: 0,
        scrollY: 0,
      });

      // Remove the temporary element
      document.body.removeChild(reportElement);

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        const position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`${stock.name.replace(/\s+/g, '_')}_StockBuddy_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("PDF report generated successfully!", {
        description: "Your stock analysis report has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report", {
        description: "Please try again or contact support if the issue persists.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          📄 Export PDF Report
          <GlossaryTooltip 
            term="Professional Stock Analysis Report"
            definition="A comprehensive PDF report containing detailed stock analysis, valuation metrics, risk assessment, and investment recommendations in a professionally designed format."
            category="general"
          />
        </CardTitle>
        <CardDescription>
          Generate a professionally designed analysis report with all key metrics, 
          valuation insights, and investment recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Report includes:</span>
          </div>
          <div></div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Investment Summary</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">DCF Analysis</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Risk Assessment</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Key Metrics</Badge>
          </div>
        </div>
        
        <Button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Export PDF Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};