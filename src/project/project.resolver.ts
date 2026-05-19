// src/project/project.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ProjectService } from './services/project.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UseGuards } from '@nestjs/common';
import { JwtGqlAuthGuard } from '../auth/guards/jwt-gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; // You will need a custom decorator

@Resolver(() => Project)
@UseGuards(JwtGqlAuthGuard)
export class ProjectResolver {
    constructor(private readonly projectService: ProjectService) { }

    @Mutation(() => Project)
    createProject(
        @Args('createProjectInput') createProjectInput: CreateProjectInput,
        @CurrentUser() user: any // Extract from GQL context
    ) {
        return this.projectService.create(createProjectInput, user.id);
    }

    @Query(() => [Project], { name: 'projects' })
    findAll() {
        return this.projectService.findAll();
    }
}