import type Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput, AgentContext, ModuleType } from '@cricket/core/types'
import type { ClaudeConfig } from './consultation/index'

export class AgentRegistry {
  constructor(
    private client: Anthropic,
    private config: ClaudeConfig,
    private supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    private supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  ) {}

  async run(stage: ModuleType, message: string, context: AgentContext): Promise<AgentOutput> {
    const input: AgentInput = { message, context }

    switch (stage) {
      case 'consultation': {
        const { ConsultationAgent } = await import('./consultation/index')
        return new ConsultationAgent(this.client, this.config).run(input, context)
      }
      case 'sales': {
        const { SalesAgent } = await import('./sales/index')
        return new SalesAgent(
          this.client,
          context.tenantId,
          this.supabaseUrl,
          this.supabaseKey,
        ).run(input)
      }
      case 'transactions':
      case 'feedback':
        throw new Error(`Agent not yet implemented for stage: ${stage}`)
    }
  }
}
