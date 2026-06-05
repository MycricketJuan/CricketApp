import type Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput, AgentContext, ModuleType } from '@cricket/core/types'
import type { ClaudeConfig } from './consultation/index'

export class AgentRegistry {
  constructor(
    private client: Anthropic,
    private config: ClaudeConfig,
  ) {}

  async run(stage: ModuleType, message: string, context: AgentContext): Promise<AgentOutput> {
    const input: AgentInput = { message, context }

    switch (stage) {
      case 'consultation': {
        const { ConsultationAgent } = await import('./consultation/index')
        return new ConsultationAgent(this.client, this.config).run(input, context)
      }
      case 'sales':
      case 'transactions':
      case 'feedback':
        // TODO: SalesAgent, TransactionsAgent, FeedbackAgent
        throw new Error(`Agent not yet implemented for stage: ${stage}`)
    }
  }
}
