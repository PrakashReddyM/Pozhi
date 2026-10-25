// ==========================================
// WHATSAPP SERVICE - MOCK/MANUAL MODE
// ==========================================

import { logger } from '../utils/logger';

/**
 * MOCK WHATSAPP SERVICE
 * Decommissioned automated bot to avoid QR code maintenance issues.
 * Communication is now handled via manual "One-Click" buttons in the Admin Portal.
 */
class WhatsAppService {
  async sendMessage({ to, message }: { to: string; message: string }) {
    logger.info('📱 [WHATSAPP MOCK] Message captured (Not Sent Automatically):', { to, message });
    return true;
  }

  async sendOrderConfirmation(to: string, orderNumber: string, customerName: string) {
    const message = `Hi ${customerName}, this is Pozhi Studio. We've received your order #${orderNumber}! We'll start working on it soon. 🙏`;
    return this.sendMessage({ to, message });
  }

  async notifyAdmin(orderNumber: string, customerName: string, amount: number) {
    const message = `🚨 NEW ORDER: #${orderNumber} by ${customerName} (₹${amount})`;
    return this.sendMessage({ to: 'admin', message });
  }
}

export const whatsappService = new WhatsAppService();