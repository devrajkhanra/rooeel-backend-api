import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String, { name: 'healthCheck', description: 'Basic health check for the GraphQL API' })
  healthCheck(): string {
    return 'GraphQL API is active and running!';
  }
}
