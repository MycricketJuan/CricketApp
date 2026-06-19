import type Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput, AgentContext, ModuleType } from '@cricket/core/types'
import type { ClaudeConfig } from './consultation/index'
import { getSectorPrompts, getSectorTransactionsConfig } from '@cricket/sectors/registry'

export class AgentRegistry {
  constructor(
    private client: Anthropic,
    private config: ClaudeConfig,
    private supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    private supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  ) {}

  async run(stage: ModuleType, message: string, context: AgentContext): Promise<AgentOutput> {
    const input: AgentInput = { message, context }
    const sector = context.sectorExtension ?? null
    const sectorPrompts = sector ? getSectorPrompts(sector) : null
    const sectorTransactionsConfig = sector ? getSectorTransactionsConfig(sector) : null

    switch (stage) {
      case 'consultation': {
        const { ConsultationAgent } = await import('./consultation/index')
        return new ConsultationAgent(
          this.client,
          this.config,
          sectorPrompts?.consultation ?? null,
          this.supabaseUrl,
          this.supabaseKey,
        ).run(input, context)
      }
      case 'sales': {
        const { SalesAgent } = await import('./sales/index')
        return new SalesAgent(
          this.client,
          context.tenantId,
          this.supabaseUrl,
          this.supabaseKey,
          sectorPrompts?.sales ?? null,
        ).run(input)
      }
      case 'transactions': {
        const { TransactionsAgent } = await import('./transactions/index')
        return new TransactionsAgent(
          this.client,
          context.tenantId,
          this.supabaseUrl,
          this.supabaseKey,
          sectorPrompts?.transactions ?? null,
          sectorTransactionsConfig,
        ).run(input)
      }
      case 'feedback': {
        const { FeedbackAgent } = await import('./feedback/index')
        return new FeedbackAgent(
          this.client,
          context.tenantId,
          context.sessionId,
          context.currentStage,
          this.supabaseUrl,
          this.supabaseKey,
          sectorPrompts?.feedback ?? null,
        ).run(input)
      }
    }
  }
}
