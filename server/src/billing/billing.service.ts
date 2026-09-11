import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPlan(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: { plan: true },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    // Calculate current unit usage
    const unitUsage = await this.prisma.unit.count({
      where: { property: { agencyId } },
    });

    return {
      plan: agency.plan,
      unitLimit: agency.unitLimit,
      unitUsage,
      billingStatus: agency.billingStatus,
      currentPeriodEnd: agency.currentPeriodEnd,
      cancelAtPeriodEnd: agency.cancelAtPeriodEnd,
    };
  }

  async getAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { priceQar: 'asc' },
    });
  }

  async createCheckoutSession(agencyId: string, dto: { planId: string; gateway: string }) {
    // In a real implementation, this would call the payment gateway API
    // (e.g., Fatora or Dibsy) to create a hosted checkout session.
    // For now, we return a mock redirect URL.
    return {
      url: `https://checkout.${dto.gateway}.com/pay/${agencyId}?plan=${dto.planId}`,
      sessionId: `sess_${Date.now()}`,
    };
  }

  async changePlan(agencyId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    
    return this.prisma.agency.update({
      where: { id: agencyId },
      data: { planId: plan.id, unitLimit: plan.unitLimit },
    });
  }

  async handleWebhook(gateway: string, payload: any, signature?: string) {
    // 1. Verify gateway signature
    if (process.env.NODE_ENV === 'production' && !signature) {
      this.logger.warn(`Webhook rejected: Missing signature from ${gateway}`);
      throw new BadRequestException('Missing webhook signature');
    }
    
    // Placeholder: Validate signature using `crypto` against gateway secret
    // const isValid = crypto.timingSafeEqual(expectedSig, actualSig)

    // 2. Webhook Idempotency Check
    // Prevent processing the same webhook event twice
    const eventId = payload.id || payload.eventId;
    if (eventId) {
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { gatewayRef: eventId },
      });
      if (existingInvoice) {
        this.logger.log(`Webhook Idempotency: Event ${eventId} already processed.`);
        return { status: 'already_processed' };
      }
    }

    // 3. Extract agencyId, planId, amount, status
    // 4. Update/create Invoice
    // 5. If PAID, extend currentPeriodEnd and set billingStatus to ACTIVE
    return { status: 'received' };
  }

  async cancelSubscription(agencyId: string) {
    return this.prisma.agency.update({
      where: { id: agencyId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async getInvoices(agencyId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { agencyId },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: { agencyId } }),
    ]);

    return { data, total, page, limit };
  }

  async getPaymentMethods(agencyId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
